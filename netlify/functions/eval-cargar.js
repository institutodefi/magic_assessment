// netlify/functions/eval-cargar.js
// Devuelve el modelo C1 + respuestas guardadas + documentos de una evaluación.
const fs = require('fs');
const path = require('path');
const { supabase, BUCKET, json, preflight, checkAccess } = require('./_supabase');

const MODELO = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'c1-data.json'), 'utf8')
);

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();

  const evaluacionId = event.queryStringParameters?.id;
  const accessCode = event.queryStringParameters?.code;

  const evalRow = await checkAccess(evaluacionId, accessCode);
  if (!evalRow) return json(403, { error: 'Acceso no autorizado' });

  const { data: respuestas } = await supabase
    .from('respuestas')
    .select('pregunta_cod, bloque, puntuacion, justificacion')
    .eq('evaluacion_id', evaluacionId);

  const { data: documentos } = await supabase
    .from('documentos')
    .select('id, pregunta_cod, nombre_archivo, storage_path, mime, tamano_bytes')
    .eq('evaluacion_id', evaluacionId);

  // Firmamos URLs temporales para descargar/ver cada documento.
  const docsConUrl = [];
  for (const d of documentos || []) {
    const { data: signed } = await supabase
      .storage.from(BUCKET)
      .createSignedUrl(d.storage_path, 60 * 60); // 1 hora
    docsConUrl.push({ ...d, url: signed?.signedUrl || null });
  }

  return json(200, {
    evaluacion: { id: evalRow.id, organizacion: evalRow.organizacion, criterio: evalRow.criterio },
    modelo: MODELO,
    respuestas: respuestas || [],
    documentos: docsConUrl,
  });
};
