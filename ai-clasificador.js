// ai-clasificador.js
// Módulo de auto-tag de categoría por IA (client-side, sin servidor).
// Se carga como <script type="module"> en vendedor.html.
//
// Flujo:
//   1. Al subir la foto del slot 1, vendedor-unificado.js llama a
//      window.sugerirYAplicar(file).
//   2. Este módulo carga LiteRT.js (lazy, CDN) + model.tflite (raíz del repo).
//   3. Clasifica la imagen 100% en el navegador (WebGPU con fallback a CPU/wasm).
//   4. Si la confianza >= UMBRAL_CONFIANZA, llena <select id="pCategoria">.
//   5. Si no hay confianza suficiente, o el modelo/clasificación falla por
//      cualquier motivo, no hace nada — el vendedor siempre puede elegir manual.
//
// Este módulo NUNCA debe bloquear ni interrumpir el flujo de publicar producto.

const MODEL_URL = './model.tflite';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@litertjs/core/wasm/';
const LITERT_ESM = 'https://cdn.jsdelivr.net/npm/@litertjs/core/+esm';

// Umbral de confianza mínimo para aplicar la sugerencia automáticamente.
// Ajustar hacia arriba (0.5-0.6) conforme crezca el inventario por categoría
// y el modelo tenga más ejemplos reales para aprender un patrón visual sólido.
const UMBRAL_CONFIANZA = 0.25;
const INPUT_SIZE = 224; // 224x224, como MobileNetV2

// Las categorías reales del modelo se leen SIEMPRE de labels.txt (se genera
// junto con model.tflite en cada reentrenamiento). No hay una lista de
// respaldo hardcodeada a propósito: si labels.txt no carga, es más seguro
// desactivar el auto-tag por completo que adivinar con nombres de categoría
// que podrían no coincidir con el orden real de clases del modelo entrenado
// (eso asignaría categorías incorrectas con apariencia de alta confianza).
let CATEGORY_MAP = null;

let _liteRtCore = null;
let _model = null;
let _loadingPromise = null;
let _modelDisponible = true; // se pone en false si falla la carga (404, sin WebGPU/wasm, etc.)

/**
 * Carga LiteRT.js + el modelo, una sola vez (lazy). Si algo falla, marca el
 * módulo como no disponible y no vuelve a intentar en esta sesión de página.
 */
async function _cargarModelo() {
  if (_model) return _model;
  if (!_modelDisponible) return null;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = (async () => {
    try {
      const labels = await _cargarLabels();
      if (!labels || !labels.length) {
        console.error('[ai-clasificador] labels.txt no disponible — auto-tag desactivado esta sesión (más seguro que adivinar nombres de categoría).');
        _modelDisponible = false;
        return null;
      }
      CATEGORY_MAP = labels;
      console.error('[ai-clasificador] labels.txt cargado, categorías del modelo:', CATEGORY_MAP);

      _liteRtCore = await import(/* webpackIgnore: true */ LITERT_ESM);
      await _liteRtCore.loadLiteRt(WASM_BASE);

      // Intentamos WebGPU primero (más rápido), pero con una auto-prueba de
      // sanidad: se detectó que el delegado WebGPU de LiteRT.js puede cargar
      // el modelo sin error y aun así devolver una salida degenerada (puros
      // ceros) con este modelo. Corremos una inferencia de prueba con un
      // tensor en blanco; si la salida es degenerada, descartamos WebGPU y
      // usamos CPU/wasm en su lugar — sin que el vendedor note nada.
      let modeloWebGpuValido = false;
      try {
        const modeloGpu = await _liteRtCore.loadAndCompile(MODEL_URL, { accelerator: 'webgpu' });
        modeloWebGpuValido = await _probarSalidaValida(modeloGpu);
        if (modeloWebGpuValido) {
          _model = modeloGpu;
          console.error('[ai-clasificador] Modelo cargado con aceleración WebGPU (auto-prueba de sanidad OK)');
        } else {
          console.error('[ai-clasificador] WebGPU cargó pero la auto-prueba detectó salida degenerada (bug conocido) — usando CPU/wasm en su lugar.');
          modeloGpu.delete?.();
        }
      } catch (errGpu) {
        console.error('[ai-clasificador] WebGPU no disponible o falló al cargar, usando CPU/wasm:', errGpu);
      }

      if (!modeloWebGpuValido) {
        _model = await _liteRtCore.loadAndCompile(MODEL_URL, { accelerator: 'wasm' });
        console.error('[ai-clasificador] Modelo cargado con CPU/wasm');
      }

      return _model;
    } catch (err) {
      console.error('[ai-clasificador] Auto-tag no disponible (modelo no encontrado o error de carga):', err);
      _modelDisponible = false;
      return null;
    }
  })();

  return _loadingPromise;
}

/**
 * Corre una inferencia de prueba con un tensor en blanco (todo ceros) para
 * confirmar que el modelo compilado con este acelerador da una salida
 * "viva" (no todo ceros/NaN). Usado para descartar automáticamente el bug
 * conocido de WebGPU con este modelo, sin bloquear al usuario con errores.
 */
async function _probarSalidaValida(modelo) {
  let tensorPrueba;
  try {
    const datosVacios = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
    tensorPrueba = new _liteRtCore.Tensor(datosVacios, [1, INPUT_SIZE, INPUT_SIZE, 3]);
    const resultados = await modelo.run(tensorPrueba);
    const salida = resultados[0];
    const cpuResult = await salida.moveTo('wasm');
    const valores = cpuResult.toTypedArray();
    salida.delete?.();
    cpuResult.delete?.();

    const suma = Array.from(valores).reduce((acc, v) => acc + Math.abs(v), 0);
    return Number.isFinite(suma) && suma > 1e-6;
  } catch {
    return false;
  } finally {
    tensorPrueba?.delete?.();
  }
}

/**
 * labels.txt se publica junto al modelo en cada reentrenamiento. Si existe,
 * tiene prioridad sobre el CATEGORY_MAP hardcodeado arriba, evitando
 * desincronización cuando cambien las clases entrenadas.
 */
async function _cargarLabels() {
  const res = await fetch('./labels.txt', { cache: 'no-store' });
  if (!res.ok) return null;
  const texto = await res.text();
  return texto.split('\n').map(l => l.trim()).filter(Boolean);
}

/**
 * Convierte un File/Blob de imagen a un Tensor [1, 224, 224, 3] float32,
 * normalizado estilo MobileNet ([-1, 1]).
 *
 * Nota (pendiente del informe, paso 6): si el modelo entrenado espera otro
 * shape/normalización, ajustar aquí.
 */
async function fileToInputTensor(file) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const ctx = canvas.getContext('2d');

  // Recorte central cuadrado antes de escalar, para no deformar el producto.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, INPUT_SIZE, INPUT_SIZE);

  const { data } = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
  const floatData = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    floatData[j] = (data[i] / 127.5) - 1;       // R
    floatData[j + 1] = (data[i + 1] / 127.5) - 1; // G
    floatData[j + 2] = (data[i + 2] / 127.5) - 1; // B
  }

  bitmap.close?.();
  return new _liteRtCore.Tensor(floatData, [1, INPUT_SIZE, INPUT_SIZE, 3]);
}

function _softmaxArgmax(arr) {
  let max = -Infinity, idx = -1;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) { max = arr[i]; idx = i; }
  }
  return { idx, confianza: max };
}

/**
 * Clasifica una imagen y devuelve { categoria, confianza, embedding } o null
 * si no hay confianza suficiente o el modelo no está disponible.
 * `embedding` es un array de ~1280 números (huella visual de la foto, para
 * el buscador por similitud de Comunidad) — viene de la segunda salida del
 * mismo modelo, sin costo extra de inferencia. Si el modelo desplegado es
 * una versión vieja con una sola salida, `embedding` sale como null pero la
 * clasificación de categoría sigue funcionando igual.
 */
export async function clasificarImagen(file) {
  const model = await _cargarModelo();
  if (!model) return null;

  let inputTensor;
  try {
    inputTensor = await fileToInputTensor(file);
    const resultados = await model.run(inputTensor);
    console.error(`[ai-clasificador] model.run() devolvió ${resultados.length} tensor(es) de salida.`);

    // IMPORTANTE: no asumimos el orden [clasificación, embedding] por
    // posición — TFLite no siempre conserva el orden en que se definieron
    // las salidas en Python al convertir el modelo. Identificamos cada
    // tensor por su TAMAÑO: el embedding de MobileNetV2 siempre trae 1280
    // valores; la clasificación de categoría trae uno por categoría (un
    // puñado). Esto es robusto sin importar en qué orden los devuelva el
    // runtime.
    const tensoresLeidos = [];
    for (const tensor of resultados) {
      const cpuTensor = await tensor.moveTo('wasm');
      const valores = Array.from(cpuTensor.toTypedArray());
      tensoresLeidos.push(valores);
      tensor.delete?.();
      cpuTensor.delete?.();
    }
    console.error('[ai-clasificador] Tamaños de las salidas leídas:', tensoresLeidos.map(v => v.length));

    const DIM_EMBEDDING = 1280;
    const salidaEmbedding = tensoresLeidos.find(v => v.length === DIM_EMBEDDING) || null;
    const salidaClasificacion = tensoresLeidos.find(v => v.length !== DIM_EMBEDDING) || tensoresLeidos[0];

    const embedding = salidaEmbedding;
    const { idx, confianza } = _softmaxArgmax(salidaClasificacion);
    console.error(`[ai-clasificador] Índice ganador: ${idx}, confianza: ${confianza}, CATEGORY_MAP.length: ${CATEGORY_MAP?.length}`);

    if (idx < 0 || !CATEGORY_MAP || idx >= CATEGORY_MAP.length) {
      console.error('[ai-clasificador] Índice fuera de rango (posible salida vacía o CATEGORY_MAP no coincide en tamaño).');
      return { categoria: null, confianza: 0, embedding };
    }

    // Nota: NO descartamos por confianza baja aquí — el embedding es válido
    // independientemente de qué tan segura esté la clasificación de
    // categoría. Es sugerirYAplicar() quien decide si aplica la categoría
    // sugerida según UMBRAL_CONFIANZA; el embedding se usa siempre.
    return { categoria: CATEGORY_MAP[idx], confianza, embedding };
  } catch (err) {
    console.error('[ai-clasificador] Error clasificando imagen:', err);
    return null;
  } finally {
    inputTensor?.delete?.();
  }
}

/**
 * Punto de entrada llamado desde vendedor-unificado.js al subir la foto del
 * slot 1. Clasifica y, si hay confianza suficiente, llena el <select
 * id="pCategoria"> — pero nunca bloquea el flujo de subida/publicación.
 */
window.sugerirYAplicar = async function(file) {
  window.__znrUltimoEmbedding = null; // se recalcula con cada foto nueva del slot 1
  try {
    const resultado = await clasificarImagen(file);
    if (!resultado) {
      console.error('[ai-clasificador] Sin resultado: el modelo no está disponible.');
      return;
    }

    // El embedding se guarda SIEMPRE que el modelo corrió bien, sin importar
    // la confianza de la categoría — vendedor-unificado.js lo lee de aquí al
    // publicar el producto, para el buscador visual de Comunidad.
    if (resultado.embedding) {
      window.__znrUltimoEmbedding = resultado.embedding;
      console.error(`[ai-clasificador] Embedding calculado (${resultado.embedding.length} valores), listo para publicar.`);
    }

    if (!resultado.categoria) {
      console.error('[ai-clasificador] Sin sugerencia de categoría (salida del modelo fuera de rango).');
      return;
    }

    console.error(`[ai-clasificador] Predicción cruda del modelo: "${resultado.categoria}" (${Math.round(resultado.confianza * 100)}%)`);

    if (resultado.confianza < UMBRAL_CONFIANZA) {
      console.error(`[ai-clasificador] Confianza ${resultado.confianza} menor al umbral ${UMBRAL_CONFIANZA}, no se aplica la sugerencia de categoría.`);
      return;
    }

    const select = document.getElementById('pCategoria');
    if (!select) {
      console.error('[ai-clasificador] No se encontró el <select id="pCategoria"> en la página.');
      return;
    }

    // No pisar una categoría que el vendedor ya eligió manualmente.
    if (select.value && select.dataset.aiSugerida !== 'true') {
      console.error(`[ai-clasificador] Ya hay una categoría seleccionada manualmente ("${select.value}"), no se sobreescribe.`);
      return;
    }

    const opcionExiste = Array.from(select.options).some(o => o.value === resultado.categoria);
    if (!opcionExiste) {
      console.error(`[ai-clasificador] La categoría predicha "${resultado.categoria}" no coincide con ninguna <option> del <select>. Opciones disponibles:`,
        Array.from(select.options).map(o => o.value));
      return;
    }

    select.value = resultado.categoria;
    select.dataset.aiSugerida = 'true';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    // Algunos navegadores móviles (Android WebView) renderizan el <select>
    // con un tono más claro tipo placeholder cuando el valor se asigna por
    // JS en vez de un toque real del usuario. Forzamos el estilo para que
    // se vea igual que una selección manual.
    select.style.color = 'var(--color-text-primary, #1a1a2e)';
    select.style.fontWeight = '600';

    console.error(`[ai-clasificador] Sugerencia aplicada: ${resultado.categoria} (${Math.round(resultado.confianza * 100)}%)`);

    if (typeof window.showTemporaryMessage === 'function') {
      window.showTemporaryMessage(`Categoría sugerida: ${resultado.categoria} (${Math.round(resultado.confianza * 100)}%)`, 'info');
    }
  } catch (err) {
    // Cualquier error aquí es silencioso: el auto-tag es un extra, nunca un bloqueo.
    console.error('[ai-clasificador] sugerirYAplicar falló silenciosamente:', err);
  }
};

// Si el vendedor cambia la categoría manualmente, dejar de tratarla como
// "sugerida por IA" para no volver a sobreescribirla en subidas posteriores.
document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('pCategoria');
  if (!select) return;
  select.addEventListener('input', () => {
    select.dataset.aiSugerida = 'false';
  });
});
