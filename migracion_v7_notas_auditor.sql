-- =====================================================================
--  MAGIC® — Migración v7 · Notas de auditoría en datos de cliente
--  Añade una columna para que el auditor anote observaciones sobre los
--  datos del cliente (alcance, empresas, centros).
--  Ejecuta en Supabase → SQL Editor → New query → Run. Idempotente.
-- =====================================================================

alter table public.cliente_datos
  add column if not exists auditor_notas text;
