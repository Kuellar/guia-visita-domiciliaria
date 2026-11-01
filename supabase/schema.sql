-- =====================================================================
-- Guía de Visita Domiciliaria · esquema y seguridad para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Se puede volver a ejecutar sin perder datos.
-- =====================================================================

-- ---------- Tablas ----------------------------------------------------

-- Funcionarios. Una persona puede entrar a la app solo si su email está aquí y está activa.
create table if not exists public.staff (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  estamento   text not null,
  email       text unique,
  is_admin    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.visits (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  date          date not null,
  patient_name  text not null,
  patient_rut   text not null default '',
  staff_id      uuid references public.staff(id) on delete set null,
  notes         text not null default '',
  answers       jsonb not null default '{}',
  status        text not null check (status in ('borrador', 'completa')),
  result        jsonb not null default '[]',
  created_by    uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists visits_date_idx on public.visits (date desc);

-- Textos editados por el administrador (lo no editado usa el valor del código).
create table if not exists public.rule_overrides (
  rule_id     int primary key,
  text        text,
  origin      text,
  active      boolean,
  updated_at  timestamptz not null default now()
);

create table if not exists public.question_overrides (
  question_id text primary key,
  label       text,
  help        text,
  options     jsonb,
  updated_at  timestamptz not null default now()
);

-- updated_at automático en visitas
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists visits_touch on public.visits;
create trigger visits_touch before update on public.visits
  for each row execute function public.touch_updated_at();

-- ---------- Funciones de permisos -------------------------------------
-- security definer: leen la tabla staff sin quedar bloqueadas por su propia RLS.

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff
    where active and lower(email) = lower(auth.jwt() ->> 'email')
  )
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff
    where active and is_admin and lower(email) = lower(auth.jwt() ->> 'email')
  )
$$;

revoke all on function public.is_staff() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------- Exponer tablas a la API (solo usuarios con sesión) --------

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.staff, public.visits,
  public.rule_overrides, public.question_overrides to authenticated;
revoke all on public.staff, public.visits, public.rule_overrides, public.question_overrides from anon;

-- La Edge Function manage-users (rol service_role) necesita leer staff para comprobar administradores.
grant usage on schema public to service_role;
grant select on public.staff to service_role;

-- ---------- RLS: reglas por fila --------------------------------------

alter table public.staff              enable row level security;
alter table public.visits             enable row level security;
alter table public.rule_overrides     enable row level security;
alter table public.question_overrides enable row level security;

-- staff: todo funcionario lo ve (para elegir en la visita); solo admin lo modifica
drop policy if exists "staff: leer" on public.staff;
create policy "staff: leer" on public.staff for select to authenticated using (public.is_staff());
drop policy if exists "staff: admin escribe" on public.staff;
create policy "staff: admin escribe" on public.staff for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- visits: todo funcionario lee y crea; edita/borra quien la creó o un admin
drop policy if exists "visits: leer" on public.visits;
create policy "visits: leer" on public.visits for select to authenticated using (public.is_staff());
drop policy if exists "visits: crear" on public.visits;
create policy "visits: crear" on public.visits for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
drop policy if exists "visits: editar" on public.visits;
create policy "visits: editar" on public.visits for update to authenticated
  using (public.is_staff() and (created_by = auth.uid() or public.is_admin()))
  with check (public.is_staff());
drop policy if exists "visits: borrar" on public.visits;
create policy "visits: borrar" on public.visits for delete to authenticated
  using (public.is_staff() and (created_by = auth.uid() or public.is_admin()));

-- textos editados: todos los leen (el cuestionario los necesita); solo admin escribe
drop policy if exists "rule_overrides: leer" on public.rule_overrides;
create policy "rule_overrides: leer" on public.rule_overrides for select to authenticated using (public.is_staff());
drop policy if exists "rule_overrides: admin escribe" on public.rule_overrides;
create policy "rule_overrides: admin escribe" on public.rule_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "question_overrides: leer" on public.question_overrides;
create policy "question_overrides: leer" on public.question_overrides for select to authenticated using (public.is_staff());
drop policy if exists "question_overrides: admin escribe" on public.question_overrides;
create policy "question_overrides: admin escribe" on public.question_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- PRIMER ADMINISTRADOR (ejecutar una vez, cambiando nombre, estamento y email):
--
-- insert into public.staff (name, estamento, email, is_admin)
-- values ('Tu Nombre', 'Enfermero/a', 'tu@email.com', true);
--
-- Luego crea el usuario con ese mismo email en Authentication → Users → Add user.
-- =====================================================================
