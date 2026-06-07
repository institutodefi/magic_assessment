# Guía del stack completo — MAGIC® Autoevaluación C1

**Modelo Avanzado de Gestión, Innovación y Cambio**
Instituto de Excelencia Europea (IEE)

Esta guía explica, paso a paso, cómo pasar de la **demo** (que funciona sola en el navegador) a la **versión real con backend**, donde las respuestas y la documentación se guardan en la nube y se comparten entre dispositivos.

---

## 1. ¿Qué es cada pieza del stack?

| Pieza | Para qué sirve | Dónde vive |
|---|---|---|
| **Frontend** (`index.html`) | La interfaz: portada de marca, acceso por PIN y cuestionario C1 | Netlify |
| **Netlify Functions** | La "cocina" que guarda y lee datos de forma segura | Netlify (serverless) |
| **Supabase – Postgres** | Base de datos: organizaciones, respuestas, justificaciones | Supabase |
| **Supabase – Storage** | Almacén de los documentos que se suben como evidencia | Supabase |

Idea clave de seguridad: **el navegador nunca habla directamente con la base de datos.** Habla con las Funciones, y son ellas las que usan la clave secreta para acceder a Supabase. Así la clave nunca queda expuesta.

---

## 2. Lo que necesitas antes de empezar

- Una cuenta en **Supabase** (gratis): https://supabase.com
- Una cuenta en **Netlify** (gratis): https://netlify.com
- El proyecto en ZIP que ya tienes (el ZIP del sitio web MAGIC®).
- Opcional pero recomendado: una cuenta de **GitHub** para conectar el repositorio.

No necesitas instalar nada en tu ordenador si despliegas arrastrando la carpeta.

---

## 3. Configurar Supabase (base de datos + almacén)

### 3.1. Crear el proyecto
1. Entra en https://supabase.com y crea un proyecto nuevo.
2. Elige una contraseña para la base de datos y guárdala.
3. Espera 1–2 minutos a que el proyecto se aprovisione.

### 3.2. Crear las tablas y el almacén
1. En el menú lateral, abre **SQL Editor → New query**.
2. Abre el archivo `schema.sql` del proyecto, copia **todo** su contenido y pégalo.
3. Pulsa **Run**. Debe decir *Success*. Esto crea:
   - las tablas `evaluaciones`, `respuestas`, `documentos`
   - el almacén (bucket) `evidencias` para los archivos.

### 3.3. Copiar las dos claves que necesitarás
1. Ve a **Project Settings → API**.
2. Anota estos dos valores (los pondrás en Netlify en el paso 4):
   - **Project URL** → será `SUPABASE_URL`
   - **service_role key** → será `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ La *service_role key* es secreta y todopoderosa. No la pongas nunca en el HTML, ni la compartas, ni la subas a GitHub. Solo va en las variables de entorno de Netlify.

---

## 4. Desplegar en Netlify (frontend + funciones)

Tienes dos formas. La opción A es la más rápida; la B es la más cómoda para actualizar luego.

### Opción A — Arrastrar la carpeta (rápida)
1. Descomprime el ZIP del proyecto.
2. Entra en https://app.netlify.com → **Add new site → Deploy manually**.
3. Arrastra la carpeta del sitio web completa.
4. Netlify detecta el archivo `netlify.toml` y publica la web + las funciones.

### Opción B — Conectar GitHub (recomendada para iterar)
1. Sube el proyecto a un repositorio de GitHub.
2. En Netlify: **Add new site → Import from Git → GitHub** y elige el repo.
3. Deja la configuración por defecto (la lee de `netlify.toml`) y pulsa **Deploy**.

### 4.1. Configurar las variables de entorno
1. En tu sitio de Netlify: **Site settings → Environment variables → Add a variable**.
2. Añade las dos del paso 3.3:
   - `SUPABASE_URL` = la Project URL de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` = la service_role key
3. **Vuelve a desplegar** (Deploys → Trigger deploy → Deploy site) para que las funciones tomen las variables.

---

## 5. Primera prueba real

1. Abre la URL del sitio y entra en **Soy MAGIC® → Comenzar autoevaluación** (o directamente en `https://tu-sitio.netlify.app/evaluar`).
2. En la página de autoevaluación verás la puerta de acceso.
3. Ve a la pestaña **Nueva evaluación**:
   - Organización: *Instituto de Excelencia Europea* (o la que quieras).
   - Código de acceso: por ejemplo `IEE-C1-001`.
   - Pulsa **Crear y empezar**.
4. Responde alguna pregunta, escribe una justificación y sube un documento.
5. Cierra la pestaña y vuelve a entrar con **Abrir evaluación** + el mismo código: tus datos siguen ahí.

Si esto funciona, el stack está completo y operativo.

---

## 6. Comprobar que todo quedó guardado

En Supabase puedes ver los datos directamente:
- **Table Editor → respuestas**: cada fila es una pregunta valorada.
- **Table Editor → documentos**: metadatos de los archivos subidos.
- **Storage → evidencias**: los archivos físicos, organizados por evaluación y pregunta.

---

## 7. Problemas frecuentes (y solución)

| Síntoma | Causa probable | Solución |
|---|---|---|
| "No me va el código" al crear/abrir | Las funciones no encuentran Supabase | Revisa que `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` estén en Netlify y vuelve a desplegar |
| El acceso falla siempre | Olvidaste re-desplegar tras añadir las variables | Deploys → Trigger deploy |
| "Acceso no autorizado" | El código no existe o está mal escrito | Créalo primero en **Nueva evaluación** |
| No se suben los documentos | El bucket no se creó | Vuelve a ejecutar `schema.sql` en Supabase |
| Error 500 en las funciones | service_role key incorrecta | Cópiala de nuevo desde Project Settings → API |

---

## 8. Costes

Para un uso normal de autoevaluaciones, ambos servicios tienen **capa gratuita** suficiente:
- Supabase: 500 MB de base de datos y 1 GB de almacenamiento en el plan free.
- Netlify: 100 GB de ancho de banda y funciones serverless incluidas en el plan free.

Si el volumen crece, ambos escalan con planes de pago sin cambiar la arquitectura.

---

## 9. Siguiente paso: los 7 criterios

Esta versión cubre **C1**. El proyecto tiene los otros 6 criterios en los PDFs. Para añadirlos:
1. Por cada criterio se crea un archivo de modelo (como `c1-data.json`) con sus preguntas y niveles.
2. Se parametriza el criterio en las funciones (un campo más, ya previsto en la tabla `evaluaciones`).
3. La portada gana un selector de criterio.

Cuando quieras, partimos de aquí y montamos el modelo completo.

---

*MAGIC® — Modelo Avanzado de Gestión, Innovación y Cambio*
*Una creación del Instituto de Excelencia Europea (IEE) · Desde España con amor.*
