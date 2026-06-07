# Web del Modelo MAGIC — Despliegue en Netlify

Web estática informativa del **Modelo MAGIC** (Modelo Avanzado de Gestión,
Innovación y Cambio), del Instituto de Excelencia Europea.
Trilingüe (español · inglés · árabe con RTL).

---

## Opción A — Arrastrar y soltar (la más rápida, 1 minuto)

1. Entra en **https://app.netlify.com/drop**
2. Arrastra **la carpeta descomprimida completa** (no los archivos sueltos)
   sobre la zona de subida.
3. Netlify te dará una URL del tipo `https://nombre-aleatorio.netlify.app`.
4. Listo. Para cambiar el nombre o poner tu dominio, ve a
   *Site settings → Domain management*.

> Importante: arrastra la **carpeta**, así Netlify mantiene la estructura
> (`index.html`, `aviso-legal.html` y la carpeta `assets/` con los logos).

---

## Opción B — Con cuenta Netlify + Git (recomendada para actualizar fácil)

1. Sube esta carpeta a un repositorio de GitHub/GitLab.
2. En Netlify: *Add new site → Import an existing project*.
3. Selecciona el repositorio.
4. Build command: **(déjalo vacío)**
5. Publish directory: **`.`**
6. Deploy.

Cada vez que hagas `git push`, Netlify actualizará la web sola.

---

## ANTES DE PUBLICAR — pendiente importante

El botón **"Solicitar información"** abre una ventana (modal) que, de momento,
muestra un texto provisional y el email de contacto.

Para conectar tu **formulario de Brevo** (es muy sencillo, 1 línea):

1. En Brevo, ve a: **Contactos → Formularios →** (tu formulario)
   **→ "Compartir y publicar" → pestaña "Insertar"**.
2. En el código que te muestra Brevo, copia **solo la URL** del
   atributo `src` del iframe (algo como
   `https://sibforms.com/serve/MUIF...`).
3. Abre `index.html`, busca el texto:

       BREVO_FORM_URL

   (está dentro del `<iframe id="brevoFrame" ...>`).
4. Sustituye `BREVO_FORM_URL` por la URL que copiaste, dejando las
   comillas. Ejemplo:

       src="https://sibforms.com/serve/MUIFxxxxxxxxxxxx"

Y ya está. El formulario aparecerá automáticamente dentro de la ventana
y el mensaje provisional desaparecerá solo. No hay que tocar nada más.

> Si nunca pones la URL, no pasa nada: el modal seguirá mostrando el
> mensaje con el email de contacto como alternativa.

El resto (email, aviso legal, cookies, sección del Instituto) ya está listo.

---

## Qué incluye este paquete

| Archivo            | Para qué sirve                                          |
|--------------------|---------------------------------------------------------|
| `index.html`       | La web principal (ES / EN / AR, menú, cookies)          |
| `aviso-legal.html` | Aviso legal completo importado del IEE                  |
| `assets/`          | Logos MAGIC e IEE                                       |
| `netlify.toml`     | Cabeceras de seguridad, caché y redirecciones amigables |
| `_redirects`       | Reglas de redirección (respaldo de netlify.toml)        |
| `robots.txt`       | Indexación para buscadores                              |
| `sitemap.xml`      | Mapa del sitio para SEO                                 |

### Tras conectar tu dominio definitivo

Edita estas líneas con tu dominio real:

- `robots.txt` → línea `Sitemap:`
- `sitemap.xml` → las dos etiquetas `<loc>`

---

Desde España con amor · 2014

---

## NUEVO — Autoevaluación con backend (Supabase + Funciones)

La página **Soy MAGIC®** incluye ahora un acceso real a la **Autoevaluación
del Criterio 1** (`evaluar.html`). Esta herramienta sí necesita backend para
guardar respuestas, justificaciones y documentos. Funciona con **Netlify
Functions + Supabase**.

> Mientras no configures el backend, la web sigue funcionando perfectamente;
> solo la herramienta de autoevaluación dará error al crear/abrir una evaluación.

### Pasos (resumen)
1. **Supabase**: crea un proyecto en https://supabase.com
2. En **SQL Editor**, ejecuta el contenido de `schema.sql` (crea tablas + bucket).
3. En **Project Settings → API**, copia *Project URL* y *service_role key*.
4. **Netlify → Site settings → Environment variables**, añade:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Vuelve a desplegar (Deploys → Trigger deploy).
6. Entra en `tusitio.netlify.app/evaluar`, pulsa **Nueva evaluación**, crea un
   código (p. ej. `IEE-C1-001`) y empieza.

La guía detallada paso a paso está en **GUIA_STACK_MAGIC.pdf**.

> Nota: al añadir funciones, el `package.json` y la carpeta `netlify/functions/`
> deben viajar con el sitio. Si despliegas por arrastre, sube la **carpeta
> completa**. Netlify instalará `@supabase/supabase-js` automáticamente.
