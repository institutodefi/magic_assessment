/* ============================================================
   MAGIC® · Cliente Supabase + autenticación (navegador)
   ------------------------------------------------------------
   Usa el SDK oficial de Supabase con la clave ANON (pública y
   segura para el cliente). La seguridad real la aplica RLS en
   la base de datos según el usuario autenticado y su rol.

   CONFIGURA AQUÍ tus dos valores públicos (no secretos):
   ============================================================ */
window.MAGIC_CONFIG = {
  // Supabase → Project Settings → Data API → Project URL
  SUPABASE_URL: "https://qlnsvoadnhchzpsuqdqk.supabase.co",
  // Supabase → Project Settings → API Keys → anon public  (¡la anon, NO la service_role!)
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbnN2b2FkbmhjaHpwc3VxZHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTM3MTcsImV4cCI6MjA5NjQyOTcxN30._4Oxc1CJPXgeWIYRVJhuhmE0NfG9xkFB3ZUAm4DFYis"
};

// Carga del SDK de Supabase desde CDN y exposición de helpers.
(function () {
  function boot() {
    const { createClient } = window.supabase;
    const sb = createClient(window.MAGIC_CONFIG.SUPABASE_URL, window.MAGIC_CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    window.sb = sb;

    const MagicAuth = {
      // Registro: crea usuario (rol cliente por defecto vía trigger)
      async registrar(email, password, nombre) {
        const { data, error } = await sb.auth.signUp({
          email, password, options: { data: { nombre } }
        });
        if (error) {
          // Los errores de Supabase a veces no exponen .message al convertir a texto.
          const msg = error.message || error.error_description || error.msg
            || (error.status ? ('Error '+error.status) : '')
            || (typeof error==='object' ? JSON.stringify(error) : String(error))
            || 'Error desconocido al registrar';
          const e = new Error(msg); e.original = error; e.status = error.status; throw e;
        }
        return data;
      },
      async entrar(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },
      async salir() { await sb.auth.signOut(); },
      async sesion() { const { data } = await sb.auth.getSession(); return data.session; },
      async usuario() {
        // getSession lee de memoria/localStorage (sin viaje de red); getUser sí va al servidor.
        const { data: ses } = await sb.auth.getSession();
        if (ses && ses.session && ses.session.user) return ses.session.user;
        const { data } = await sb.auth.getUser();
        return data.user;
      },
      // Perfil (incluye rol)
      async perfil(forzar) {
        const u = await this.usuario();
        if (!u) return null;
        // Cache en memoria durante la sesión: evita pedir el perfil varias veces
        if (!forzar && this._perfilCache && this._perfilCache.id === u.id) return this._perfilCache;
        const { data, error } = await sb.from('perfiles').select('*').eq('id', u.id).single();
        const perfil = error ? { id: u.id, email: u.email, rol: 'cliente' } : data;
        this._perfilCache = perfil;
        return perfil;
      },
      // Exige sesión; si no hay, redirige a login
      async requiereSesion(loginUrl) {
        const s = await this.sesion();
        if (!s) { window.location.href = loginUrl || 'login.html'; return null; }
        return s;
      },
      // Cambiar el nombre del perfil
      async actualizarNombre(nombre) {
        const u = await this.usuario();
        if (!u) throw new Error('Sin sesión');
        const { error } = await sb.from('perfiles').update({ nombre }).eq('id', u.id);
        if (error) throw error;
        if (this._perfilCache) this._perfilCache.nombre = nombre;
      },
      // Cambiar la contraseña del usuario autenticado
      async cambiarPassword(nueva) {
        const { error } = await sb.auth.updateUser({ password: nueva });
        if (error) throw error;
      },
      // Devuelve el HTML de la credencial (badge) del tier de membresía, o '' si no tiene
      tierBadge(tier) {
        const t = (tier || '').toLowerCase();
        const nombres = { basic: 'Basic', pro: 'Pro', ultra: 'Ultra' };
        if (!nombres[t]) return '';
        return '<span class="tier-cred tier-cred-' + t + '"><span class="tc-dot"></span>' + nombres[t] + '</span>';
      },
      // Inyecta el CSS de la credencial una sola vez
      ensureTierCSS() {
        if (document.getElementById('tier-cred-css')) return;
        const s = document.createElement('style'); s.id = 'tier-cred-css';
        s.textContent = '.tier-cred{display:inline-flex;align-items:center;gap:6px;font-family:ui-monospace,Menlo,monospace;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border-radius:999px;margin-left:8px;border:1px solid;vertical-align:middle}.tier-cred .tc-dot{width:6px;height:6px;border-radius:50%;background:currentColor}.tier-cred-basic{color:#5b9bd5;border-color:#5b9bd5;background:rgba(91,155,213,.12)}.tier-cred-pro{color:#d4b06a;border-color:#d4b06a;background:rgba(212,176,106,.12)}.tier-cred-ultra{color:#c9ccd2;border-color:#c9ccd2;background:rgba(201,204,210,.12)}';
        document.head.appendChild(s);
      }
    };
    window.MagicAuth = MagicAuth;
    document.dispatchEvent(new Event('magic-ready'));
  }

  if (window.supabase && window.supabase.createClient) {
    boot();
  } else {
    // 1º intentamos el SDK alojado en nuestra propia web (no depende de CDN externos)
    const local = document.createElement('script');
    local.src = 'assets/supabase.min.js?v=28';
    local.onload = function () {
      if (window.supabase && window.supabase.createClient) { boot(); }
      else { cargarCDN(); }
    };
    local.onerror = cargarCDN;
    document.head.appendChild(local);
  }

  function cargarCDN() {
    if (window.supabase && window.supabase.createClient) { boot(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = boot;
    s.onerror = function () {
      console.error('[MAGIC] No se pudo cargar el SDK de Supabase (ni local ni CDN).');
      alert('No se pudo cargar un componente necesario. Revisa tu conexión o si alguna extensión del navegador está bloqueando la carga, y recarga la página.');
    };
    document.head.appendChild(s);
  }
})();
