-- Connect-it — Home/Discovery: filtros de Category, Skill y Country
-- (PDR §17, Figma "Connect-it Search & Filters"), combinables entre sí.
-- Mueve la exclusión de ya-swipeados y del propio usuario a servidor
-- (antes se resolvía en 2 queries desde el cliente en lib/discovery.ts),
-- y añade filtrado opcional por rol, skills (cualquiera de las elegidas) y
-- país exacto, más búsqueda de texto libre por nombre/profesión.

create or replace function public.fetch_discovery_candidates(
  p_role public.professional_role default null,
  p_skill_names text[] default null,
  p_country text default null,
  p_search text default null,
  p_limit integer default 20
)
returns table (
  id uuid,
  name text,
  age smallint,
  photo_url text,
  profession text,
  description text,
  portfolio_url text,
  skills text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id,
    p.name,
    p.age,
    p.photo_url,
    p.profession,
    p.description,
    p.portfolio_url,
    coalesce(array_agg(s.name) filter (where s.name is not null), array[]::text[]) as skills
  from public.profiles p
  left join public.profile_skills ps on ps.profile_id = p.id
  left join public.skills s on s.id = ps.skill_id
  where
    p.onboarding_completed = true
    and p.id <> auth.uid()
    and not exists (
      select 1 from public.likes l
      where l.from_profile = auth.uid() and l.to_profile = p.id
    )
    and (p_role is null or p.role = p_role)
    and (p_country is null or p_country = '' or p.country = p_country)
    and (
      p_search is null or p_search = ''
      or p.name ilike '%' || p_search || '%'
      or p.profession ilike '%' || p_search || '%'
    )
  group by p.id
  having (
    p_skill_names is null or array_length(p_skill_names, 1) is null
    or exists (
      select 1
      from public.profile_skills ps2
      join public.skills s2 on s2.id = ps2.skill_id
      where ps2.profile_id = p.id and s2.name = any (p_skill_names)
    )
  )
  order by random()
  limit p_limit;
end;
$$;

comment on function public.fetch_discovery_candidates is
  'Home/Discovery (PDR §17): candidatos filtrables por rol (Category), skills (cualquiera de las elegidas) y país exacto, más búsqueda de texto por nombre/profesión. Excluye al propio usuario y a los ya swipeados (antes resuelto en 2 queries desde el cliente).';

grant execute on function public.fetch_discovery_candidates(
  public.professional_role, text[], text, text, integer
) to authenticated;
