create or replace function public.enforce_name_age_immutable_for_users()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  -- Solo se bloquea el cambio si el onboarding YA estaba completo antes de
  -- este update. Mientras el usuario sigue en el proceso de creación de
  -- perfil (onboarding_completed = false), puede corregir/ajustar el
  -- nombre y la edad las veces que haga falta -- incluido el valor que
  -- handle_new_user autorrellena desde Google al registrarse, que NO debe
  -- contar como "ya confirmado por el usuario".
  if old.onboarding_completed then
    if old.name is not null and new.name is distinct from old.name then
      raise exception 'El nombre no se puede modificar después del registro' using errcode = '23514';
    end if;
    if old.age is not null and new.age is distinct from old.age then
      raise exception 'La edad no se puede modificar después del registro' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
