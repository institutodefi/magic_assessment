// netlify/functions/_supabase.js
// Cliente Supabase compartido (lado servidor) + utilidades comunes.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('[MAGIC] Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
}

const supabase = createClient(SUPABASE_URL || '', SERVICE_KEY || '', {
  auth: { persistSession: false },
});

const BUCKET = 'evidencias';

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  },
  body: JSON.stringify(body),
});

const preflight = () => ({
  statusCode: 204,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  },
  body: '',
});

// Verifica que el código de acceso corresponde a la evaluación dada.
async function checkAccess(evaluacionId, accessCode) {
  if (!evaluacionId || !accessCode) return null;
  const { data, error } = await supabase
    .from('evaluaciones')
    .select('id, organizacion, criterio, access_code')
    .eq('id', evaluacionId)
    .single();
  if (error || !data) return null;
  if (data.access_code !== accessCode) return null;
  return data;
}

module.exports = { supabase, BUCKET, json, preflight, checkAccess };
