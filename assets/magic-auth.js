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
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbnN2b2FkbmhjaHpwc3VxZHFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDg1MzcxNywiZXhwIjoyMDk2NDI5NzE3fQ.SdBkRkPAvdjwR6QmAR3fDzfN6Mb86E30ugc27bjZKDA"
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
        if (error) throw error;
        return data;
      },
      async entrar(email, password) {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
      },
      async salir() { await sb.auth.signOut(); },
      async sesion() { const { data } = await sb.auth.getSession(); return data.session; },
      async usuario() { const { data } = await sb.auth.getUser(); return data.user; },
      // Perfil (incluye rol)
      async perfil() {
        const u = await this.usuario();
        if (!u) return null;
        const { data, error } = await sb.from('perfiles').select('*').eq('id', u.id).single();
        if (error) return { id: u.id, email: u.email, rol: 'cliente' };
        return data;
      },
      // Exige sesión; si no hay, redirige a login
      async requiereSesion(loginUrl) {
        const s = await this.sesion();
        if (!s) { window.location.href = loginUrl || 'login.html'; return null; }
        return s;
      }
    };
    window.MagicAuth = MagicAuth;
    document.dispatchEvent(new Event('magic-ready'));
  }

  if (window.supabase && window.supabase.createClient) {
    boot();
  } else {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    s.onload = boot;
    s.onerror = function () { console.error('[MAGIC] No se pudo cargar el SDK de Supabase'); };
    document.head.appendChild(s);
  }
})();
