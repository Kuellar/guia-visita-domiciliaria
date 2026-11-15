-- =====================================================================
-- Guía de Visita Domiciliaria · esquema y seguridad para Supabase
-- Ejecutar completo en: Supabase → SQL Editor → New query → Run
-- Se puede volver a ejecutar sin perder datos (salvo la columna RUT, que se elimina).
--
-- Modelo de acceso:
--   · Funcionarios: sin cuenta. Entran con una sesión anónima de Supabase (protegida con captcha)
--     y solo pueden CREAR visitas; no pueden leer ninguna.
--   · Administradores: email + contraseña. Leen y editan todo.
-- =====================================================================

-- ---------- Tablas ----------------------------------------------------

-- Funcionarios. Los que no son administradores son solo nombres para elegir en la visita.
-- Un administrador entra con el email registrado aquí (activo y con is_admin).
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
  staff_id      uuid references public.staff(id) on delete set null,
  notes         text not null default '',
  answers       jsonb not null default '{}',
  status        text not null check (status in ('borrador', 'completa')),
  result        jsonb not null default '[]',
  created_by    uuid default auth.uid() references auth.users(id) on delete set null
);
create index if not exists visits_date_idx on public.visits (date desc);
create index if not exists visits_created_by_idx on public.visits (created_by, created_at);

-- El RUT ya no se guarda (dato personal). Exporta un respaldo antes si lo necesitas.
alter table public.visits drop column if exists patient_rut;

-- Límites de tamaño: cualquiera puede crear visitas, así que evitamos textos gigantes.
alter table public.visits drop constraint if exists visits_patient_name_len;
alter table public.visits add constraint visits_patient_name_len check (char_length(patient_name) <= 200);
alter table public.visits drop constraint if exists visits_notes_len;
alter table public.visits add constraint visits_notes_len check (char_length(notes) <= 5000);
alter table public.visits drop constraint if exists visits_json_size;
alter table public.visits add constraint visits_json_size check (pg_column_size(answers) < 20000 and pg_column_size(result) < 50000);

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

-- Límite de visitas por sesión anónima: máximo 20 por hora.
-- Fija created_at en el servidor para que no se pueda falsear y saltarse el límite.
create or replace function public.visits_rate_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.created_at := now();
  new.updated_at := now();
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) and (
    select count(*) from public.visits
    where created_by = auth.uid() and created_at > now() - interval '1 hour'
  ) >= 20 then
    raise exception 'Límite de visitas alcanzado. Intenta nuevamente en una hora.';
  end if;
  return new;
end $$;

drop trigger if exists visits_rate_limit on public.visits;
create trigger visits_rate_limit before insert on public.visits
  for each row execute function public.visits_rate_limit();

-- ---------- Funciones de permisos -------------------------------------
-- security definer: leen la tabla staff sin quedar bloqueadas por su propia RLS.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.staff
    where active and is_admin and lower(email) = lower(auth.jwt() ->> 'email')
  )
$$;

create or replace function public.is_anonymous() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

-- Lista de funcionarios para el selector de la visita: sin emails ni permisos.
create or replace function public.staff_directory()
returns table (id uuid, name text, estamento text)
language sql stable security definer set search_path = '' as $$
  select id, name, estamento from public.staff where active order by name
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_anonymous() to authenticated;
grant execute on function public.staff_directory() to anon, authenticated;

-- ---------- Exponer tablas a la API -----------------------------------
-- Las sesiones anónimas de Supabase usan el rol "authenticated" (con is_anonymous = true);
-- lo que pueden hacer lo limita RLS más abajo.

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.staff, public.visits,
  public.rule_overrides, public.question_overrides to authenticated;
revoke all on public.staff, public.visits, public.rule_overrides, public.question_overrides from anon;
-- Textos del cuestionario: legibles sin sesión (no son datos personales).
grant select on public.rule_overrides, public.question_overrides to anon;

-- La Edge Function manage-users (rol service_role) necesita leer staff para comprobar administradores.
grant usage on schema public to service_role;
grant select on public.staff to service_role;

-- ---------- RLS: reglas por fila --------------------------------------

alter table public.staff              enable row level security;
alter table public.visits             enable row level security;
alter table public.rule_overrides     enable row level security;
alter table public.question_overrides enable row level security;

-- staff: solo admin lo ve y modifica (los demás usan staff_directory())
drop policy if exists "staff: leer" on public.staff;
create policy "staff: leer" on public.staff for select to authenticated using (public.is_admin());
drop policy if exists "staff: admin escribe" on public.staff;
create policy "staff: admin escribe" on public.staff for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- visits: sesión anónima o admin crean; solo admin lee, edita y borra
drop policy if exists "visits: leer" on public.visits;
create policy "visits: leer" on public.visits for select to authenticated using (public.is_admin());
drop policy if exists "visits: crear" on public.visits;
create policy "visits: crear" on public.visits for insert to authenticated
  with check (created_by = auth.uid() and (public.is_anonymous() or public.is_admin()));
drop policy if exists "visits: editar" on public.visits;
create policy "visits: editar" on public.visits for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "visits: borrar" on public.visits;
create policy "visits: borrar" on public.visits for delete to authenticated
  using (public.is_admin());

-- textos editados: todos los leen (el cuestionario los necesita); solo admin escribe
drop policy if exists "rule_overrides: leer" on public.rule_overrides;
create policy "rule_overrides: leer" on public.rule_overrides for select to anon, authenticated using (true);
drop policy if exists "rule_overrides: admin escribe" on public.rule_overrides;
create policy "rule_overrides: admin escribe" on public.rule_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "question_overrides: leer" on public.question_overrides;
create policy "question_overrides: leer" on public.question_overrides for select to anon, authenticated using (true);
drop policy if exists "question_overrides: admin escribe" on public.question_overrides;
create policy "question_overrides: admin escribe" on public.question_overrides for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Ya no se usa: los funcionarios no inician sesión.
drop function if exists public.is_staff();

-- =====================================================================
-- PRIMER ADMINISTRADOR (ejecutar una vez, cambiando nombre, estamento y email):
--
-- insert into public.staff (name, estamento, email, is_admin)
-- values ('Tu Nombre', 'Enfermero/a', 'tu@email.com', true);
--
-- Luego crea el usuario con ese mismo email en Authentication → Users → Add user.
--
-- LIMPIEZA OPCIONAL de sesiones anónimas antiguas (sus visitas se conservan):
--
-- delete from auth.users where is_anonymous and created_at < now() - interval '30 days';
-- =====================================================================
