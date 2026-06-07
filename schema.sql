-- =====================================================================
--  MAGIC® — Autoevaluación · Esquema Supabase (Postgres)
--  Criterio 1: Propósito, Visión y Estrategia (pestaña C1)
--  Instituto de Excelencia Europea (IEE)
-- =====================================================================
-- Ejecuta este script en: Supabase → SQL Editor → New query → Run
-- =====================================================================

-- 1) EVALUACIONES ------------------------------------------------------
-- Cada fila es una autoevaluación de una organización.
-- El acceso se controla con un código/PIN (access_code) por evaluación.
create table if not exists public.evaluaciones (
  id            uuid primary key default gen_random_uuid(),
  organizacion  text not null,
  criterio      text not null default 'C1',
  access_code   text not null,                 -- código/PIN para abrir la evaluación
  creado_en     timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Índice para buscar por código de acceso rápidamente
create unique index if not exists idx_eval_access_code
  on public.evaluaciones (access_code);

-- 2) RESPUESTAS --------------------------------------------------------
-- Una fila por pregunta (P 1.1 ... P 1.10) dentro de una evaluación.
create table if not exists public.respuestas (
  id             uuid primary key default gen_random_uuid(),
  evaluacion_id  uuid not null references public.evaluaciones(id) on delete cascade,
  pregunta_cod   text not null,                -- "P 1.1"
  bloque         text,
  puntuacion     int  check (puntuacion in (0,20,40,60,80,100)),
  justificacion  text,
  actualizado_en timestamptz not null default now(),
  unique (evaluacion_id, pregunta_cod)
);

-- 3) DOCUMENTOS --------------------------------------------------------
-- Metadatos de los archivos subidos a Supabase Storage por pregunta.
create table if not exists public.documentos (
  id             uuid primary key default gen_random_uuid(),
  evaluacion_id  uuid not null references public.evaluaciones(id) on delete cascade,
  pregunta_cod   text not null,
  nombre_archivo text not null,
  storage_path   text not null,                -- ruta dentro del bucket
  mime           text,
  tamano_bytes   bigint,
  subido_en      timestamptz not null default now()
);

create index if not exists idx_doc_eval on public.documentos (evaluacion_id, pregunta_cod);

-- 4) STORAGE -----------------------------------------------------------
-- Crea el bucket de evidencias (privado). Si ya existe, no falla.
insert into storage.buckets (id, name, public)
values ('evidencias', 'evidencias', false)
on conflict (id) do nothing;

-- =====================================================================
--  NOTA DE SEGURIDAD
--  Estas tablas se acceden EXCLUSIVAMENTE desde las Netlify Functions
--  usando la SERVICE ROLE KEY (servidor). El navegador nunca habla
--  directamente con Supabase. Por eso NO se habilita RLS aquí: la
--  service role la salta de todos modos y simplifica el arranque.
--
--  Si en el futuro quieres exponer Supabase al cliente directamente,
--  habilita RLS y define políticas. Para esta arquitectura (todo a
--  través de funciones) no es necesario.
-- =====================================================================
