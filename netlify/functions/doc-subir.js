// netlify/functions/doc-subir.js
// Recibe un archivo (base64) y lo sube a Supabase Storage, registrando
// sus metadatos. Para arrancar es la vía más simple y fiable.
// (Si algún día subes ficheros muy grandes, conviene migrar a URLs firmadas.)
const { supabase, BUCKET, json, preflight, checkAccess } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'JSON inválido' }); }

  const { evaluacionId, accessCode, preguntaCod, nombreArchivo, mime, contenidoBase64 } = body;

  const evalRow = await checkAccess(evaluacionId, accessCode);
  if (!evalRow) return json(403, { error: 'Acceso no autorizado' });
  if (!preguntaCod || !nombreArchivo || !contenidoBase64)
    return json(400, { error: 'Faltan datos del archivo' });

  const buffer = Buffer.from(contenidoBase64, 'base64');
  // Límite defensivo: 15 MB
  if (buffer.length > 15 * 1024 * 1024)
    return json(413, { error: 'Archivo demasiado grande (máx. 15 MB)' });

  const safeName = nombreArchivo.replace(/[^\w.\-]/g, '_');
  const storagePath = `${evaluacionId}/${preguntaCod.replace(/\s+/g, '')}/${Date.now()}_${safeName}`;

  const { error: upErr } = await supabase
    .storage.from(BUCKET)
    .upload(storagePath, buffer, { contentType: mime || 'application/octet-stream', upsert: false });
  if (upErr) return json(500, { error: upErr.message });

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      evaluacion_id: evaluacionId,
      pregunta_cod: preguntaCod,
      nombre_archivo: nombreArchivo,
      storage_path: storagePath,
      mime: mime || null,
      tamano_bytes: buffer.length,
    })
    .select('id, pregunta_cod, nombre_archivo, storage_path, mime, tamano_bytes')
    .single();
  if (error) return json(500, { error: error.message });

  const { data: signed } = await supabase
    .storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);

  return json(200, { documento: { ...data, url: signed?.signedUrl || null } });
};
