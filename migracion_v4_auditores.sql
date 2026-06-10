-- =====================================================================
--  MAGIC® — Migración v4: auditores (código de invitación),
--  confidencialidad y verificación de altas nuevas.
--  Ejecutar en Supabase → SQL Editor. Es idempotente.
-- =====================================================================

-- 1) Campos nuevos en el perfil
alter table public.perfiles
  add column if not exists confidencialidad_aceptada boolean not null default false;
alter table public.perfiles
  add column if not exists confidencialidad_aceptada_en timestamptz;
-- "verificado": las altas nuevas entran sin verificar; el superadmin las verifica.
alter table public.perfiles
  add column if not exists verificado boolean not null default false;

-- 2) Tabla de CÓDIGOS DE INVITACIÓN de auditor (los generas tú / el superadmin)
create table if not exists public.codigos_auditor (
  codigo        text primary key,
  descripcion   text,                       -- p.ej. "Auditor externo - Q1"
  usos_max      int  not null default 1,     -- cuántas veces se puede usar
  usos          int  not null default 0,
  caduca_en     timestamptz,                 -- null = sin caducidad
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);

alter table public.codigos_auditor enable row level security;

-- Solo el superadmin gestiona/ve los códigos desde el cliente.
drop policy if exists codigos_admin on public.codigos_auditor;
create policy codigos_admin on public.codigos_auditor for all
  using (public.es_superadmin(auth.uid()))
  with check (public.es_superadmin(auth.uid()));

-- 3) Función segura para CANJEAR un código y convertirse en auditor.
--    SECURITY DEFINER: valida el código del lado servidor; el usuario
--    autenticado no puede ascenderse sin un código válido.
create or replace function public.canjear_codigo_auditor(p_codigo text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  uid uuid := auth.uid();
begin
  if uid is null then
    return 'no_autenticado';
  end if;

  select * into c from public.codigos_auditor
   where codigo = p_codigo for update;

  if not found then
    return 'codigo_invalido';
  end if;
  if c.activo = false then
    return 'codigo_inactivo';
  end if;
  if c.caduca_en is not null and c.caduca_en < now() then
    return 'codigo_caducado';
  end if;
  if c.usos >= c.usos_max then
    return 'codigo_agotado';
  end if;

  -- Asciende al usuario a auditor y lo marca verificado.
  update public.perfiles
     set rol = case when rol = 'superadmin' then 'superadmin' else 'auditor' end,
         verificado = true
   where id = uid;

  update public.codigos_auditor
     set usos = usos + 1,
         activo = case when usos + 1 >= usos_max then false else activo end
   where codigo = p_codigo;

  return 'ok';
end;
$$;

-- Permitir que cualquier usuario autenticado pueda INTENTAR canjear un código.
grant execute on function public.canjear_codigo_auditor(text) to authenticated;

-- =====================================================================
--  CÓMO GENERAR UN CÓDIGO DE INVITACIÓN DE AUDITOR
--  (ejecuta esto cambiando el código y los parámetros que quieras)
-- =====================================================================
--  insert into public.codigos_auditor (codigo, descripcion, usos_max, caduca_en)
--  values ('MAGIC-AUD-2026', 'Auditores externos 2026', 5, now() + interval '90 days');
--
--  -- Un código de un solo uso, sin caducidad:
--  insert into public.codigos_auditor (codigo, descripcion)
--  values ('AUD-INVITA-ABCD', 'Invitación puntual');
-- =====================================================================
