-- Protege el esquema existente de cuentas y sincronización de PFI.
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create or replace function private.is_pfi_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.pfi_household_members as member
    where member.household_id = p_household_id
      and member.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_pfi_household_member(uuid) from public, anon;
grant execute on function private.is_pfi_household_member(uuid) to authenticated, service_role;

drop policy if exists pfi_family_data_insert on public.pfi_family_data;
drop policy if exists pfi_family_data_select on public.pfi_family_data;
drop policy if exists pfi_family_data_update on public.pfi_family_data;
drop policy if exists pfi_members_select on public.pfi_household_members;
drop policy if exists pfi_members_update_self on public.pfi_household_members;
drop policy if exists pfi_households_select on public.pfi_households;

create policy pfi_family_data_select
on public.pfi_family_data
for select
to authenticated
using ((select private.is_pfi_household_member(household_id)));

create policy pfi_family_data_insert
on public.pfi_family_data
for insert
to authenticated
with check (
  (select private.is_pfi_household_member(household_id))
  and updated_by = (select auth.uid())
);

create policy pfi_family_data_update
on public.pfi_family_data
for update
to authenticated
using ((select private.is_pfi_household_member(household_id)))
with check (
  (select private.is_pfi_household_member(household_id))
  and updated_by = (select auth.uid())
);

create policy pfi_members_select
on public.pfi_household_members
for select
to authenticated
using ((select private.is_pfi_household_member(household_id)));

create policy pfi_members_update_self
on public.pfi_household_members
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy pfi_households_select
on public.pfi_households
for select
to authenticated
using ((select private.is_pfi_household_member(id)));

drop function if exists public.is_pfi_household_member(uuid);

create or replace function public.create_pfi_household(
  p_name text,
  p_display_name text default null
)
returns table(household_id uuid, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_household uuid;
  v_code text;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if exists (
    select 1
    from public.pfi_household_members as member
    where member.user_id = v_user
  ) then
    raise exception 'Esta cuenta ya pertenece a una familia.';
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1
      from public.pfi_households as household
      where household.invite_code = v_code
    );
  end loop;

  insert into public.pfi_households (name, invite_code, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Mi familia'), v_code, v_user)
  returning id into v_household;

  insert into public.pfi_household_members (
    household_id,
    user_id,
    role,
    display_name
  ) values (
    v_household,
    v_user,
    'propietario',
    nullif(trim(p_display_name), '')
  );

  return query select v_household, v_code;
end;
$$;

create or replace function public.join_pfi_household(
  p_invite_code text,
  p_display_name text default null
)
returns table(household_id uuid, household_name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_household public.pfi_households%rowtype;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if exists (
    select 1
    from public.pfi_household_members as member
    where member.user_id = v_user
  ) then
    raise exception 'Esta cuenta ya pertenece a una familia.';
  end if;

  select household.* into v_household
  from public.pfi_households as household
  where household.invite_code = upper(trim(p_invite_code));

  if v_household.id is null then
    raise exception 'Código de familia no válido.';
  end if;

  insert into public.pfi_household_members (
    household_id,
    user_id,
    role,
    display_name
  ) values (
    v_household.id,
    v_user,
    'miembro',
    nullif(trim(p_display_name), '')
  );

  return query
  select v_household.id, v_household.name, v_household.invite_code;
end;
$$;

create or replace function public.touch_pfi_family_data()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.create_pfi_household(text, text) from public, anon;
revoke all on function public.join_pfi_household(text, text) from public, anon;
revoke all on function public.touch_pfi_family_data() from public, anon, authenticated;
grant execute on function public.create_pfi_household(text, text) to authenticated, service_role;
grant execute on function public.join_pfi_household(text, text) to authenticated, service_role;

revoke all on table public.pfi_households from anon, authenticated;
revoke all on table public.pfi_household_members from anon, authenticated;
revoke all on table public.pfi_family_data from anon, authenticated;

grant select on table public.pfi_households to authenticated;
grant select on table public.pfi_household_members to authenticated;
grant update (display_name) on table public.pfi_household_members to authenticated;
grant select, insert, update on table public.pfi_family_data to authenticated;

create index if not exists pfi_households_created_by_idx
on public.pfi_households (created_by);

create index if not exists pfi_family_data_updated_by_idx
on public.pfi_family_data (updated_by);

notify pgrst, 'reload schema';
