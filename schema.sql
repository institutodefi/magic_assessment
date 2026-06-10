-- =====================================================================
--  MAGIC® — Autoevaluación · Esquema Supabase v2 (con Auth + roles)
--  Instituto de Excelencia Europea (IEE)
-- =====================================================================
--  Ejecuta TODO este script en: Supabase → SQL Editor → New query → Run
--  Requiere que Supabase Auth (email/contraseña) esté activado.
-- =====================================================================

-- ───────────────────────────────────────────────────────────────────
-- 1) PERFILES — un registro por usuario de Supabase Auth, con su rol.
-- ───────────────────────────────────────────────────────────────────
-- Roles: 'cliente' (por defecto), 'auditor', 'superadmin'.
create table if not exists public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  nombre      text,
  rol         text not null default 'cliente' check (rol in ('cliente','auditor','superadmin')),
  terminos_aceptados   boolean not null default false,
  terminos_aceptados_en timestamptz,
  creado_en   timestamptz not null default now()
);

-- Al crear un usuario en Auth, se crea su perfil automáticamente como 'cliente'.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre, rol)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'nombre', new.email), 'cliente')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers de rol (se usan en las políticas RLS)
create or replace function public.es_auditor(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = uid and rol in ('auditor','superadmin'));
$$;
create or replace function public.es_superadmin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = uid and rol = 'superadmin');
$$;

-- ───────────────────────────────────────────────────────────────────
-- 2) EVALUACIONES — cada una pertenece a un cliente (su propietario).
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.evaluaciones (
  id             uuid primary key default gen_random_uuid(),
  organizacion   text not null,
  propietario_id uuid not null references auth.users(id) on delete cascade,
  estado         text not null default 'en_curso' check (estado in ('en_curso','enviada','auditada','cerrada')),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index if not exists idx_eval_owner on public.evaluaciones (propietario_id);

-- 2b) DATOS DE CLIENTE (1 por evaluación): alcance general de la evaluación.
--     (La razón social y el CIF viven ahora en la tabla "empresas", para
--      soportar grupos con varios CIF dentro de una misma evaluación.)
create table if not exists public.cliente_datos (
  evaluacion_id  uuid primary key references public.evaluaciones(id) on delete cascade,
  razon_social   text,   -- (heredado; opcional) razón social principal del grupo
  cif            text,   -- (heredado; opcional)
  alcance        text,
  actualizado_en timestamptz not null default now()
);

-- 2c) EMPRESAS (N por evaluación): cada CIF con su razón social.
create table if not exists public.empresas (
  id            uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  razon_social  text,
  cif           text,
  orden         int default 0,
  creado_en     timestamptz not null default now()
);
create index if not exists idx_empresas_eval on public.empresas (evaluacion_id);

-- 2d) CENTROS DE TRABAJO (N por empresa): dirección + nº trabajadores.
create table if not exists public.centros (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null references public.empresas(id) on delete cascade,
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  nombre        text,           -- p.ej. "Sede central", "Delegación Norte"
  direccion     text,
  trabajadores  int,
  orden         int default 0
);
create index if not exists idx_centros_empresa on public.centros (empresa_id);
create index if not exists idx_centros_eval on public.centros (evaluacion_id);

-- 2e) SEDES (heredado de la versión anterior; se mantiene por compatibilidad)
create table if not exists public.sedes (
  id            uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  nombre        text,
  direccion     text,
  trabajadores  int,
  orden         int default 0
);
create index if not exists idx_sedes_eval on public.sedes (evaluacion_id);

-- ───────────────────────────────────────────────────────────────────
-- 3) ASIGNACIONES — qué auditores cubren qué evaluaciones (las pone el superadmin)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.asignaciones (
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  auditor_id    uuid not null references auth.users(id) on delete cascade,
  asignado_en   timestamptz not null default now(),
  primary key (evaluacion_id, auditor_id)
);
create index if not exists idx_asig_aud on public.asignaciones (auditor_id);

-- ───────────────────────────────────────────────────────────────────
-- 4) RESPUESTAS — una por pregunta. La rellena el cliente.
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.respuestas (
  id             uuid primary key default gen_random_uuid(),
  evaluacion_id  uuid not null references public.evaluaciones(id) on delete cascade,
  pregunta_cod   text not null,
  bloque         text,
  puntuacion     int  check (puntuacion in (0,20,40,60,80,100)),
  justificacion  text,
  actualizado_en timestamptz not null default now(),
  unique (evaluacion_id, pregunta_cod)
);

-- 4b) EVALUACIÓN DEL AUDITOR (1 por criterio): puntos fuertes y áreas de mejora.
--     SOLO la rellenan auditores.
create table if not exists public.auditor_criterio (
  id             uuid primary key default gen_random_uuid(),
  evaluacion_id  uuid not null references public.evaluaciones(id) on delete cascade,
  criterio       text not null,             -- "C1".."C7"
  puntos_fuertes text,
  areas_mejora   text,
  auditor_id     uuid references auth.users(id),
  actualizado_en timestamptz not null default now(),
  unique (evaluacion_id, criterio)
);

-- ───────────────────────────────────────────────────────────────────
-- 5) DOCUMENTOS — metadatos de archivos en Storage.
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.documentos (
  id             uuid primary key default gen_random_uuid(),
  evaluacion_id  uuid not null references public.evaluaciones(id) on delete cascade,
  pregunta_cod   text not null,
  nombre_archivo text not null,
  storage_path   text not null,
  mime           text,
  tamano_bytes   bigint,
  subido_en      timestamptz not null default now()
);
create index if not exists idx_doc_eval on public.documentos (evaluacion_id, pregunta_cod);

-- ───────────────────────────────────────────────────────────────────
-- 6) STORAGE
-- ───────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

-- ───────────────────────────────────────────────────────────────────
-- 7) ROW LEVEL SECURITY
--    El navegador usa la clave anon + sesión del usuario. RLS protege todo.
-- ───────────────────────────────────────────────────────────────────
alter table public.perfiles         enable row level security;
alter table public.evaluaciones     enable row level security;
alter table public.cliente_datos    enable row level security;
alter table public.empresas         enable row level security;
alter table public.centros          enable row level security;
alter table public.sedes            enable row level security;
alter table public.asignaciones     enable row level security;
alter table public.respuestas       enable row level security;
alter table public.auditor_criterio enable row level security;
alter table public.documentos       enable row level security;

-- PERFILES: cada quien ve su perfil; superadmin ve y edita todos.
create policy perfil_self_select on public.perfiles for select
  using (id = auth.uid() or public.es_superadmin(auth.uid()));
create policy perfil_self_update on public.perfiles for update
  using (id = auth.uid() or public.es_superadmin(auth.uid()));
create policy perfil_admin_all on public.perfiles for all
  using (public.es_superadmin(auth.uid())) with check (public.es_superadmin(auth.uid()));

-- Función: ¿este usuario puede acceder a esta evaluación?
create or replace function public.puede_ver_eval(eid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.evaluaciones e where e.id = eid and e.propietario_id = uid)
      or exists (select 1 from public.asignaciones a where a.evaluacion_id = eid and a.auditor_id = uid)
      or public.es_superadmin(uid);
$$;

-- EVALUACIONES
create policy eval_select on public.evaluaciones for select
  using (propietario_id = auth.uid() or public.puede_ver_eval(id, auth.uid()));
create policy eval_insert on public.evaluaciones for insert
  with check (propietario_id = auth.uid());
create policy eval_update on public.evaluaciones for update
  using (propietario_id = auth.uid() or public.es_auditor(auth.uid()));

-- CLIENTE_DATOS, EMPRESAS, CENTROS y SEDES: quien pueda ver la evaluación
create policy cd_rw on public.cliente_datos for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));
create policy empresas_rw on public.empresas for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));
create policy centros_rw on public.centros for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));
create policy sedes_rw on public.sedes for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));

-- ASIGNACIONES: las gestiona el superadmin; el auditor ve las suyas
create policy asig_select on public.asignaciones for select
  using (auditor_id = auth.uid() or public.es_superadmin(auth.uid()));
create policy asig_admin on public.asignaciones for all
  using (public.es_superadmin(auth.uid())) with check (public.es_superadmin(auth.uid()));

-- RESPUESTAS: lectura para quien ve la evaluación; escritura para propietario (cliente) o auditor/superadmin
create policy resp_select on public.respuestas for select
  using (public.puede_ver_eval(evaluacion_id, auth.uid()));
create policy resp_write on public.respuestas for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));

-- AUDITOR_CRITERIO: ver, quien ve la evaluación; escribir, SOLO auditores/superadmin
create policy ac_select on public.auditor_criterio for select
  using (public.puede_ver_eval(evaluacion_id, auth.uid()));
create policy ac_write on public.auditor_criterio for all
  using (public.es_auditor(auth.uid()) and public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.es_auditor(auth.uid()) and public.puede_ver_eval(evaluacion_id, auth.uid()));

-- DOCUMENTOS
create policy doc_select on public.documentos for select
  using (public.puede_ver_eval(evaluacion_id, auth.uid()));
create policy doc_write on public.documentos for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()));

-- STORAGE (bucket evidencias): acceso a objetos cuya carpeta raíz es una evaluación accesible.
-- La ruta es: <evaluacion_id>/<pregunta>/<archivo>
create policy storage_evidencias_rw on storage.objects for all
  using (
    bucket_id = 'evidencias'
    and public.puede_ver_eval( (split_part(name,'/',1))::uuid, auth.uid() )
  )
  with check (
    bucket_id = 'evidencias'
    and public.puede_ver_eval( (split_part(name,'/',1))::uuid, auth.uid() )
  );

-- =====================================================================
--  DESPUÉS DE EJECUTAR ESTE SCRIPT:
--  1) Regístrate en la web con tu email (serás 'cliente').
--  2) Conviértete en superadmin ejecutando (cambia el email):
--       update public.perfiles set rol='superadmin'
--       where email='TU_EMAIL_ADMIN@dominio.com';
--  3) Desde la app, como superadmin, podrás ascender auditores y asignarlos.
-- =====================================================================
