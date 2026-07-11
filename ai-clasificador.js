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

const MODEL_URL = '/model.tflite';
const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@litertjs/core/wasm/';
const LITERT_ESM = 'https://cdn.jsdelivr.net/npm/@litertjs/core/+esm';

const UMBRAL_CONFIANZA = 0.55;
const INPUT_SIZE = 224; // 224x224, como MobileNetV2

// IMPORTANTE: este orden debe coincidir EXACTAMENTE con el orden de clases de
// labels.txt generado por scripts/entrenar_modelo.py después de cada
// reentrenamiento. Actualizar este arreglo cuando cambie labels.txt.
// (Ver paso 5 del informe: "Actualizar CATEGORY_MAP con el orden EXACTO de
// clases que salga en labels.txt después del primer entrenamiento".)
let CATEGORY_MAP = [
  'Ropa de mujer',
  'Ropa de hombre',
  'Ropa infantil',
  'Ropa interior y lencería',
  'Ropa deportiva',
  'Calzado',
  'Accesorios',
  'Joyería y bisutería',
  'Bolsas y equipaje',
];

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
      _liteRtCore = await import(/* webpackIgnore: true */ LITERT_ESM);
      await _liteRtCore.loadLiteRt(WASM_BASE);

      try {
        _model = await _liteRtCore.loadAndCompile(MODEL_URL, { accelerator: 'webgpu' });
        console.log('[ai-clasificador] Modelo cargado con aceleración WebGPU');
      } catch (errGpu) {
        console.warn('[ai-clasificador] WebGPU no disponible, usando CPU/wasm:', errGpu);
        _model = await _liteRtCore.loadAndCompile(MODEL_URL, { accelerator: 'wasm' });
        console.log('[ai-clasificador] Modelo cargado con CPU/wasm');
      }

      try {
        const labels = await _cargarLabels();
        if (labels && labels.length) CATEGORY_MAP = labels;
      } catch (errLabels) {
        console.warn('[ai-clasificador] No se pudo cargar labels.txt, usando CATEGORY_MAP por defecto:', errLabels);
      }

      return _model;
    } catch (err) {
      console.warn('[ai-clasificador] Auto-tag no disponible (modelo no encontrado o error de carga):', err);
      _modelDisponible = false;
      return null;
    }
  })();

  return _loadingPromise;
}

/**
 * labels.txt se publica junto al modelo en cada reentrenamiento. Si existe,
 * tiene prioridad sobre el CATEGORY_MAP hardcodeado arriba, evitando
 * desincronización cuando cambien las clases entrenadas.
 */
async function _cargarLabels() {
  const res = await fetch('/labels.txt', { cache: 'no-store' });
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
 * Clasifica una imagen y devuelve { categoria, confianza } o null si no hay
 * confianza suficiente o el modelo no está disponible.
 */
export async function clasificarImagen(file) {
  const model = await _cargarModelo();
  if (!model) return null;

  let inputTensor;
  try {
    inputTensor = await fileToInputTensor(file);
    const resultados = await model.run(inputTensor);
    const salida = resultados[0];
    const cpuResult = await salida.moveTo('wasm');
    const valores = cpuResult.toTypedArray();

    const { idx, confianza } = _softmaxArgmax(valores);

    salida.delete?.();
    cpuResult.delete?.();

    if (idx < 0 || idx >= CATEGORY_MAP.length) return null;
    if (confianza < UMBRAL_CONFIANZA) return null;

    return { categoria: CATEGORY_MAP[idx], confianza };
  } catch (err) {
    console.warn('[ai-clasificador] Error clasificando imagen:', err);
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
  try {
    const select = document.getElementById('pCategoria');
    if (!select) return;

    // No pisar una categoría que el vendedor ya eligió manualmente.
    if (select.value && select.dataset.aiSugerida !== 'true') return;

    const resultado = await clasificarImagen(file);
    if (!resultado) return;

    const opcionExiste = Array.from(select.options).some(o => o.value === resultado.categoria);
    if (!opcionExiste) return;

    select.value = resultado.categoria;
    select.dataset.aiSugerida = 'true';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    console.log(`[ai-clasificador] Sugerencia aplicada: ${resultado.categoria} (${Math.round(resultado.confianza * 100)}%)`);

    if (typeof window.showTemporaryMessage === 'function') {
      window.showTemporaryMessage(`✨ Categoría sugerida: ${resultado.categoria}`, 'info');
    }
  } catch (err) {
    // Cualquier error aquí es silencioso: el auto-tag es un extra, nunca un bloqueo.
    console.warn('[ai-clasificador] sugerirYAplicar falló silenciosamente:', err);
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
