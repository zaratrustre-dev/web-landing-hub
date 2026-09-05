-- ============================================================================
-- Connect-it — Row Level Security
-- Principio: discovery es público entre usuarios autenticados; escritura solo
-- sobre los propios datos; el panel admin (is_admin()) puede todo.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.likes enable row level security;
alter table public.matches enable row level security;
alter table public.chat_messages enable row level security;
alter table public.global_chat_messages enable row level security;
alter table public.reports enable row level security;
alter table public.push_tokens enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_log enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — visibles para cualquier usuario autenticado (Discovery),
-- editables solo por su dueño (name/age quedan fuera de la app de edición,
-- PDR §25, pero no se bloquean a nivel SQL para no acoplar la regla de
-- producto a la capa de datos).
-- ---------------------------------------------------------------------------
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- user_roles — solo admins pueden leer/gestionar roles
-- ---------------------------------------------------------------------------
create policy "user_roles_admin_all"
  on public.user_roles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- skills — catálogo de lectura pública, escritura solo admin
-- ---------------------------------------------------------------------------
create policy "skills_select_authenticated"
  on public.skills for select
  to authenticated
  using (true);

create policy "skills_admin_write"
  on public.skills for insert
  to authenticated
  with check (public.is_admin());

create policy "skills_admin_update"
  on public.skills for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "skills_admin_delete"
  on public.skills for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- profile_skills — visibles para todos (forman parte de la card pública),
-- solo el dueño del perfil las gestiona
-- ---------------------------------------------------------------------------
create policy "profile_skills_select_authenticated"
  on public.profile_skills for select
  to authenticated
  using (true);

create policy "profile_skills_owner_write"
  on public.profile_skills for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "profile_skills_owner_delete"
  on public.profile_skills for delete
  to authenticated
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- likes — cada usuario ve solo los likes que ha dado o recibido; solo puede
-- insertar likes como sí mismo
-- ---------------------------------------------------------------------------
create policy "likes_select_own"
  on public.likes for select
  to authenticated
  using (from_profile = auth.uid() or to_profile = auth.uid());

create policy "likes_insert_own"
  on public.likes for insert
  to authenticated
  with check (from_profile = auth.uid());

-- ---------------------------------------------------------------------------
-- matches — visibles solo para las dos partes; cualquiera de las dos puede
-- marcarlo como unmatched (update de status)
-- ---------------------------------------------------------------------------
create policy "matches_select_participant"
  on public.matches for select
  to authenticated
  using (profile_a = auth.uid() or profile_b = auth.uid());

create policy "matches_update_unmatch"
  on public.matches for update
  to authenticated
  using (profile_a = auth.uid() or profile_b = auth.uid())
  with check (profile_a = auth.uid() or profile_b = auth.uid());

-- ---------------------------------------------------------------------------
-- chat_messages — solo los participantes del match, y el match debe seguir
-- activo para poder escribir
-- ---------------------------------------------------------------------------
create policy "chat_messages_select_participant"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.profile_a = auth.uid() or m.profile_b = auth.uid())
    )
  );

create policy "chat_messages_insert_participant"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and m.status = 'active'
        and (m.profile_a = auth.uid() or m.profile_b = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- global_chat_messages — lectura de todo lo no bloqueado; inserción como
-- uno mismo (moderación y rate-limit se aplican en la edge function, no aquí)
-- ---------------------------------------------------------------------------
create policy "global_chat_select_visible"
  on public.global_chat_messages for select
  to authenticated
  using (is_blocked = false or sender_id = auth.uid() or public.is_admin());

create policy "global_chat_insert_own"
  on public.global_chat_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy "global_chat_admin_moderate"
  on public.global_chat_messages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- reports — el usuario solo ve/crea sus propios reports; los admins ven todos
-- ---------------------------------------------------------------------------
create policy "reports_select_own_or_admin"
  on public.reports for select
  to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_insert_own"
  on public.reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

-- ---------------------------------------------------------------------------
-- push_tokens — cada usuario gestiona solo los suyos
-- ---------------------------------------------------------------------------
create policy "push_tokens_owner_all"
  on public.push_tokens for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- email_templates / email_log — exclusivo del panel admin
-- ---------------------------------------------------------------------------
create policy "email_templates_admin_all"
  on public.email_templates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "email_log_admin_all"
  on public.email_log for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
