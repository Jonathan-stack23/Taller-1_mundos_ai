// src/texto.js
// Responsabilidad: consultar al modelo de lenguaje (fetch) y devolver
// la descripción de la imagen como texto.

// Mensaje de sistema: instrucciones que el modelo debe seguir.
const MENSAJE_SISTEMA = [
  'You are an art director who writes image-generation prompts.',
  'You will receive a JSON with a "situacion" (situation), a "mundo" (world) and five "colores" (colors).',
  'Reply with ONE single paragraph in English, 80 to 120 words long, no titles, no markdown and no line breaks.',
  'Describe a single picture of that imaginary world: the scene, the main elements, the lighting, the composition and the artistic style.',
  'Mention all five given colors (translate the color names to English).',
  'Describe only what is seen in the picture; do not tell a story.',
  'Never write any text, letters or words inside the image.',
  'Reply with the paragraph only.',
].join(' ');

// paso 1: pedir la descripción al modelo de texto
async function describirMundo(mundo) {
  const url = process.env.TEXTO_URL;
  const clave = process.env.TEXTO_API_KEY;
  const modelo = process.env.TEXTO_MODELO;

  // El mensaje del usuario es el contenido del JSON del mundo.
  const cuerpo = {
    model: modelo,
    messages: [
      { role: 'system', content: MENSAJE_SISTEMA },
      { role: 'user', content: JSON.stringify(mundo) },
    ],
  };

  // AbortSignal.timeout corta la petición si tarda más de 30 segundos.
  const respuesta = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clave}`,
    },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(30000),
  });

  // Si la respuesta no es correcta, guardamos el estado para que index.js
  // lo traduzca a un mensaje claro en español.
  if (!respuesta.ok) {
    const error = new Error(`El modelo de texto respondió con estado ${respuesta.status}.`);
    error.estado = respuesta.status;
    throw error;
  }

  const datos = await respuesta.json();
  let descripcion = datos?.choices?.[0]?.message?.content?.trim() || '';

  // Validación: si llega vacía, lanzamos un Error.
  if (descripcion === '') {
    throw new Error('El modelo de texto devolvió una respuesta vacía.');
  }

  // Validación: si supera los 1500 caracteres, la recortamos y avisamos.
  if (descripcion.length > 1500) {
    descripcion = descripcion.slice(0, 1500);
    console.log('Aviso: la descripción era muy larga y se recortó a 1500 caracteres.');
  }

  return descripcion;
}

module.exports = { describirMundo };
