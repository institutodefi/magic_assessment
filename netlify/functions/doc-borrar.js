// netlify/functions/doc-borrar.js
// Elimina un documento: borra el objeto de Storage y su fila en la tabla.
const { supabase, BUCKET, json, preflight, checkAccess } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'JSON inválido' }); }

  const { evaluacionId, accessCode, documentoId } = body;
  const evalRow = await checkAccess(evaluacionId, accessCode);
  if (!evalRow) return json(403, { error: 'Acceso no autorizado' });
  if (!documentoId) return json(400, { error: 'Falta documentoId' });

  const { data: doc, error: getErr } = await supabase
    .from('documentos')
    .select('id, storage_path, evaluacion_id')
    .eq('id', documentoId)
    .single();
  if (getErr || !doc || doc.evaluacion_id !== evaluacionId)
    return json(404, { error: 'Documento no encontrado' });

  await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  await supabase.from('documentos').delete().eq('id', documentoId);

  return json(200, { ok: true });
};
