// src/imagen.js
// Responsabilidad: consultar al modelo de imágenes (fetch) y devolver
// los bytes (Buffer) de la imagen generada.

// Recorta un texto para que quepa sin problemas dentro de una URL.
function recortarParaUrl(texto, maximo) {
  if (texto.length <= maximo) {
    return texto;
  }
  console.log(`Aviso: la descripción era muy larga para la URL y se recortó a ${maximo} caracteres.`);
  return texto.slice(0, maximo);
}

// paso 1: pedir la imagen al modelo de imágenes
async function generarImagen(descripcion) {
  const url = process.env.IMAGEN_URL;

  // --- Servicio sin clave: la descripción viaja en la URL y la imagen
  //     llega directamente como bytes (opción C de la ficha). ---
  if (url.includes('pollinations')) {
    const prompt = recortarParaUrl(descripcion, 1200);
    const direccion = `${url}/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;

    // Generar una imagen tarda más que generar texto: usamos 60 segundos.
    const respuesta = await fetch(direccion, { signal: AbortSignal.timeout(60000) });

    if (!respuesta.ok) {
      const error = new Error(`El modelo de imágenes respondió con estado ${respuesta.status}.`);
      error.estado = respuesta.status;
      throw error;
    }

    // La imagen llega como bytes (image/jpeg), sin JSON.
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    if (bytes.length === 0) {
      throw new Error('El servicio de imágenes devolvió una imagen vacía.');
    }
    return bytes;
  }

  // --- Servicio con clave (NVIDIA / Cloudflare): petición POST con JSON
  //     y la imagen llega como texto base64 dentro de la respuesta. ---
  const clave = process.env.IMAGEN_API_KEY;
  const cuerpo = {
    prompt: descripcion,
    width: 1024,
    height: 1024,
    steps: 4,
    seed: 0, // 0 significa semilla aleatoria
  };

  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${clave}`,
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(60000),
  });

  if (!respuesta.ok) {
    const error = new Error(`El modelo de imágenes respondió con estado ${respuesta.status}.`);
    error.estado = respuesta.status;
    throw error;
  }

  const datos = await respuesta.json();
  // NVIDIA: datos.artifacts[0].base64 · Cloudflare: datos.result.image
  const artefacto = datos?.artifacts?.[0];
  const base64 = artefacto?.base64 || datos?.result?.image;

  // En NVIDIA comprobamos que el proceso terminó bien.
  if (artefacto && artefacto.finishReason !== 'SUCCESS') {
    throw new Error(`El modelo de imágenes no terminó bien: ${artefacto.finishReason}.`);
  }
  if (!base64) {
    throw new Error('El servicio de imágenes no devolvió la imagen en base64.');
  }

  // Los bytes se obtienen decodificando el texto base64.
  return Buffer.from(base64, 'base64');
}

module.exports = { generarImagen };
