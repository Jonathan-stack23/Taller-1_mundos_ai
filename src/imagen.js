// src/imagen.js
// Responsabilidad: consultar al modelo de imágenes (fetch) y devolver
// los bytes (Buffer) de la imagen generada.

// paso 1: pedir la imagen al modelo de imágenes
async function generarImagen(descripcion) {
  const url = process.env.IMAGEN_URL;
  const clave = process.env.IMAGEN_API_KEY;

  // Cerebro de la petición para NVIDIA FLUX.1-schnell.
  // seed: 0 significa semilla aleatoria; steps va de 1 a 4.
  const cuerpo = {
    prompt: descripcion,
    width: 1024,
    height: 1024,
    steps: 4,
    seed: 0,
  };

  // Generar una imagen tarda más que generar texto: usamos 60 segundos.
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

  // Si la respuesta no es correcta, guardamos el estado para que index.js
  // lo traduzca a un mensaje claro en español.
  if (!respuesta.ok) {
    const error = new Error(`El modelo de imágenes respondió con estado ${respuesta.status}.`);
    error.estado = respuesta.status;
    throw error;
  }

  const tipo = respuesta.headers.get('content-type') || '';

  // Caso 1: la imagen llega como texto base64 dentro de un JSON
  // (NVIDIA: datos.artifacts[0].base64 · Cloudflare: datos.result.image).
  if (tipo.includes('application/json')) {
    const datos = await respuesta.json();
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

  // Caso 2: la imagen llega directamente como bytes.
  const bytes = Buffer.from(await respuesta.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error('El servicio de imágenes devolvió una imagen vacía.');
  }
  return bytes;
}

module.exports = { generarImagen };
