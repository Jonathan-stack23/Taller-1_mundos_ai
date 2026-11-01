// src/index.js
// Responsabilidad: orquestar los tres pasos en orden y manejar los errores.

const fs = require('node:fs');
const path = require('node:path');

const { USO, crearMundo, guardarMundo, leerMundo } = require('./mundo');
const { describirMundo } = require('./texto');
const { generarImagen } = require('./imagen');

// Rutas construidas desde la ubicación de este archivo (no desde donde se ejecuta).
const RUTA_ENV = path.join(__dirname, '..', '.env');
const CARPETA_DESCRIPCIONES = path.join(__dirname, '..', 'descripciones');
const CARPETA_IMAGENES = path.join(__dirname, '..', 'imagenes');

function rutaDescripcion(id) {
  return path.join(CARPETA_DESCRIPCIONES, `mundo_${id}.txt`);
}

function rutaImagen(id) {
  return path.join(CARPETA_IMAGENES, `mundo_${id}.jpg`);
}

// Traducimos los errores técnicos a mensajes claros en español (Parte 5).
function mensajeClaro(error) {
  // Sin conexión o URL mal escrita: fetch lanza un TypeError.
  if (error instanceof TypeError) {
    return 'No se pudo conectar. Revisa tu internet o la URL.';
  }
  // Se acabó el tiempo de espera: AbortSignal.timeout.
  if (error.name === 'TimeoutError') {
    return 'El servicio tardó demasiado en responder.';
  }
  // Clave inválida o sin permisos.
  if (error.estado === 401 || error.estado === 403) {
    return 'La API key no es válida. Revisa tu archivo .env.';
  }
  // Límite de uso.
  if (error.estado === 402 || error.estado === 429) {
    return 'Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after si existe).';
  }
  // Modelo o URL incorrectos.
  if (error.estado === 404 || error.estado === 410) {
    return 'El modelo o la URL no existen. Revisa tu configuración.';
  }
  return error.message;
}

async function main() {
  // Cargamos las variables del archivo .env (Node 20.12 o superior).
  if (!fs.existsSync(RUTA_ENV)) {
    console.error('No se encontró el archivo .env. Copia .env.example a .env y pon tus claves.');
    process.exitCode = 1;
    return;
  }
  process.loadEnvFile(RUTA_ENV);

  const args = process.argv.slice(2);

  // ------------------ Paso 1: crear y guardar el objeto JSON ------------------
  let mundo;
  try {
    mundo = crearMundo(args);
  } catch (error) {
    // Error de validación de los argumentos.
    console.error(`Error: ${error.message}`);
    console.error(USO);
    process.exitCode = 1;
    return;
  }

  const rutaJson = guardarMundo(mundo);
  console.log(`Paso 1: mundo guardado en data/mundo_${mundo.id}.json`);

  // ------------- Paso 2: leer el JSON y pedir la descripción ------------------
  const rutaTxt = rutaDescripcion(mundo.id);
  let descripcion;

  if (fs.existsSync(rutaTxt)) {
    // Ahorro de cuota: ya teníamos la descripción.
    descripcion = fs.readFileSync(rutaTxt, 'utf-8');
    console.log('Paso 2: la descripción ya existía, no se llamó al modelo de texto.');
  } else {
    try {
      // Consultamos el JSON guardado, no el objeto que teníamos en memoria.
      const mundoLeido = leerMundo(rutaJson);
      descripcion = await describirMundo(mundoLeido);
    } catch (error) {
      console.error(`Paso 2: ${mensajeClaro(error)}`);
      process.exitCode = 1;
      return;
    }
    fs.mkdirSync(CARPETA_DESCRIPCIONES, { recursive: true });
    fs.writeFileSync(rutaTxt, descripcion, 'utf-8');
    console.log(`Paso 2: descripción guardada en descripciones/mundo_${mundo.id}.txt`);
  }

  // ------------------- Paso 3: generar y guardar la imagen --------------------
  const rutaJpg = rutaImagen(mundo.id);

  if (fs.existsSync(rutaJpg)) {
    // Ahorro de cuota: ya teníamos la imagen.
    console.log('Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.');
  } else {
    let bytes;
    try {
      // La descripción se lee desde el archivo .txt guardado en el paso 2.
      bytes = await generarImagen(descripcion);
    } catch (error) {
      console.error(`Paso 3: ${mensajeClaro(error)}`);
      process.exitCode = 1;
      return;
    }
    fs.mkdirSync(CARPETA_IMAGENES, { recursive: true });
    // Los bytes se guardan tal cual, SIN pasar 'utf-8'.
    fs.writeFileSync(rutaJpg, bytes);
    console.log(`Paso 3: imagen guardada en imagenes/mundo_${mundo.id}.jpg`);
  }

  console.log('Listo. Revisa la carpeta imagenes/');
}

main();
