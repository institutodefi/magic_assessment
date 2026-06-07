// netlify/functions/eval-acceso.js
// Crea una evaluación nueva (organización + código) o abre una existente
// validando el código de acceso. Devuelve el id de la evaluación.
const { supabase, json, preflight } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'JSON inválido' }); }

  const { modo, organizacion, accessCode } = body;
  if (!accessCode) return json(400, { error: 'Falta el código de acceso' });

  // ABRIR evaluación existente
  if (modo === 'abrir') {
    const { data, error } = await supabase
      .from('evaluaciones')
      .select('id, organizacion, criterio')
      .eq('access_code', accessCode)
      .single();
    if (error || !data) return json(404, { error: 'Código no encontrado' });
    return json(200, { evaluacion: data });
  }

  // CREAR evaluación nueva
  if (modo === 'crear') {
    if (!organizacion) return json(400, { error: 'Falta el nombre de la organización' });
    const { data, error } = await supabase
      .from('evaluaciones')
      .insert({ organizacion, criterio: 'C1', access_code: accessCode })
      .select('id, organizacion, criterio')
      .single();
    if (error) {
      if (error.code === '23505') return json(409, { error: 'Ese código ya está en uso' });
      return json(500, { error: error.message });
    }
    return json(200, { evaluacion: data });
  }

  return json(400, { error: 'Modo inválido (usa "crear" o "abrir")' });
};
