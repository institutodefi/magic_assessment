/* ============================================================
   MAGIC® · Pantalla de aceptación RGPD + Disclaimer (1ª vez)
   ------------------------------------------------------------
   Muestra un modal a pantalla completa la PRIMERA vez que un
   usuario entra (cuando perfiles.terminos_aceptados = false).
   Al aceptar, lo registra en su perfil y no vuelve a aparecer.

   Uso: incluir DESPUÉS de magic-auth.js y magic-data.js, y llamar
        await MagicTerminos.exigir(perfil);
   Devuelve true si ya están aceptados o se aceptan; si el usuario
   cancela, cierra sesión.
   ============================================================ */
window.MagicTerminos = (function () {
  function inyectarEstilos() {
    if (document.getElementById('mt-styles')) return;
    const css = `
    .mt-overlay{position:fixed;inset:0;z-index:2000;background:rgba(6,8,12,.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;font-family:"Manrope",system-ui,sans-serif}
    .mt-box{width:100%;max-width:600px;max-height:90vh;overflow-y:auto;background:#11141b;border:1px solid rgba(255,255,255,.14);border-radius:10px;padding:40px 38px}
    @media(max-width:560px){.mt-box{padding:30px 22px}}
    .mt-box h2{color:#e9ecf2;font-size:22px;font-weight:600;letter-spacing:-.02em;margin:0 0 6px}
    .mt-sub{color:#8a90a0;font-family:ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:22px}
    .mt-section{border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:16px 18px;margin-bottom:14px;background:#0b0d12}
    .mt-section h3{color:#d4b06a;font-size:12px;font-family:ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;margin:0 0 8px}
    .mt-section p{color:#a8aebb;font-size:13px;line-height:1.6;margin:0 0 8px}
    .mt-section p:last-child{margin-bottom:0}
    .mt-check{display:flex;gap:11px;align-items:flex-start;margin:16px 0;cursor:pointer}
    .mt-check input{margin-top:3px;width:18px;height:18px;accent-color:#d4b06a;flex:none;cursor:pointer}
    .mt-check label{color:#e9ecf2;font-size:13.5px;line-height:1.5;cursor:pointer}
    .mt-actions{display:flex;gap:12px;margin-top:22px;flex-wrap:wrap}
    .mt-btn{flex:1;min-width:140px;border:0;border-radius:999px;padding:14px;font-family:ui-monospace,monospace;font-weight:700;font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;transition:.2s}
    .mt-accept{background:#d4b06a;color:#1a1407}.mt-accept:hover:not(:disabled){background:#e0c184}
    .mt-accept:disabled{opacity:.4;cursor:not-allowed}
    .mt-decline{background:transparent;color:#a8aebb;border:1px solid rgba(255,255,255,.18)}
    .mt-decline:hover{border-color:#e0564f;color:#e0564f}
    .mt-link{color:#d4b06a}`;
    const s = document.createElement('style'); s.id = 'mt-styles'; s.textContent = css;
    document.head.appendChild(s);
  }

  function exigir(perfil) {
    return new Promise((resolve) => {
      if (perfil && perfil.terminos_aceptados) { resolve(true); return; }
      inyectarEstilos();
      const ov = document.createElement('div');
      ov.className = 'mt-overlay';
      ov.innerHTML = `
        <div class="mt-box" role="dialog" aria-modal="true" aria-labelledby="mt-title">
          <h2 id="mt-title">Antes de empezar</h2>
          <div class="mt-sub">Condiciones de uso · Protección de datos</div>

          <div class="mt-section">
            <h3>Protección de datos (RGPD)</h3>
            <p>El Instituto de Excelencia Europea (IEE), CIF B87093076, tratará los datos que introduzcas en esta herramienta con la finalidad de gestionar la autoevaluación y, en su caso, la auditoría del Modelo MAGIC®.</p>
            <p>La base de legitimación es tu consentimiento y la ejecución de la relación de evaluación. Los datos no se cederán a terceros salvo obligación legal. Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <a class="mt-link" href="mailto:lopd@institutoexcelencia.com">lopd@institutoexcelencia.com</a>. Más información en el <a class="mt-link" href="aviso-legal.html" target="_blank" rel="noopener">aviso legal</a>.</p>
          </div>

          <div class="mt-section">
            <h3>Disclaimer de responsabilidad</h3>
            <p>Los resultados de esta autoevaluación tienen carácter orientativo y de diagnóstico. No constituyen una certificación ni garantizan un resultado en un proceso de certificación posterior.</p>
            <p>La organización es responsable de la veracidad y exactitud de la información y las evidencias que aporta. El IEE no se responsabiliza de las decisiones que se tomen basándose en los resultados de esta herramienta.</p>
          </div>

          <div class="mt-section">
            <h3>Propiedad intelectual</h3>
            <p>El Modelo MAGIC® es un modelo de excelencia y transformación diseñado por el Instituto de Excelencia Europea y cuya propiedad intelectual le pertenece en exclusiva. Todos los derechos reservados. Queda prohibida su reproducción, distribución o uso no autorizado.</p>
          </div>

          <div class="mt-check">
            <input type="checkbox" id="mt-cb">
            <label for="mt-cb">He leído y acepto la política de protección de datos (RGPD) y el disclaimer de responsabilidad del Modelo MAGIC®.</label>
          </div>

          <div class="mt-actions">
            <button class="mt-btn mt-decline" id="mt-decline">No acepto</button>
            <button class="mt-btn mt-accept" id="mt-accept" disabled>Aceptar y continuar</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      document.body.style.overflow = 'hidden';

      const cb = ov.querySelector('#mt-cb');
      const acc = ov.querySelector('#mt-accept');
      const dec = ov.querySelector('#mt-decline');
      cb.addEventListener('change', () => { acc.disabled = !cb.checked; });
      acc.addEventListener('click', async () => {
        acc.disabled = true; acc.textContent = 'Guardando…';
        try { await MagicData.aceptarTerminos(); } catch (e) { /* si falla el guardado, igualmente dejamos pasar la sesión */ }
        ov.remove(); document.body.style.overflow = '';
        resolve(true);
      });
      dec.addEventListener('click', async () => {
        ov.remove(); document.body.style.overflow = '';
        try { await MagicAuth.salir(); } catch (e) {}
        window.location.href = 'login.html';
        resolve(false);
      });
    });
  }

  return { exigir, exigirConfidencialidad };

  function exigirConfidencialidad(perfil) {
    return new Promise((resolve) => {
      if (perfil && perfil.confidencialidad_aceptada) { resolve(true); return; }
      inyectarEstilos();
      const ov = document.createElement('div');
      ov.className = 'mt-overlay';
      ov.innerHTML = `
        <div class="mt-box" role="dialog" aria-modal="true" aria-labelledby="mc-title">
          <h2 id="mc-title">Compromiso de confidencialidad</h2>
          <div class="mt-sub">Acceso de auditor · MAGIC®</div>

          <div class="mt-section">
            <h3>Deber de confidencialidad</h3>
            <p>Como auditor del Modelo MAGIC®, accederás a información confidencial de las organizaciones evaluadas: datos de empresa, evidencias documentales, resultados y valoraciones.</p>
            <p>Te comprometes a tratar toda esa información con estricta confidencialidad, a usarla únicamente para la finalidad de la evaluación o auditoría, a no divulgarla ni cederla a terceros, y a no conservarla más allá de lo necesario para tu labor.</p>
          </div>

          <div class="mt-section">
            <h3>Protección de datos e imparcialidad</h3>
            <p>Cumplirás la normativa de protección de datos (RGPD) en todo tratamiento de información personal al que accedas, y actuarás con independencia, objetividad e imparcialidad, declarando cualquier conflicto de interés con una organización evaluada.</p>
            <p>El incumplimiento de este compromiso podrá conllevar la retirada del rol de auditor y las responsabilidades legales que correspondan. Más información en el <a class="mt-link" href="aviso-legal.html" target="_blank" rel="noopener">aviso legal</a>.</p>
          </div>

          <div class="mt-section">
            <h3>Propiedad intelectual</h3>
            <p>El Modelo MAGIC® es un modelo de excelencia y transformación diseñado por el Instituto de Excelencia Europea y cuya propiedad intelectual le pertenece en exclusiva. Todos los derechos reservados. Como auditor, te comprometes a no reproducir, divulgar ni utilizar el modelo, sus criterios o metodología fuera del ámbito autorizado.</p>
          </div>

          <div class="mt-check">
            <input type="checkbox" id="mc-cb">
            <label for="mc-cb">He leído y acepto el compromiso de confidencialidad, protección de datos e imparcialidad como auditor del Modelo MAGIC®.</label>
          </div>

          <div class="mt-actions">
            <button class="mt-btn mt-decline" id="mc-decline">No acepto</button>
            <button class="mt-btn mt-accept" id="mc-accept" disabled>Aceptar y continuar</button>
          </div>
        </div>`;
      document.body.appendChild(ov);
      document.body.style.overflow = 'hidden';

      const cb = ov.querySelector('#mc-cb');
      const acc = ov.querySelector('#mc-accept');
      const dec = ov.querySelector('#mc-decline');
      cb.addEventListener('change', () => { acc.disabled = !cb.checked; });
      acc.addEventListener('click', async () => {
        acc.disabled = true; acc.textContent = 'Guardando…';
        try { await MagicData.aceptarConfidencialidad(); } catch (e) {}
        ov.remove(); document.body.style.overflow = '';
        resolve(true);
      });
      dec.addEventListener('click', async () => {
        ov.remove(); document.body.style.overflow = '';
        try { await MagicAuth.salir(); } catch (e) {}
        window.location.href = 'login-auditor.html';
        resolve(false);
      });
    });
  }
})();
