/* ============================================================
   MAGIC® · Modal de contacto compartido (formulario Brevo)
   ------------------------------------------------------------
   Un solo lugar para el formulario de "Solicitar información".

   CÓMO USARLO en cualquier página:
   1. Incluye este script antes de </body>:
        <script src="assets/contact-modal.js" defer></script>
   2. Marca cualquier botón o enlace con  data-contact
        <button data-contact>Solicitar información</button>
        <a href="#" data-contact>Solicitar información</a>
      Al pulsarlo se abre el formulario, sin salir de la página.

   PARA CAMBIAR EL FORMULARIO: edita solo BREVO_FORM_URL aquí abajo.
   ============================================================ */
(function () {
  "use strict";

  // ── ÚNICO punto donde se define la URL del formulario de Brevo ──
  var BREVO_FORM_URL = "https://ef9c3283.sibforms.com/serve/MUIFAL-iFAdelAO9q7dPPEboGB8NLmcMALxR-v-IXId8iA678TxvTAckc9hdtyviMFEleodVPHjKu4zZkVtRIvQAoQ4YAcyH_eYR21IQcSgdDTzX8SXsc78KBcstDDF-ZX51hZxu51N_vw1lM80Ev-_ZgViLgsoWPhXPyjwHQL0BUcm3GWoLqw02pljGpI30EgOPUnlM6XJhoYk9Qw==";

  var CONTACT_EMAIL = "hola@institutoexcelencia.com";

  // Evita doble inicialización si el script se incluye dos veces
  if (window.__magicContactModal) return;
  window.__magicContactModal = true;

  // ── Estilos del modal (autocontenidos) ──
  var css = [
    ".cm-modal{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px}",
    ".cm-modal[hidden]{display:none}",
    ".cm-backdrop{position:absolute;inset:0;background:rgba(6,8,12,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .3s}",
    ".cm-modal.show .cm-backdrop{opacity:1}",
    ".cm-box{position:relative;z-index:1;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;background:#11141b;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:48px 48px 44px;box-shadow:0 40px 100px rgba(0,0,0,.6);transform:translateY(24px) scale(.98);opacity:0;transition:transform .4s cubic-bezier(.5,0,.2,1),opacity .35s;font-family:'Manrope',system-ui,sans-serif}",
    ".cm-modal.show .cm-box{transform:none;opacity:1}",
    "@media (max-width:560px){.cm-box{padding:40px 24px 32px}.cm-modal{padding:14px}}",
    ".cm-close{position:absolute;top:20px;right:20px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid rgba(255,255,255,.08);border-radius:50%;color:#a8aebb;cursor:pointer;transition:all .25s}",
    "html[dir='rtl'] .cm-close{right:auto;left:20px}",
    ".cm-close:hover{border-color:#d4b06a;color:#d4b06a;transform:rotate(90deg)}",
    ".cm-title{font-weight:600;font-size:28px;letter-spacing:-.01em;margin:0 0 10px;padding-right:40px;color:#e9ecf2}",
    "html[dir='rtl'] .cm-title{padding-right:0;padding-left:40px}",
    ".cm-sub{font-size:14px;color:#a8aebb;line-height:1.6;margin:0 0 28px}",
    ".cm-box iframe{border:0;width:100%;display:block;border-radius:6px;background:#fff;min-height:520px}",
    ".cm-placeholder{border:1px dashed rgba(255,255,255,.18);border-radius:6px;padding:44px 28px;text-align:center;color:#6c7280;display:flex;flex-direction:column;align-items:center}",
    ".cm-placeholder p{font-size:14px;line-height:1.6;margin:0 0 18px;max-width:340px}",
    ".cm-placeholder a{color:#d4b06a;font-family:'Manrope',ui-monospace,monospace;font-size:13px;letter-spacing:.06em;text-decoration:none}",
    ".cm-placeholder a:hover{text-decoration:underline}"
  ].join("");

  var styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Markup del modal ──
  var configured = BREVO_FORM_URL && /^https?:\/\//i.test(BREVO_FORM_URL) && BREVO_FORM_URL.indexOf("BREVO_FORM_URL") === -1;

  var modal = document.createElement("div");
  modal.className = "cm-modal";
  modal.id = "cmModal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "cmTitle");
  modal.hidden = true;
  modal.innerHTML =
    '<div class="cm-backdrop" data-cm-close></div>' +
    '<div class="cm-box" role="document">' +
      '<button class="cm-close" data-cm-close aria-label="Cerrar">' +
        '<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 1L17 17M17 1L1 17" stroke="currentColor" stroke-width="1.6"/></svg>' +
      '</button>' +
      '<h3 id="cmTitle" class="cm-title">Solicita información</h3>' +
      '<p class="cm-sub">Déjanos tus datos y te contaremos cómo aplicar el Modelo MAGIC® en tu organización.</p>' +
      (configured
        ? '<iframe src="' + BREVO_FORM_URL + '" title="Formulario de contacto MAGIC®" width="100%" height="560" frameborder="0" scrolling="auto" allowfullscreen></iframe>'
        : '<div class="cm-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" style="opacity:.5;margin-bottom:18px"><path d="M3 5h18v14H3z" stroke="currentColor" stroke-width="1.4"/><path d="M3 7l9 6 9-6" stroke="currentColor" stroke-width="1.4"/></svg>' +
          '<p>El formulario se mostrará aquí. Mientras tanto, puedes escribirnos directamente:</p>' +
          '<a href="mailto:' + CONTACT_EMAIL + '">' + CONTACT_EMAIL + '</a></div>') +
    '</div>';

  function init() {
    document.body.appendChild(modal);

    var closers = modal.querySelectorAll("[data-cm-close]");
    var lastFocused = null;

    function open(e) {
      if (e) e.preventDefault();
      lastFocused = document.activeElement;
      modal.hidden = false;
      void modal.offsetWidth;
      modal.classList.add("show");
      document.body.style.overflow = "hidden";
      var c = modal.querySelector(".cm-close");
      if (c) c.focus();
    }
    function close() {
      modal.classList.remove("show");
      document.body.style.overflow = "";
      setTimeout(function () { modal.hidden = true; }, 380);
      if (lastFocused) lastFocused.focus();
    }

    // Engancha TODOS los disparadores: data-contact y el botón histórico #openFormBtn
    var triggers = document.querySelectorAll("[data-contact], #openFormBtn");
    Array.prototype.forEach.call(triggers, function (t) {
      t.addEventListener("click", open);
    });

    Array.prototype.forEach.call(closers, function (c) {
      c.addEventListener("click", close);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) close();
    });

    // expone por si se quiere abrir desde otro script
    window.openContactModal = open;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
