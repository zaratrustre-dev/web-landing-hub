alter table public.profiles
  add column if not exists terms_accepted_at timestamptz;

create or replace function public.enforce_name_age_immutable_for_users()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.name is not null and new.name is distinct from old.name then
    raise exception 'El nombre no se puede modificar después del registro' using errcode = '23514';
  end if;
  if old.age is not null and new.age is distinct from old.age then
    raise exception 'La edad no se puede modificar después del registro' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_name_age_immutable_for_users
before update on public.profiles
for each row execute function public.enforce_name_age_immutable_for_users();

comment on function public.enforce_name_age_immutable_for_users is
  'Name/Age inmutables tras el registro para usuarios normales (PDR §9,§25). El admin puede editarlos igualmente desde el panel.';
