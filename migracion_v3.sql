-- =====================================================================
--  MAGIC® — Migración v2 → v3  (empresas/CIF, centros y RGPD)
--  Ejecuta este script en Supabase → SQL Editor SI YA tenías la base
--  de datos creada y NO quieres borrar tus datos.
--  Es idempotente: se puede ejecutar varias veces sin romper nada.
-- =====================================================================

-- 1) Campos de aceptación de términos (RGPD + disclaimer) en el perfil
alter table public.perfiles
  add column if not exists terminos_aceptados boolean not null default false;
alter table public.perfiles
  add column if not exists terminos_aceptados_en timestamptz;

-- 2) Tabla EMPRESAS (varios CIF por evaluación)
create table if not exists public.empresas (
  id            uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  razon_social  text,
  cif           text,
  orden         int default 0,
  creado_en     timestamptz not null default now()
);
create index if not exists idx_empresas_eval on public.empresas (evaluacion_id);

-- 3) Tabla CENTROS (centros de trabajo dentro de cada empresa/CIF)
create table if not exists public.centros (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  nombre        text,
  direccion     text,
  trabajadores  int,
  orden         int default 0
);
create index if not exists idx_centros_empresa on public.centros (empresa_id);
create index if not exists idx_centros_eval on public.centros (evaluacion_id);

-- 4) RLS en las nuevas tablas
alter table public.empresas enable row level security;
alter table public.centros  enable row level security;

drop policy if exists empresas_rw on public.empresas;
create policy empresas_rw on public.empresas for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));

drop policy if exists centros_rw on public.centros;
create policy centros_rw on public.centros for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));

-- (Opcional) Migrar las "sedes" antiguas a una empresa por defecto:
-- Crea una empresa con el CIF de cliente_datos y mueve las sedes como centros.
do $$
declare r record; nueva_emp uuid;
begin
  for r in select distinct s.evaluacion_id from public.sedes s
           where not exists (select 1 from public.empresas e where e.evaluacion_id = s.evaluacion_id)
  loop
    insert into public.empresas (evaluacion_id, razon_social, cif, orden)
    select r.evaluacion_id, cd.razon_social, cd.cif, 0
    from public.cliente_datos cd where cd.evaluacion_id = r.evaluacion_id
    returning id into nueva_emp;
    if nueva_emp is null then
      insert into public.empresas (evaluacion_id, razon_social, cif, orden)
      values (r.evaluacion_id, null, null, 0) returning id into nueva_emp;
    end if;
    insert into public.centros (empresa_id, evaluacion_id, nombre, direccion, trabajadores, orden)
    select nueva_emp, s.evaluacion_id, s.nombre, s.direccion, s.trabajadores, s.orden
    from public.sedes s where s.evaluacion_id = r.evaluacion_id;
  end loop;
end $$;

-- Listo. La app ya usará empresas + centros.
