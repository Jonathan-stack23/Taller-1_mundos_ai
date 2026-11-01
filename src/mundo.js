// src/mundo.js
// Responsabilidad: validar los argumentos, crear el objeto del mundo,
// guardarlo en JSON y volver a leerlo desde el archivo.

const fs = require('node:fs');
const path = require('node:path');
const hash = require('object-hash');

// Ejemplo de uso que mostramos cuando algún argumento está mal.
const USO =
  'Uso: npm start -- "<situacion>" "<mundo>" <color1> <color2> <color3> <color4> <color5>';

// Ruta de la carpeta data/ construida a partir de la ubicación de ESTE archivo
// (pista de rutas de la ficha), no del lugar desde donde se ejecuta.
const CARPETA_DATA = path.join(__dirname, '..', 'data');

// paso 1: validar los argumentos que llegan desde process.argv
function validarArgumentos(args) {
  // 1.1 Deben llegar exactamente 7 argumentos.
  if (args.length !== 7) {
    throw new Error(
      `Se esperaban 7 argumentos (situacion, mundo y 5 colores) y llegaron ${args.length}. ` +
        'Recuerda escribir la situacion y el mundo entre comillas.'
    );
  }

  // 1.2 Ningún argumento puede estar vacío ni tener solo espacios.
  const hayVacio = args.some((arg) => String(arg).trim() === '');
  if (hayVacio) {
    throw new Error('Ningún argumento puede estar vacío ni tener solo espacios.');
  }

  // 1.3 Los 5 colores deben ser distintos (sin distinguir mayúsculas de minúsculas).
  const colores = args.slice(2).map((color) => color.trim().toLowerCase());
  if (new Set(colores).size !== 5) {
    throw new Error('Los 5 colores deben ser distintos entre sí.');
  }
}

// paso 2: crear el objeto del mundo a partir de los argumentos
function crearMundo(args) {
  validarArgumentos(args);

  const situacion = args[0].trim();
  const mundo = args[1].trim();
  const colores = args.slice(2).map((color) => color.trim());

  // El id son los primeros 8 caracteres del hash de { situacion, mundo, colores }.
  // NO incluimos creadoEn: si lo incluyéramos, el id cambiaría en cada ejecución
  // y nunca podríamos reutilizar el JSON, el .txt ni la imagen.
  const id = hash({ situacion, mundo, colores }).slice(0, 8);

  return {
    id,
    situacion,
    mundo,
    colores,
    creadoEn: new Date().toISOString(),
  };
}

// Devuelve la ruta del JSON de un mundo: data/mundo_<id>.json
function rutaMundo(id) {
  return path.join(CARPETA_DATA, `mundo_${id}.json`);
}

// paso 3: guardar el objeto en data/mundo_<id>.json
function guardarMundo(mundo) {
  // Si la carpeta data/ no existe, la creamos.
  fs.mkdirSync(CARPETA_DATA, { recursive: true });
  const ruta = rutaMundo(mundo.id);
  fs.writeFileSync(ruta, JSON.stringify(mundo, null, 2), 'utf-8');
  return ruta;
}

// paso 4: leer el mundo desde el archivo (readFileSync + JSON.parse)
function leerMundo(ruta) {
  const contenido = fs.readFileSync(ruta, 'utf-8');
  return JSON.parse(contenido);
}

module.exports = { USO, crearMundo, guardarMundo, leerMundo, rutaMundo };
