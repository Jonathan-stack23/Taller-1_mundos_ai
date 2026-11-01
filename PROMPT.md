# PROMPT.md — Cómo construí `mundos-ia`

## A. Declaración

**Usé IA: sí.**

Usé un asistente de IA dentro del editor para escribir la mayor parte del código, pero
dirigiendo yo las decisiones (servicios, sistema de módulos, validaciones) y revisando cada
bloque contra la ficha del taller y la lista de herramientas permitidas.

## B. Herramienta y modelo

- **Herramienta:** Trae (asistente de código "TraeCode") dentro del IDE.
- **Modelo:** DeepSeek-V4.1-Flash (no conozco la fecha exacta de la versión).

## C. Prompt inicial (literal)

Inicialmente le pasé a la IA la ficha completa del taller (Ficha 3406211 y 3406204 · Node.js ·
Sesiones 0 a 5) y le pedí seguirla al pie de la letra, usando la plantilla de prompt que la
propia ficha recomienda. El prompt fue:

```
Actúa como un instructor de Node.js para principiantes del SENA.
Quiero construir un programa de consola llamado "mundos-ia".

CONTEXTO: solo conozco estos temas: process.argv, módulos con require,
el módulo nativo fs (writeFileSync, readFileSync, existsSync, mkdirSync),
path, npm (init, install, scripts), el paquete object-hash, variables de
entorno con .env y process.loadEnvFile, async/await con try/catch y el fetch
nativo de Node.

OBJETIVO:
1. Recibir por parámetros una situación, un mundo y 5 colores, y guardarlos
   en un objeto JSON en data/mundo_<id>.json.
2. Leer ese JSON y enviarlo con fetch a la API de un modelo de lenguaje para
   que genere la descripción de una imagen. Guardarla en
   descripciones/mundo_<id>.txt.
3. Enviar esa descripción con fetch a la API de un modelo de imágenes y
   guardar la imagen en imagenes/mundo_<id>.jpg.

RESTRICCIONES:
- No uses dotenv, axios, SDK de proveedores, readline, commander ni frameworks.
- Código simple, con comentarios en español numerados ("paso 1", "paso 2"...).
- Las API keys se leen del archivo .env y nunca se escriben en el código.
- Si el .txt o la imagen ya existen, no vuelvas a llamar a las APIs.
- Divide el código en src/index.js, src/mundo.js, src/texto.js y src/imagen.js.

SERVICIOS: texto con Groq, imagen con NVIDIA FLUX.1-schnell.

FORMA DE RESPONDER: dame un archivo a la vez, explica cada bloque en 2 líneas
y no uses nada que no esté en el CONTEXTO.

Además: sigue la ficha completa al pie de la letra, incluyendo las Partes 1 a 8
(estructura, validaciones, manejo de errores, README, npm publish --dry-run, etc.).
```

## D. Prompts siguientes (los 3 más importantes)

**1. "¿Qué combinación de servicios gratuitos uso?"**
La IA me mostró las combinaciones de la sección 5.3 y me preguntó cuál elegir. Le respondí:
**Groq para texto y NVIDIA FLUX.1-schnell para imagen**. Con eso definió el `.env`, la URL y
el modelo de cada servicio.

**2. "¿CommonJS o ES Modules?"**
La IA me pidió elegir un solo sistema de módulos para todo el proyecto. Elegí **CommonJS**
(`require` / `module.exports`) porque es lo que vimos primero en clase y usa `__dirname`
directamente (más simple que `import.meta.dirname`).

**3. "Pásame el proceso para configurar el `.env` y terminar el código."**
Le pedí el paso a paso para crear el `.env` a partir del `.env.example` y pegar las claves.
La IA me devolvió el procedimiento (`Copy-Item .env.example .env` y pegar `gsk_...` y
`nvapi-...`) y con eso completé la configuración sin dejar claves en el código.

## E. Cambios que hice yo sobre lo que entregó la IA

1. **Elegí CommonJS en lugar de ES Modules.** Aunque la IA podía haber usado `import`/`export`,
   decidí `require`/`module.exports` porque es el sistema que ya conocía de clase y mantiene
   `__dirname` sin trucos.
2. **Fijé los servicios y no dejé que la IA inventara uno.** Le indiqué Groq + NVIDIA para no
   meter librerías/SDK no permitidos y para usar claves que ya tenía de la sesión anterior.
3. **Verifiqué la lista de herramientas permitidas.** Confirmé que el código no usara `dotenv`,
   `axios`, `node-fetch` ni SDK: las variables del `.env` se leen con `process.loadEnvFile` y
   las peticiones se hacen con el `fetch` nativo.
4. **Ajusté el manejo del `id` para que no incluyera la fecha**, de forma que los mismos datos
   den siempre el mismo `id` y los archivos se puedan reutilizar (ahorro de cuota).

## F. Una línea de código que no entendía al principio

```js
const bytes = Buffer.from(base64, 'base64');
```

**Con mis palabras:** el servicio de imágenes no me devuelve la foto, me devuelve un texto muy
largo (`base64`) que representa esos bytes usando solo caracteres normales. `Buffer.from(...)`
con el segundo argumento `'base64'` le dice a Node: "esto no es texto normal, es base64;
decodifícalo y dame los bytes reales de la imagen". Esos bytes son los que guardo con
`writeFileSync` **sin** `'utf-8'`.

## G. Un error y cómo lo resolví

Al ejecutar `npm publish --dry-run` dentro del proyecto salió:

```
npm error code ENOENT
npm error syscall open
npm error path C:\Users\Acer\Documents\Jonathan SENA\NodeJs\package.json
npm error enoent Could not read package.json
```

La causa era el carácter **`#`** en el nombre de la carpeta del taller (`Taller#1`): npm
interpreta la ruta como una URL y corta en el `#`, así que buscaba el `package.json` en la
carpeta equivocada. Lo resolví creando un **acceso directo (junction)** a una ruta sin `#` y
ejecutando el `--dry-run` desde ahí:

```powershell
New-Item -ItemType Junction -Path "$env:TEMP\mundos-ia-link" -Target "<ruta del proyecto>"
```

De ahí salió la evidencia de la Parte 6 (qué archivos se publican con y sin `.gitignore`).
