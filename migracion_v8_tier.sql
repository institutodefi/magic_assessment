-- =====================================================================
--  MAGIC® — Migración v8 · Tier de membresía (Elite Club)
--  Añade el nivel de membresía al perfil, separado del rol.
--  Tiers: basic (azul), pro (oro), ultra (titanio). NULL = sin membresía.
--  Ejecuta en Supabase → SQL Editor → New query → Run. Idempotente.
-- =====================================================================

alter table public.perfiles
  add column if not exists tier text
  check (tier is null or tier in ('basic','pro','ultra'));

-- Índice opcional para filtrar miembros por tier
create index if not exists idx_perfiles_tier on public.perfiles (tier);

-- Nota: el acceso al Club Elite se concede a cualquier perfil con tier no nulo.
-- Los permisos finos por tier (basic/pro/ultra) se definirán más adelante.
