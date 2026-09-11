-- ============================================================================
-- Connect-it — Bootstrap de admin en local
-- Cada `supabase db reset` borra auth.users y user_roles por completo, así
-- que había que volver a insertar el rol admin a mano cada vez. Este trigger
-- lo hace solo: la primera vez que este email inicia sesión (con Google),
-- se le concede el rol admin automáticamente.
--
-- Esto NO afecta a producción de forma insegura: solo actúa sobre ESTE email
-- concreto, y de todas formas cualquiera que inicie sesión con esta cuenta de
-- Google ya sería su dueño. Si en algún momento se añaden más admins reales
-- o se quita de este email el control del proyecto, borra este trigger.
-- ============================================================================

create or replace function public.grant_bootstrap_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email = 'zaratrustre@gmail.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger trg_grant_bootstrap_admin
after insert on auth.users
for each row execute function public.grant_bootstrap_admin();

comment on function public.grant_bootstrap_admin is
  'Concede admin automáticamente a un email fijo al registrarse. Solo para arranque en local/dev.';
