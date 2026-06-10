# MAGIC® — Aprobación de clientes con aviso por correo

Cuando un **cliente** se registra, su cuenta queda **pendiente** (no puede usar la
herramienta) y te llega un **correo a alejandro@tuconsultor.com** con un enlace para
aprobarla. Los **auditores** no pasan por aquí: entran con su código de invitación.

Hay 3 cosas que configurar. Las dos primeras son obligatorias; la tercera (el email)
es la que requiere la pieza de servidor.

---

## 1) Base de datos  (obligatorio, 2 min)

En Supabase → SQL Editor → New query, ejecuta el archivo **`migracion_v5_aprobacion.sql`**.
Esto añade el campo "aprobado", bloquea a los clientes no aprobados y crea la función
de aprobación por enlace.

Para que tus usuarios ACTUALES no se queden fuera, apruébalos de golpe:
```sql
update public.perfiles set aprobado = true where rol = 'cliente';
```

## 2) Subir la web  (obligatorio)

Despliega la nueva versión (incluye `aprobar.html` y la pantalla de "pendiente").
Con solo esto ya tienes aprobación manual: entra en el **Panel → Usuarios** y verás
una columna "Acceso" donde apruebas a cada cliente con un clic. **Sin tocar nada más,
el sistema ya funciona** — lo único que faltaría es que te avise por correo (paso 3).

## 3) El correo de aviso  (opcional pero es lo que pediste)

Esto envía el email a alejandro@tuconsultor.com al registrarse alguien. Se hace con una
**Edge Function** de Supabase. Puedes crearla desde el panel web, SIN terminal:

### 3.1 Crear la función
1. Supabase → menú lateral **Edge Functions** → **Create a function**.
2. Nómbrala exactamente **`aviso-registro`**.
3. Borra el contenido de ejemplo y pega el de `supabase/functions/aviso-registro/index.ts`.
4. **Deploy**.

### 3.2 Configurar los secretos
En Edge Functions → **Manage secrets** (o Settings → Edge Functions → Secrets), añade:
- `BREVO_API_KEY`  → tu clave API de Brevo (Brevo → SMTP & API → API Keys).
- `ADMIN_EMAIL`    → `alejandro@tuconsultor.com`
- `SITE_URL`       → `https://TU-SITIO.netlify.app`  (tu dominio real, sin barra final)

(SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya están disponibles automáticamente.)

### 3.3 Disparar la función al registrarse alguien
Supabase → **Database** → **Webhooks** → **Create a new hook**:
- Tabla: **perfiles**, evento **Insert**.
- Tipo: **Supabase Edge Functions** → elige `aviso-registro`.
- Guardar.

Así, cada vez que se crea un perfil nuevo (un registro), se llama a la función y te
manda el correo. El enlace del correo abre `aprobar.html?token=...` y aprueba la cuenta.

### Importante sobre el remitente
Para que Brevo entregue el correo, el `ADMIN_EMAIL` (o el dominio que uses como
remitente) debe estar **verificado en Brevo** (Senders & Domains). Si tu dominio de
correo es tuconsultor.com, verifícalo allí; si no, usa como remitente un email ya
verificado en tu cuenta de Brevo y deja ADMIN_EMAIL solo como destinatario.

---

## Cómo apruebas en el día a día
- **Por correo**: te llega el aviso, pulsas "Aprobar este usuario", listo.
- **Por panel**: entras al Panel, columna "Acceso", clic en "pendiente" → pasa a "aprobado".

## Aprobar/!des!aprobar por SQL (manual)
```sql
-- aprobar a alguien
update public.perfiles set aprobado=true, aprobado_en=now() where email='correo@dominio.com';
-- ver pendientes
select email, nombre, rol, aprobado from public.perfiles where aprobado=false;
```
