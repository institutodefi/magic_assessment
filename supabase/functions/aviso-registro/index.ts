// ============================================================
//  MAGIC® · Edge Function "aviso-registro"
//  Envía un correo a alejandro@tuconsultor.com cuando se registra
//  un cliente nuevo, con un enlace para aprobar la cuenta.
//
//  Se dispara mediante un Webhook de Supabase Auth (ver pasos).
//  Variables de entorno (Secrets) que debes configurar en Supabase:
//    BREVO_API_KEY     -> tu clave API de Brevo
//    ADMIN_EMAIL       -> alejandro@tuconsultor.com
//    SITE_URL          -> https://TU-SITIO.netlify.app
//    SUPABASE_URL      -> (lo provee Supabase automáticamente)
//    SUPABASE_SERVICE_ROLE_KEY -> (lo provee Supabase automáticamente)
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // El webhook de "user created" trae el usuario en distintas formas; cubrimos las comunes.
    const user = payload.record || payload.user || payload;
    const email = user?.email || "(desconocido)";
    const nombre = user?.raw_user_meta_data?.nombre || user?.user_metadata?.nombre || email;
    const userId = user?.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Recuperamos el token de aprobación generado por el trigger handle_new_user
    let token = "";
    if (userId) {
      const { data } = await supabase.from("perfiles").select("token_aprob,rol").eq("id", userId).single();
      // Solo avisamos de CLIENTES (los auditores entran por código)
      if (data?.rol && data.rol !== "cliente") {
        return new Response("rol no-cliente, sin aviso", { status: 200 });
      }
      token = data?.token_aprob || "";
    }

    const siteUrl = Deno.env.get("SITE_URL") || "";
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "alejandro@tuconsultor.com";
    const enlaceAprob = `${siteUrl}/aprobar.html?token=${encodeURIComponent(token)}`;

    const html = `
      <div style="font-family:Arial,sans-serif;color:#16181d;max-width:520px;margin:auto">
        <h2 style="color:#0b0d12">Nuevo registro en MAGIC®</h2>
        <p>Se ha registrado un nuevo usuario y está <b>pendiente de tu aprobación</b>:</p>
        <table style="font-size:14px;margin:14px 0">
          <tr><td style="color:#666;padding:2px 10px 2px 0">Nombre:</td><td>${nombre}</td></tr>
          <tr><td style="color:#666;padding:2px 10px 2px 0">Email:</td><td>${email}</td></tr>
        </table>
        <p>
          <a href="${enlaceAprob}" style="display:inline-block;background:#d4b06a;color:#1a1407;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">
            Aprobar este usuario
          </a>
        </p>
        <p style="color:#888;font-size:12px">Si no reconoces este registro, ignora este correo: el usuario no podrá usar la herramienta hasta que lo apruebes.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="color:#aaa;font-size:11px">INSTITUTO DE EXCELENCIA EUROPEA · Modelo MAGIC®</p>
      </div>`;

    // Envío vía Brevo (API transaccional)
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": Deno.env.get("BREVO_API_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "MAGIC®", email: adminEmail },
        to: [{ email: adminEmail }],
        subject: `MAGIC® · Nuevo registro pendiente: ${email}`,
        htmlContent: html,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return new Response("Error Brevo: " + t, { status: 500 });
    }
    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response("Error: " + (e as Error).message, { status: 500 });
  }
});
