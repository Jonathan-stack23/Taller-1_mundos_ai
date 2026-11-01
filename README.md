# mundos-ia

Programa de consola que crea **mundos imaginarios** en tres pasos: guarda los datos en un
JSON, le pide a un modelo de lenguaje la descripción de una imagen y genera esa imagen con
un modelo de imágenes.

Este taller integra lo visto en las sesiones 0 a 5 (Node.js del SENA).

## ¿Qué hace el programa?

1. Recibe por parámetros una **situación**, un **mundo** y **5 colores**.
2. Los valida y los guarda en un objeto JSON en `data/mundo_<id>.json`.
3. Vuelve a leer ese JSON y lo envía por `fetch` a un modelo de lenguaje (texto) para que
   escriba la descripción de una imagen del mundo. La guarda en `descripciones/mundo_<id>.txt`.
4. Envía esa descripción a un modelo de imágenes y guarda la imagen en `imagenes/mundo_<id>.jpg`.

```
[Terminal: situación, mundo y 5 colores]
                │  process.argv
                ▼
 data/mundo_<id>.json              (objeto JSON)
                │  se lee el JSON guardado
                ▼
 API de TEXTO  (fetch)  ───►  descripciones/mundo_<id>.txt
                │  se envía la descripción
                ▼
 API de IMAGEN (fetch)  ───►  imagenes/mundo_<id>.jpg
```

## Servicios gratuitos usados

| Paso | Servicio | Modelo | Enlace |
| --- | --- | --- | --- |
| Texto | Groq | `openai/gpt-oss-20b` | https://console.groq.com/keys |
| Imagen | NVIDIA | `black-forest-labs/flux.1-schnell` | https://build.nvidia.com/black-forest-labs/flux-1-schnell |

- Groq: plan gratuito con 30 peticiones por minuto y 1.000 por día.
- NVIDIA: créditos gratuitos limitados; cada imagen gasta créditos.

## Requisitos

- **Node.js 20.12 o superior** (el programa usa `process.loadEnvFile`). Comprueba con `node -v`.
- `npm` y `git`.
- Una cuenta gratuita en Groq y en NVIDIA (o el servicio que elijas).

## Configuración

1. Copia el archivo de ejemplo y crea tu `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Abre el `.env` y pega tus claves reales (el `.env` **no** se sube a Git):

   ```env
   TEXTO_API_KEY=gsk_...tu_clave_de_groq
   TEXTO_URL=https://api.groq.com/openai/v1/chat/completions
   TEXTO_MODELO=openai/gpt-oss-20b
   IMAGEN_API_KEY=nvapi-...tu_clave_de_nvidia
   IMAGEN_URL=https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell
   ```

3. Instala las dependencias:

   ```powershell
   npm install
   ```

| Variable | Para qué sirve |
| --- | --- |
| `TEXTO_API_KEY` | Clave del servicio de texto (Groq). |
| `TEXTO_URL` | URL del endpoint de texto. |
| `TEXTO_MODELO` | Nombre del modelo de texto. |
| `IMAGEN_API_KEY` | Clave del servicio de imágenes (NVIDIA). |
| `IMAGEN_URL` | URL del endpoint de imágenes. |

## Ejemplo de uso

Las comillas son necesarias: sin ellas, cada palabra de la situación o del mundo llegaría
como un argumento distinto.

```powershell
npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta
```

Salida esperada:

```
Paso 1: mundo guardado en data/mundo_3f9a1c2e.json
Paso 2: descripción guardada en descripciones/mundo_3f9a1c2e.txt
Paso 3: imagen guardada en imagenes/mundo_3f9a1c2e.jpg
Listo. Revisa la carpeta imagenes/
```

Si ejecutas **el mismo comando otra vez**, el programa no llama a ninguna API (ahorra la cuota):

```
Paso 1: mundo guardado en data/mundo_3f9a1c2e.json
Paso 2: la descripción ya existía, no se llamó al modelo de texto.
Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.
```

## Estructura de carpetas

```
mundos-ia/
├── src/
│   ├── index.js     # orquesta los pasos 1 a 3
│   ├── mundo.js     # valida los argumentos, crea el objeto y lo guarda o lee (JSON)
│   ├── texto.js     # consulta al modelo de lenguaje (fetch)
│   └── imagen.js    # consulta al modelo de imágenes (fetch) y devuelve los bytes
├── data/            # se crea al ejecutar (JSON de cada mundo)
├── descripciones/   # se crea al ejecutar (.txt de cada descripción)
├── imagenes/        # se crea al ejecutar (.jpg de cada imagen)
├── evidencias/      # capturas de pantalla de las pruebas
├── .env             # tus claves (NO va a Git)
├── .env.example     # plantilla sin claves reales (sí va a Git)
├── .gitignore
├── package.json
├── README.md
└── PROMPT.md
```

## Módulos (src/)

Se eligió **CommonJS** (`require` / `module.exports`) y se usa de forma consistente.

| Módulo | Responsabilidad | Funciones principales |
| --- | --- | --- |
| `index.js` | Orquesta los tres pasos y maneja los errores. | `main()` |
| `mundo.js` | Valida, crea, guarda y lee el mundo. | `crearMundo`, `guardarMundo`, `leerMundo` |
| `texto.js` | Consulta al modelo de lenguaje. | `describirMundo` |
| `imagen.js` | Consulta al modelo de imágenes y devuelve los bytes. | `generarImagen` |

## ¿Cómo se crea el `id`?

El `id` son los **primeros 8 caracteres** del hash (`object-hash`) calculado sobre
`{ situacion, mundo, colores }`. La fecha `creadoEn` **no** entra en el hash: si entrara,
el `id` cambiaría en cada ejecución y nunca podríamos reutilizar el JSON, el `.txt` ni la imagen.
Los mismos datos producen siempre el mismo `id`.

## Manejo de errores

Los errores técnicos se traducen a mensajes claros en español:

| Situación | Cómo se reconoce | Mensaje |
| --- | --- | --- |
| Clave inválida o sin permisos | Estado 401 o 403 | La API key no es válida. Revisa tu archivo .env. |
| Límite de uso | Estado 402 o 429 | Superaste el límite gratuito. Espera un momento. |
| Modelo o URL incorrectos | Estado 404 o 410 | El modelo o la URL no existen. Revisa tu configuración. |
| Sin conexión o URL mal escrita | `fetch` lanza `TypeError` | No se pudo conectar. Revisa tu internet o la URL. |
| Se acabó el tiempo de espera | `error.name === 'TimeoutError'` | El servicio tardó demasiado en responder. |

Si un paso falla, los archivos de los pasos anteriores se conservan y el programa termina
con `process.exitCode = 1`. Al ejecutarlo de nuevo, continúa desde donde quedó.

## Ahorro de cuota

Cada ejecución que llega a las APIs gasta créditos. Por eso el programa:

- Si `descripciones/mundo_<id>.txt` ya existe, **no** llama al modelo de texto.
- Si `imagenes/mundo_<id>.jpg` ya existe, **no** llama al modelo de imágenes.

## Publicación (`npm publish --dry-run`)

Se ejecuta `npm publish --dry-run` para ver **qué archivos se publicarían** sin publicar de verdad.
Con el `.gitignore` en su lugar, el paquete **no** incluye `.env`, `data/`, `descripciones/`
ni `imagenes/`: npm ignora lo que está en el `.gitignore` cuando no existe un `.npmignore`.

### Experimento obligatorio con `.gitignore`

1. Se renombró temporalmente `.gitignore` a `.gitignore.off` y se repitió `npm publish --dry-run`.
2. **Resultado:** esta vez **sí aparece `.env`** en la lista de archivos que se publicarían
   (además de `.gitignore.off`).
3. **¿Por qué es peligroso?** Sin `.gitignore`, npm empaqueta **todo**, incluido el `.env` con
   tus claves reales. Al publicar de verdad, cualquiera podría descargar el paquete y usar tus
   claves, gastando tu cuota o tu dinero. Por eso el `.env` siempre debe estar en `.gitignore`.
4. Después se restauró el nombre del archivo (`.gitignore.off` → `.gitignore`).

Las capturas de ambos resultados están en `evidencias/`.

> **Nota sobre la ruta del proyecto:** la carpeta del taller se llama `Taller#1`, y el carácter
> `#` rompe `npm pack` / `npm publish` (npm interpreta la ruta como una URL y corta en el `#`).
> Para poder ejecutar el `--dry-run` se usó un acceso directo (junction) a una ruta sin `#`:
> `New-Item -ItemType Junction -Path "$env:TEMP\mundos-ia-link" -Target "<ruta del proyecto>"`.
> `npm start`, `npm install` y `npm pkg get` sí funcionan en la ruta original.

## Preguntas de reflexión

**1. ¿Por qué el id se calcula sin la fecha? ¿Qué pasaría si la incluyeras?**
Porque el `id` debe ser el mismo para los mismos datos y así el programa puede reutilizar el
JSON, el `.txt` y la imagen. Si incluyeras `creadoEn`, el `id` cambiaría en cada ejecución,
se generarían archivos nuevos cada vez y se gastaría la cuota gratuita sin necesidad.

**2. ¿Por qué se le pide al modelo de texto la descripción en inglés?**
Porque los modelos de generación de imágenes entienden mejor el inglés: casi todo su
entrenamiento y sus prompts de ejemplo están en ese idioma. Una descripción en inglés suele dar
imágenes más coherentes con lo pedido que la misma descripción en español.

**3. ¿Qué diferencia hay entre una respuesta JSON de texto y una respuesta con los bytes de una imagen? ¿Qué es base64?**
El texto llega como JSON (caracteres que se leen con `respuesta.json()`). La imagen es binaria:
o llega como bytes (con `respuesta.arrayBuffer()`) o como texto **base64** dentro de un JSON.
base64 es una forma de representar datos binarios usando solo caracteres de texto, para poder
viajarlos dentro de un JSON; se vuelve a binario con `Buffer.from(texto, 'base64')`.

**4. ¿Qué pasaría si guardas la imagen con 'utf-8'? ¿Por qué?**
El archivo quedaría dañado y no se abriría. Al escribir con `'utf-8'`, Node interpreta los
bytes como texto y los reemplaza/codifica mal; una imagen es binaria y debe guardarse tal cual,
sin pasar codificación: `fs.writeFileSync(ruta, bytes)`.

**5. ¿Qué pasos consumen cuota gratuita y cómo evitaste repetirlos?**
El paso 2 (modelo de texto) y el paso 3 (modelo de imágenes). Se evita repetirlos comprobando
con `fs.existsSync` si el `.txt` o el `.jpg` ya existen: si existen, se reutiliza su contenido
y no se llama a la API.

**6. Si usaste IA: ¿qué fue lo más difícil de pedirle y qué parte tuviste que corregir tú?**
Lo más difícil fue que respetara las herramientas permitidas (sin `dotenv`, `axios` ni SDK de
proveedores). Hubo que corregir el manejo de la imagen: hay que decodificar el base64 con
`Buffer.from(..., 'base64')` y guardar sin `'utf-8'`, porque al principio el archivo quedaba
dañado. Ver `PROMPT.md` para el detalle.
