/* ============================================================
   MAGIC® · Capa de datos (navegador, vía Supabase SDK + RLS)
   Requiere que magic-auth.js se haya cargado (window.sb).
   ============================================================ */
window.MagicData = {
  // ---- Evaluaciones ----
  async misEvaluaciones() {
    const { data, error } = await sb.from('evaluaciones')
      .select('*').order('creado_en', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async crearEvaluacion(organizacion) {
    const u = await MagicAuth.usuario();
    const { data, error } = await sb.from('evaluaciones')
      .insert({ organizacion, propietario_id: u.id })
      .select('*').single();
    if (error) throw error;
    return data;
  },
  async getEvaluacion(id) {
    const { data, error } = await sb.from('evaluaciones').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // ---- Datos de cliente + sedes ----
  async getClienteDatos(eid) {
    const { data } = await sb.from('cliente_datos').select('*').eq('evaluacion_id', eid).maybeSingle();
    return data || null;
  },
  async guardarClienteDatos(eid, d) {
    const { error } = await sb.from('cliente_datos')
      .upsert({ evaluacion_id: eid, razon_social: d.razon_social, cif: d.cif, alcance: d.alcance, actualizado_en: new Date().toISOString() }, { onConflict: 'evaluacion_id' });
    if (error) throw error;
  },
  async getSedes(eid) {
    const { data } = await sb.from('sedes').select('*').eq('evaluacion_id', eid).order('orden');
    return data || [];
  },
  async crearSede(eid, sede) {
    const { data, error } = await sb.from('sedes')
      .insert({ evaluacion_id: eid, nombre: sede.nombre, direccion: sede.direccion, trabajadores: sede.trabajadores, orden: sede.orden || 0 })
      .select('*').single();
    if (error) throw error;
    return data;
  },
  async actualizarSede(id, sede) {
    const { error } = await sb.from('sedes').update({ nombre: sede.nombre, direccion: sede.direccion, trabajadores: sede.trabajadores }).eq('id', id);
    if (error) throw error;
  },
  async borrarSede(id) {
    const { error } = await sb.from('sedes').delete().eq('id', id);
    if (error) throw error;
  },

  // ---- Respuestas ----
  async getRespuestas(eid) {
    const { data } = await sb.from('respuestas').select('pregunta_cod,bloque,puntuacion,justificacion').eq('evaluacion_id', eid);
    return data || [];
  },
  async guardarRespuesta(eid, r) {
    const { error } = await sb.from('respuestas')
      .upsert({ evaluacion_id: eid, pregunta_cod: r.pregunta_cod, bloque: r.bloque, puntuacion: r.puntuacion, justificacion: r.justificacion, actualizado_en: new Date().toISOString() }, { onConflict: 'evaluacion_id,pregunta_cod' });
    if (error) throw error;
  },

  // ---- Evaluación del auditor por criterio ----
  async getAuditorCriterios(eid) {
    const { data } = await sb.from('auditor_criterio').select('*').eq('evaluacion_id', eid);
    return data || [];
  },
  async guardarAuditorCriterio(eid, criterio, d) {
    const u = await MagicAuth.usuario();
    const { error } = await sb.from('auditor_criterio')
      .upsert({ evaluacion_id: eid, criterio, puntos_fuertes: d.puntos_fuertes, areas_mejora: d.areas_mejora, auditor_id: u.id, actualizado_en: new Date().toISOString() }, { onConflict: 'evaluacion_id,criterio' });
    if (error) throw error;
  },

  // ---- Documentos (Storage) ----
  async getDocumentos(eid) {
    const { data } = await sb.from('documentos').select('*').eq('evaluacion_id', eid);
    const out = [];
    for (const d of (data || [])) {
      const { data: signed } = await sb.storage.from('evidencias').createSignedUrl(d.storage_path, 3600);
      out.push({ ...d, url: signed?.signedUrl || null });
    }
    return out;
  },
  async subirDocumento(eid, preguntaCod, file) {
    const safe = file.name.replace(/[^\w.\-]/g, '_');
    const path = `${eid}/${preguntaCod.replace(/\s+/g, '')}/${Date.now()}_${safe}`;
    const { error: upErr } = await sb.storage.from('evidencias').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) throw upErr;
    const { data, error } = await sb.from('documentos')
      .insert({ evaluacion_id: eid, pregunta_cod: preguntaCod, nombre_archivo: file.name, storage_path: path, mime: file.type, tamano_bytes: file.size })
      .select('*').single();
    if (error) throw error;
    const { data: signed } = await sb.storage.from('evidencias').createSignedUrl(path, 3600);
    return { ...data, url: signed?.signedUrl || null };
  },
  async borrarDocumento(doc) {
    await sb.storage.from('evidencias').remove([doc.storage_path]);
    await sb.from('documentos').delete().eq('id', doc.id);
  },
  // Descarga el binario de un documento (para el ZIP)
  async descargarBlob(storage_path) {
    const { data, error } = await sb.storage.from('evidencias').download(storage_path);
    if (error) throw error;
    return data; // Blob
  }
};
