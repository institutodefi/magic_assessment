// netlify/functions/respuesta-guardar.js
// Guarda (upsert) la puntuación y justificación de una pregunta.
const { supabase, json, preflight, checkAccess } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'JSON inválido' }); }

  const { evaluacionId, accessCode, preguntaCod, bloque, puntuacion, justificacion } = body;

  const evalRow = await checkAccess(evaluacionId, accessCode);
  if (!evalRow) return json(403, { error: 'Acceso no autorizado' });

  if (!preguntaCod) return json(400, { error: 'Falta preguntaCod' });
  if (puntuacion != null && ![0,20,40,60,80,100].includes(puntuacion))
    return json(400, { error: 'Puntuación fuera de escala' });

  const { error } = await supabase
    .from('respuestas')
    .upsert({
      evaluacion_id: evaluacionId,
      pregunta_cod: preguntaCod,
      bloque: bloque || null,
      puntuacion: puntuacion ?? null,
      justificacion: justificacion ?? null,
      actualizado_en: new Date().toISOString(),
    }, { onConflict: 'evaluacion_id,pregunta_cod' });

  if (error) return json(500, { error: error.message });

  // refresca timestamp de la evaluación
  await supabase.from('evaluaciones')
    .update({ actualizado_en: new Date().toISOString() })
    .eq('id', evaluacionId);

  return json(200, { ok: true });
};
