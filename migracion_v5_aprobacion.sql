-- =====================================================================
--  MAGIC® — Migración v5 · Aprobación manual de clientes
--  Ejecuta este bloque en Supabase → SQL Editor → New query → Run.
--  Idempotente: se puede ejecutar varias veces.
-- =====================================================================

-- 1) Campo de aprobación en el perfil
alter table public.perfiles
  add column if not exists aprobado boolean not null default false;
alter table public.perfiles
  add column if not exists aprobado_en timestamptz;
alter table public.perfiles
  add column if not exists token_aprob text;   -- token para el enlace del email

-- Los auditores y superadmin se consideran aprobados de oficio
update public.perfiles set aprobado = true
  where rol in ('auditor','superadmin') and aprobado = false;

-- 2) Función: ¿el usuario está aprobado (o es auditor/superadmin)?
create or replace function public.esta_aprobado(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.perfiles
    where id = uid and (aprobado = true or rol in ('auditor','superadmin'))
  );
$$;

-- 3) Un cliente NO aprobado no puede crear evaluaciones.
--    (Ver las suyas sí, para no romper nada; pero sin crear ni rellenar.)
drop policy if exists eval_insert on public.evaluaciones;
create policy eval_insert on public.evaluaciones for insert
  with check (propietario_id = auth.uid() and public.esta_aprobado(auth.uid()));

-- Tampoco puede guardar respuestas, datos de cliente, empresas, centros ni documentos
drop policy if exists resp_write on public.respuestas;
create policy resp_write on public.respuestas for all
  using (public.puede_ver_eval(evaluacion_id, auth.uid()))
  with check (public.puede_ver_eval(evaluacion_id, auth.uid()) and public.esta_aprobado(auth.uid()));

-- 4) El trigger de alta de usuario genera un token de aprobación único
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, email, nombre, rol, token_aprob)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'nombre', new.email),
    'cliente',
    encode(gen_random_bytes(18), 'hex')
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- 5) Función para APROBAR vía token (la llama la Edge Function del enlace del email).
--    SECURITY DEFINER: se ejecuta con privilegios, pero solo aprueba si el token coincide.
create or replace function public.aprobar_por_token(p_token text)
returns text language plpgsql security definer set search_path = public as $$
declare p record;
begin
  select * into p from public.perfiles where token_aprob = p_token;
  if not found then return 'token_invalido'; end if;
  if p.aprobado then return 'ya_aprobado'; end if;
  update public.perfiles
     set aprobado = true, aprobado_en = now(), token_aprob = null
   where id = p.id;
  return 'ok';
end; $$;

-- El enlace de aprobación se abre sin sesión: permitimos a anon ejecutar la
-- función (el token secreto es la única llave; sin token válido no hace nada).
grant execute on function public.aprobar_por_token(text) to anon, authenticated;

-- =====================================================================
--  NOTA: a los usuarios YA existentes que quieras dejar operativos:
--    update public.perfiles set aprobado = true where email = 'correo@dominio.com';
--  O aprueba a todos los actuales de golpe:
--    update public.perfiles set aprobado = true where rol = 'cliente';
-- =====================================================================
