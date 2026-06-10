-- =====================================================================
--  MAGIC® — Migración v6 · Puntos fuertes y mejoras POR PREGUNTA
--  Cada ítem es una línea suelta (un punto fuerte o una mejora) ligada
--  a una pregunta concreta de una evaluación. El auditor añade y borra
--  ítems de uno en uno.
--  Ejecuta en Supabase → SQL Editor → New query → Run. Idempotente.
-- =====================================================================

create table if not exists public.auditor_items (
  id            uuid primary key default gen_random_uuid(),
  evaluacion_id uuid not null references public.evaluaciones(id) on delete cascade,
  pregunta_cod  text not null,                 -- "P x.y"
  tipo          text not null check (tipo in ('fuerte','mejora')),
  texto         text not null default '',
  orden         int default 0,
  auditor_id    uuid references auth.users(id),
  creado_en     timestamptz not null default now()
);
create index if not exists idx_auditor_items_eval on public.auditor_items (evaluacion_id, pregunta_cod);

alter table public.auditor_items enable row level security;

-- Ver: cualquiera que pueda ver la evaluación. Escribir: solo auditores/superadmin.
drop policy if exists ai_select on public.auditor_items;
create policy ai_select on public.auditor_items for select
  using (public.puede_ver_eval(evaluacion_id, auth.uid()));

drop policy if exists ai_write on public.auditor_items;
create policy ai_write on public.auditor_items for all
  using (public.es_auditor(auth.uid()) and public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.es_auditor(auth.uid()) and public.puede_ver_eval(evaluacion_id, auth.uid()));

-- El superadmin, acceso total (se suma a la anterior con OR)
drop policy if exists sa_all_auditor_items on public.auditor_items;
create policy sa_all_auditor_items on public.auditor_items for all
  using (public.es_superadmin(auth.uid())) with check (public.es_superadmin(auth.uid()));

-- =====================================================================
--  (Opcional) Migrar lo que hubiera en auditor_criterio a ítems sueltos,
--  asignándolos a la primera pregunta de cada criterio. Comentado por
--  defecto; descoméntalo solo si quieres arrastrar lo antiguo.
-- =====================================================================
-- insert into public.auditor_items (evaluacion_id, pregunta_cod, tipo, texto)
-- select evaluacion_id, criterio||' (general)', 'fuerte', puntos_fuertes
--   from public.auditor_criterio where coalesce(puntos_fuertes,'') <> '';
-- insert into public.auditor_items (evaluacion_id, pregunta_cod, tipo, texto)
-- select evaluacion_id, criterio||' (general)', 'mejora', areas_mejora
--   from public.auditor_criterio where coalesce(areas_mejora,'') <> '';
