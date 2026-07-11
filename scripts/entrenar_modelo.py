"""
scripts/entrenar_modelo.py

Entrena el modelo de auto-tag de categoría para ZNR y exporta:
  - model.tflite  (a la raíz del repo)
  - labels.txt    (a la raíz del repo, mismo orden de clases que el modelo)

Se ejecuta dentro de GitHub Actions (.github/workflows/reentrenar-modelo.yml),
disparado por Apps Script vía workflow_dispatch. También se puede correr
localmente o adaptar a un notebook de Colab para pruebas manuales.

Flujo:
  1. Lee el catálogo desde el CSV publicado del Google Sheet
     (variable de entorno CATALOGO_CSV_URL).
  2. Descarga las fotos de cada producto (convierte links de Drive a
     descarga directa).
  3. Descarta categorías con menos de MIN_FOTOS_POR_CATEGORIA fotos.
  4. Entrena MobileNetV2 (transfer learning) + fine-tuning ligero.
  5. Exporta model.tflite + labels.txt a la raíz del repo.

IMPORTANTE: el orden de clases en labels.txt debe coincidir EXACTAMENTE con
CATEGORY_MAP en ai-clasificador.js. Este script ordena las clases
alfabéticamente de forma determinista y las escribe en ese orden en
labels.txt — después de cada entrenamiento, actualiza CATEGORY_MAP en
ai-clasificador.js para que coincida (o deja que el módulo cargue labels.txt
en tiempo de ejecución, que ya tiene prioridad sobre CATEGORY_MAP).
"""

import os
import re
import sys
import io
import csv
import time
import urllib.request
import urllib.error
from collections import defaultdict

import numpy as np
import tensorflow as tf
from PIL import Image

# ── Configuración ──────────────────────────────────────────────────────────

CATALOGO_CSV_URL = os.environ.get("CATALOGO_CSV_URL", "").strip()
# Configurable desde el workflow_dispatch (input min_fotos_categoria) para
# permitir "pruebas de humo" con inventario chico. Súbelo a 15+ en cuanto
# tengas más fotos por categoría — con muy pocas fotos el modelo no aprende
# un patrón visual real, solo memoriza.
MIN_FOTOS_POR_CATEGORIA = int(os.environ.get("MIN_FOTOS_POR_CATEGORIA", "15"))
IMG_SIZE = 224
BATCH_SIZE = 16
EPOCHS_HEAD = 8
EPOCHS_FINETUNE = 6
VALIDATION_SPLIT = 0.15
SEED = 42

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_DIR = os.path.join(REPO_ROOT, "_dataset_temp")
MODEL_OUT = os.path.join(REPO_ROOT, "model.tflite")
LABELS_OUT = os.path.join(REPO_ROOT, "labels.txt")

# Nombres de columna posibles (para tolerar variaciones de mayúsculas/acentos
# entre lo asumido en el informe y el Sheet real de Jose). Ajusta esta lista
# si tu columna real usa otro nombre.
COL_CATEGORIA_CANDIDATOS = ["categoria", "categoría", "category"]
COL_IMAGEN_CANDIDATOS = ["imagen1", "imagen 1", "imagen_1", "image1", "foto1", "foto 1"]


def log(msg):
    print(f"[entrenar_modelo] {msg}", flush=True)


# ── 1. Leer catálogo desde el CSV publicado del Sheet ──────────────────────

def leer_catalogo():
    if not CATALOGO_CSV_URL:
        log("❌ Falta la variable de entorno CATALOGO_CSV_URL (secret de GitHub Actions).")
        sys.exit(1)

    log(f"Descargando catálogo desde: {CATALOGO_CSV_URL}")
    with urllib.request.urlopen(CATALOGO_CSV_URL, timeout=30) as resp:
        raw = resp.read().decode("utf-8-sig")

    reader = csv.DictReader(io.StringIO(raw))
    fieldnames = reader.fieldnames or []
    fieldnames_lower = {f.lower().strip(): f for f in fieldnames}

    col_categoria = next((fieldnames_lower[c] for c in COL_CATEGORIA_CANDIDATOS if c in fieldnames_lower), None)
    col_imagen = next((fieldnames_lower[c] for c in COL_IMAGEN_CANDIDATOS if c in fieldnames_lower), None)
    col_estado = fieldnames_lower.get("estado")  # ProductosComunidad tiene moderación (aprobado/pendiente/rechazado)

    if not col_categoria or not col_imagen:
        log(f"❌ No se encontraron las columnas esperadas. Columnas detectadas: {fieldnames}")
        log("   Ajusta COL_CATEGORIA_CANDIDATOS / COL_IMAGEN_CANDIDATOS en este script a tus nombres reales.")
        sys.exit(1)

    log(f"Columna de categoría detectada: '{col_categoria}' | columna de imagen: '{col_imagen}'"
        + (f" | columna de estado: '{col_estado}'" if col_estado else ""))

    filas = []
    descartadas_por_estado = 0
    for row in reader:
        categoria = (row.get(col_categoria) or "").strip()
        imagen = (row.get(col_imagen) or "").strip()
        if col_estado:
            estado = (row.get(col_estado) or "").strip().lower()
            if estado and estado != "aprobado":
                descartadas_por_estado += 1
                continue
        if categoria and imagen:
            filas.append((categoria, imagen))

    if descartadas_por_estado:
        log(f"Filas descartadas por no estar aprobadas (estado != 'aprobado'): {descartadas_por_estado}")

    log(f"Filas válidas leídas del catálogo: {len(filas)}")
    return filas


# ── 2. Descargar fotos (convierte links de Drive a descarga directa) ───────

def drive_a_descarga_directa(url):
    """Convierte varios formatos de link de Drive a un link de descarga directa."""
    m = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    m = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
    if m:
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    m = re.search(r"lh3\.googleusercontent\.com/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return f"https://drive.google.com/uc?export=download&id={m.group(1)}"
    return url  # ya es una URL directa (u otro hosting)


MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
    b"BM": "bmp",
}


def _es_imagen_valida(data):
    """Revisa los primeros bytes del archivo para confirmar que es una imagen
    real (JPEG/PNG/GIF/BMP) y no una página HTML de error/advertencia de Drive."""
    if not data or len(data) < 100:
        return False
    for firma in MAGIC_BYTES:
        if data.startswith(firma):
            return True
    return False


def _extraer_confirm_token(html_bytes):
    """Cuando Drive no puede confirmar la descarga automáticamente, devuelve
    una página HTML con un formulario/token de confirmación en vez del
    archivo. Intentamos extraer ese token para reintentar la descarga real."""
    try:
        texto = html_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return None
    m = re.search(r'confirm=([0-9A-Za-z_-]+)', texto)
    return m.group(1) if m else None


def descargar_imagen(url, destino, intentos=3):
    url_directa = drive_a_descarga_directa(url)
    for intento in range(intentos):
        try:
            req = urllib.request.Request(url_directa, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                data = resp.read()

            if not _es_imagen_valida(data):
                # Puede ser la página de confirmación de Drive ("no se puede
                # escanear este archivo por virus" / cuota). Intentamos sacar
                # el token de confirmación y reintentar con la URL real.
                token = _extraer_confirm_token(data)
                if token and "drive.google.com" in url_directa:
                    m = re.search(r"id=([a-zA-Z0-9_-]+)", url_directa)
                    if m:
                        url_confirm = f"https://drive.google.com/uc?export=download&confirm={token}&id={m.group(1)}"
                        req2 = urllib.request.Request(url_confirm, headers={"User-Agent": "Mozilla/5.0"})
                        with urllib.request.urlopen(req2, timeout=20) as resp2:
                            data = resp2.read()

            if not _es_imagen_valida(data):
                raise ValueError("La respuesta no es una imagen válida (probablemente una página de error/advertencia de Drive)")

            with open(destino, "wb") as f:
                f.write(data)
            return True
        except Exception as e:
            if intento == intentos - 1:
                log(f"  ⚠️ No se pudo descargar {url_directa}: {e}")
                return False
            time.sleep(1.5)
    return False


def construir_dataset(filas):
    conteo = defaultdict(int)
    por_categoria = defaultdict(list)
    for categoria, imagen in filas:
        por_categoria[categoria].append(imagen)

    categorias_validas = {
        cat: urls for cat, urls in por_categoria.items()
        if len(urls) >= MIN_FOTOS_POR_CATEGORIA
    }

    descartadas = set(por_categoria) - set(categorias_validas)
    if descartadas:
        log(f"Categorías descartadas por tener menos de {MIN_FOTOS_POR_CATEGORIA} fotos: {sorted(descartadas)}")

    if len(categorias_validas) < 2:
        log("❌ Se necesitan al menos 2 categorías con suficientes fotos para entrenar.")
        sys.exit(1)

    os.makedirs(DATASET_DIR, exist_ok=True)
    for categoria in sorted(categorias_validas.keys()):
        carpeta = os.path.join(DATASET_DIR, categoria.replace("/", "-"))
        os.makedirs(carpeta, exist_ok=True)
        urls = categorias_validas[categoria]
        log(f"Descargando {len(urls)} fotos para categoría '{categoria}'...")
        n_ok = 0
        for i, url in enumerate(urls):
            destino = os.path.join(carpeta, f"{i:04d}.jpg")
            if descargar_imagen(url, destino):
                n_ok += 1
        conteo[categoria] = n_ok
        log(f"  ✅ {n_ok}/{len(urls)} descargadas para '{categoria}'")

    # Re-filtrar por si algunas descargas fallaron y la categoría quedó chica
    categorias_finales = sorted([c for c, n in conteo.items() if n >= MIN_FOTOS_POR_CATEGORIA])
    if len(categorias_finales) < 2:
        log("❌ Después de descargar, no quedan suficientes categorías con suficientes fotos.")
        sys.exit(1)

    log(f"Categorías finales para entrenar ({len(categorias_finales)}): {categorias_finales}")
    return categorias_finales


def validar_dataset_final(categorias_finales):
    """Última red de seguridad: abre cada imagen descargada con Pillow y
    elimina cualquier archivo corrupto/truncado antes de entrenar. Si una
    categoría queda por debajo del mínimo después de esta limpieza, se
    descarta también."""
    categorias_ok = []
    for categoria in categorias_finales:
        carpeta = os.path.join(DATASET_DIR, categoria.replace("/", "-"))
        if not os.path.isdir(carpeta):
            continue
        validas = 0
        for nombre_archivo in list(os.listdir(carpeta)):
            ruta = os.path.join(carpeta, nombre_archivo)
            try:
                with Image.open(ruta) as img:
                    img.verify()
                validas += 1
            except Exception:
                log(f"  🗑️ Eliminando imagen corrupta/no válida: {ruta}")
                os.remove(ruta)
        if validas >= MIN_FOTOS_POR_CATEGORIA:
            categorias_ok.append(categoria)
        else:
            log(f"  ⚠️ Categoría '{categoria}' quedó con solo {validas} fotos válidas tras la limpieza, se descarta.")

    if len(categorias_ok) < 2:
        log("❌ Después de validar las imágenes, no quedan suficientes categorías con suficientes fotos.")
        sys.exit(1)

    log(f"Categorías validadas para entrenar ({len(categorias_ok)}): {categorias_ok}")
    return categorias_ok


# ── 3 y 4. Entrenar MobileNetV2 (transfer learning + fine-tuning) ──────────

def entrenar(categorias_finales):
    # Elimina del directorio de dataset cualquier carpeta que no haya
    # quedado en la lista final (por si alguna categoría fue descartada
    # después de la descarga).
    for nombre in os.listdir(DATASET_DIR):
        ruta = os.path.join(DATASET_DIR, nombre)
        if os.path.isdir(ruta) and nombre not in [c.replace("/", "-") for c in categorias_finales]:
            log(f"Eliminando carpeta descartada del dataset: {nombre}")
            import shutil
            shutil.rmtree(ruta)

    # Con inventario chico (pruebas de humo) no siempre alcanza para separar
    # validación sin arriesgarse a dejar clases sin ejemplos en algún lado.
    # Umbral simple: si el total de imágenes es muy bajo, entrenamos con
    # todo el dataset y sin validación (solo para confirmar que el pipeline
    # completo funciona de punta a punta).
    total_imagenes = sum(
        len(os.listdir(os.path.join(DATASET_DIR, d)))
        for d in os.listdir(DATASET_DIR)
        if os.path.isdir(os.path.join(DATASET_DIR, d))
    )
    usar_validacion = total_imagenes >= 40  # ~ suficiente para separar 15% sin dejar clases vacías

    if usar_validacion:
        train_ds = tf.keras.utils.image_dataset_from_directory(
            DATASET_DIR,
            validation_split=VALIDATION_SPLIT,
            subset="training",
            seed=SEED,
            image_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH_SIZE,
            label_mode="categorical",
        )
        val_ds = tf.keras.utils.image_dataset_from_directory(
            DATASET_DIR,
            validation_split=VALIDATION_SPLIT,
            subset="validation",
            seed=SEED,
            image_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH_SIZE,
            label_mode="categorical",
        )
    else:
        log(f"⚠️ Dataset muy pequeño ({total_imagenes} imágenes en total) — "
            f"entrenando SIN separar validación. Esto es solo una prueba de "
            f"humo del pipeline; sube MIN_FOTOS_POR_CATEGORIA y agrega más "
            f"fotos antes de confiar en la precisión del modelo.")
        train_ds = tf.keras.utils.image_dataset_from_directory(
            DATASET_DIR,
            seed=SEED,
            image_size=(IMG_SIZE, IMG_SIZE),
            batch_size=BATCH_SIZE,
            label_mode="categorical",
        )
        val_ds = None

    # class_names viene ordenado alfabéticamente por Keras — este es el
    # orden EXACTO que debe coincidir con labels.txt / CATEGORY_MAP.
    class_names = train_ds.class_names
    log(f"Orden de clases (alfabético, usado también en labels.txt): {class_names}")

    num_clases = len(class_names)

    data_augmentation = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.1),
        tf.keras.layers.RandomContrast(0.1),
    ])

    # Normalización estilo MobileNet: [-1, 1]. Debe coincidir con
    # fileToInputTensor() en ai-clasificador.js.
    preprocess = tf.keras.layers.Rescaling(scale=1.0 / 127.5, offset=-1)

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.map(lambda x, y: (data_augmentation(preprocess(x)), y), num_parallel_calls=AUTOTUNE).prefetch(AUTOTUNE)
    if val_ds is not None:
        val_ds = val_ds.map(lambda x, y: (preprocess(x), y), num_parallel_calls=AUTOTUNE).prefetch(AUTOTUNE)

    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(IMG_SIZE, IMG_SIZE, 3),
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3))
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_clases, activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-3),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )

    log("Entrenando cabeza (transfer learning, base congelada)...")
    model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS_HEAD)

    log("Fine-tuning ligero (descongelando últimas capas de MobileNetV2)...")
    base_model.trainable = True
    for layer in base_model.layers[:-30]:
        layer.trainable = False

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    model.fit(train_ds, validation_data=val_ds, epochs=EPOCHS_FINETUNE)

    return model, class_names


# ── 5. Exportar model.tflite + labels.txt ──────────────────────────────────

def exportar(model, class_names):
    log("Convirtiendo a TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(MODEL_OUT, "wb") as f:
        f.write(tflite_model)
    log(f"✅ Modelo exportado: {MODEL_OUT} ({len(tflite_model) / 1024:.1f} KB)")

    with open(LABELS_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(class_names) + "\n")
    log(f"✅ Labels exportados: {LABELS_OUT}")


def limpiar_dataset_temporal():
    import shutil
    if os.path.isdir(DATASET_DIR):
        shutil.rmtree(DATASET_DIR)
        log("Dataset temporal eliminado (no se commitea al repo).")


def main():
    log("=== Iniciando reentrenamiento del modelo de auto-tag de categoría ===")
    filas = leer_catalogo()
    categorias_finales = construir_dataset(filas)
    categorias_finales = validar_dataset_final(categorias_finales)
    model, class_names = entrenar(categorias_finales)
    exportar(model, class_names)
    limpiar_dataset_temporal()
    log("=== Reentrenamiento completado ===")


if __name__ == "__main__":
    main()
