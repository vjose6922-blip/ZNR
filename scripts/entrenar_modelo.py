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
import json
import time
import urllib.request
import urllib.error
from collections import defaultdict

import numpy as np
import tensorflow as tf
from PIL import Image
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest

# ── Configuración ──────────────────────────────────────────────────────────

CATALOGO_CSV_URL = os.environ.get("CATALOGO_CSV_URL", "").strip()
# API key de Google Cloud con la Drive API habilitada. Usar la API oficial
# es mucho más confiable que el truco de "uc?export=download", que Google
# bloquea cada vez más seguido cuando la solicitud viene de una IP de
# datacenter (como los runners de GitHub Actions).
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "").strip()

# Service account de Firebase (mismo JSON que ya usas como FCM_SERVICE_ACCOUNT
# en Apps Script — hay que copiarlo también como secret de GitHub Actions,
# ya que este workflow corre fuera de Apps Script y no puede leer sus
# Propiedades del script). Si no está configurado, el entrenamiento sigue
# funcionando normal — simplemente no se suben/actualizan embeddings.
FIREBASE_SERVICE_ACCOUNT_JSON = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
FIREBASE_RTDB_URL = "https://znr-live-default-rtdb.firebaseio.com"
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
EMBEDDINGS_DIR = os.path.join(REPO_ROOT, "_embeddings_temp")
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
    col_id = fieldnames_lower.get("id")

    if not col_categoria or not col_imagen:
        log(f"❌ No se encontraron las columnas esperadas. Columnas detectadas: {fieldnames}")
        log("   Ajusta COL_CATEGORIA_CANDIDATOS / COL_IMAGEN_CANDIDATOS en este script a tus nombres reales.")
        sys.exit(1)

    log(f"Columna de categoría detectada: '{col_categoria}' | columna de imagen: '{col_imagen}'"
        + (f" | columna de estado: '{col_estado}'" if col_estado else "")
        + (f" | columna de id: '{col_id}'" if col_id else ""))

    filas = []
    descartadas_por_estado = 0
    for row in reader:
        categoria = (row.get(col_categoria) or "").strip()
        imagen = (row.get(col_imagen) or "").strip()
        producto_id = (row.get(col_id) or "").strip() if col_id else ""
        if col_estado:
            estado = (row.get(col_estado) or "").strip().lower()
            if estado and estado != "aprobado":
                descartadas_por_estado += 1
                continue
        if categoria and imagen:
            filas.append({"id": producto_id, "categoria": categoria, "imagen": imagen})

    if descartadas_por_estado:
        log(f"Filas descartadas por no estar aprobadas (estado != 'aprobado'): {descartadas_por_estado}")

    log(f"Filas válidas leídas del catálogo: {len(filas)}")
    return filas


# ── 2. Descargar fotos (Drive API v3 oficial; fallback al truco de enlace) ──

def extraer_drive_id(url):
    """Extrae el ID de archivo de Drive de varios formatos de link posibles."""
    m = re.search(r"/file/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    m = re.search(r"[?&]id=([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    m = re.search(r"lh3\.googleusercontent\.com/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    return None


MAGIC_BYTES = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
    b"GIF87a": "gif",
    b"GIF89a": "gif",
    b"BM": "bmp",
}


def _es_imagen_valida(data):
    """Revisa los primeros bytes del archivo para confirmar que es una imagen
    real (JPEG/PNG/GIF/BMP/WEBP) y no una página HTML de error/advertencia de Drive."""
    if not data or len(data) < 100:
        return False
    for firma in MAGIC_BYTES:
        if data.startswith(firma):
            return True
    # WEBP: 'RIFF' + 4 bytes de tamaño + 'WEBP' (el tamaño varía, así que
    # revisamos los bytes 8-12 en vez de un prefijo fijo).
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True
    return False


def _extraer_confirm_token(html_bytes):
    """Fallback: cuando Drive no puede confirmar la descarga automáticamente
    vía el link público, devuelve una página HTML con un token de
    confirmación. Solo se usa si no hay GOOGLE_API_KEY configurada."""
    try:
        texto = html_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return None
    m = re.search(r'confirm=([0-9A-Za-z_-]+)', texto)
    return m.group(1) if m else None


def _descargar_via_drive_api(drive_id):
    """Método principal y confiable: Drive API v3 oficial. Requiere que el
    archivo tenga permiso "Cualquiera con el enlace puede ver" (ya es el caso,
    dado que estas fotos ya se muestran públicamente en la app)."""
    url = f"https://www.googleapis.com/drive/v3/files/{drive_id}?alt=media&key={GOOGLE_API_KEY}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def _descargar_via_link_publico(drive_id):
    """Fallback legado (menos confiable): el truco de uc?export=download.
    Google lo bloquea cada vez más seguido desde IPs de datacenter."""
    url = f"https://drive.google.com/uc?export=download&id={drive_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = resp.read()

    if not _es_imagen_valida(data):
        token = _extraer_confirm_token(data)
        if token:
            url_confirm = f"https://drive.google.com/uc?export=download&confirm={token}&id={drive_id}"
            req2 = urllib.request.Request(url_confirm, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req2, timeout=20) as resp2:
                data = resp2.read()
    return data


def descargar_imagen(url, destino, intentos=3, debug_log=None):
    drive_id = extraer_drive_id(url)
    metodo = "drive_api" if (drive_id and GOOGLE_API_KEY) else ("link_publico" if drive_id else "url_directa")

    for intento in range(intentos):
        try:
            if drive_id and GOOGLE_API_KEY:
                data = _descargar_via_drive_api(drive_id)
            elif drive_id:
                data = _descargar_via_link_publico(drive_id)
            else:
                # No es un link de Drive reconocible; se asume URL directa de otro hosting.
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read()

            if not _es_imagen_valida(data):
                snippet = data[:300].decode("utf-8", errors="replace") if data else "(respuesta vacía)"
                if debug_log is not None and len(debug_log) < 3:
                    debug_log.append(f"[método={metodo}, drive_id={drive_id}] respuesta recibida: {snippet}")
                raise ValueError("La respuesta no es una imagen válida (probablemente una página de error/advertencia de Drive)")

            # Convertimos siempre a JPEG real con Pillow, sin importar el
            # formato original (WEBP, PNG, etc.) — TensorFlow solo decodifica
            # de forma nativa JPEG/PNG/GIF/BMP, así que normalizamos aquí para
            # evitar errores de "Unknown image file format" al entrenar.
            with Image.open(io.BytesIO(data)) as img:
                img = img.convert("RGB")
                img.save(destino, "JPEG", quality=90)
            return True
        except urllib.error.HTTPError as e:
            try:
                cuerpo = e.read()[:300].decode("utf-8", errors="replace")
            except Exception:
                cuerpo = "(no se pudo leer el cuerpo del error)"
            if debug_log is not None and len(debug_log) < 3:
                debug_log.append(f"[método={metodo}, drive_id={drive_id}] HTTP {e.code}: {cuerpo}")
            if intento == intentos - 1:
                log(f"  ⚠️ No se pudo descargar (drive_id={drive_id}): HTTP {e.code} - {cuerpo}")
                return False
            time.sleep(1.5)
        except Exception as e:
            if intento == intentos - 1:
                log(f"  ⚠️ No se pudo descargar (drive_id={drive_id}): {e}")
                return False
            time.sleep(1.5)
    return False


def construir_dataset(filas):
    conteo = defaultdict(int)
    por_categoria = defaultdict(list)
    for fila in filas:
        por_categoria[fila["categoria"]].append(fila["imagen"])

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
    debug_log = []
    for categoria in sorted(categorias_validas.keys()):
        carpeta = os.path.join(DATASET_DIR, categoria.replace("/", "-"))
        os.makedirs(carpeta, exist_ok=True)
        urls = categorias_validas[categoria]
        log(f"Descargando {len(urls)} fotos para categoría '{categoria}'...")
        n_ok = 0
        for i, url in enumerate(urls):
            destino = os.path.join(carpeta, f"{i:04d}.jpg")
            if descargar_imagen(url, destino, debug_log=debug_log):
                n_ok += 1
        conteo[categoria] = n_ok
        log(f"  ✅ {n_ok}/{len(urls)} descargadas para '{categoria}'")

    if debug_log:
        log("── Diagnóstico de las primeras descargas fallidas (para depurar) ──")
        for linea in debug_log:
            log(f"  🔍 {linea}")

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
    x = tf.keras.layers.GlobalAveragePooling2D(name="embedding_pool")(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(num_clases, activation="softmax", name="categoria_softmax")(x)
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

    return model, class_names, base_model


# ── 5. Exportar model.tflite + labels.txt ──────────────────────────────────

def exportar(model, class_names, base_model):
    log("Preparando modelo de inferencia con forma de entrada fija (batch=1) y dos salidas...")
    # El modelo se entrenó con lote flexible (necesario para batches de 16+
    # durante el entrenamiento). Pero LiteRT.js en el navegador exige que el
    # tensor de entrada coincida EXACTAMENTE con la forma del modelo
    # exportado, incluyendo la dimensión de lote — con lote dinámico (-1)
    # rechaza el tensor [1, 224, 224, 3] con un error de "ranked tensor type".
    #
    # Además, exportamos DOS salidas en el mismo modelo (una sola pasada del
    # navegador sirve para ambas cosas, sin cargar/correr un modelo aparte):
    #   1. clasificacion: probabilidades de categoría (auto-tag, como antes)
    #   2. embedding: vector de 1280 números (huella visual de la foto, para
    #      el buscador por similitud de Comunidad)
    # GlobalAveragePooling2D no tiene pesos propios, así que recrearla aquí
    # es matemáticamente idéntica a la usada en entrenamiento — solo
    # reutilizamos base_model y la capa Dense ya entrenados (con sus pesos).
    entrada_fija = tf.keras.Input(shape=(IMG_SIZE, IMG_SIZE, 3), batch_size=1)
    features = base_model(entrada_fija, training=False)
    embedding = tf.keras.layers.GlobalAveragePooling2D(name="embedding_export")(features)
    capa_clasificacion = model.get_layer("categoria_softmax")
    clasificacion = capa_clasificacion(embedding)
    modelo_inferencia = tf.keras.Model(entrada_fija, [clasificacion, embedding])

    log("Convirtiendo a TFLite...")
    converter = tf.lite.TFLiteConverter.from_keras_model(modelo_inferencia)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model = converter.convert()

    with open(MODEL_OUT, "wb") as f:
        f.write(tflite_model)
    log(f"✅ Modelo exportado: {MODEL_OUT} ({len(tflite_model) / 1024:.1f} KB) — 2 salidas: clasificación + embedding")

    with open(LABELS_OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(class_names) + "\n")
    log(f"✅ Labels exportados: {LABELS_OUT}")

    # Devolvemos un extractor de embeddings en Python puro (Keras, sin pasar
    # por TFLite) para calcular la huella visual de TODO el catálogo en este
    # mismo proceso de entrenamiento — mismo cálculo, mismos pesos.
    extractor_embedding = tf.keras.Model(entrada_fija, embedding)
    return extractor_embedding


def limpiar_dataset_temporal():
    import shutil
    if os.path.isdir(DATASET_DIR):
        shutil.rmtree(DATASET_DIR)
        log("Dataset temporal eliminado (no se commitea al repo).")


# ── 6. Embeddings del catálogo completo (búsqueda visual en Comunidad) ─────

def generar_embeddings_catalogo_completo(filas, extractor_embedding):
    """Calcula la huella visual (embedding) de CADA producto aprobado con
    foto válida, sin importar si su categoría se usó o no para entrenar el
    clasificador — el buscador visual de Comunidad necesita cobertura de
    todo el catálogo, no solo de las categorías con suficientes fotos."""
    filas_con_id = [f for f in filas if f.get("id")]
    if len(filas_con_id) < len(filas):
        log(f"⚠️ {len(filas) - len(filas_con_id)} filas sin columna 'id' reconocible, se omiten del cálculo de embeddings.")

    log(f"Calculando embeddings para todo el catálogo ({len(filas_con_id)} productos con id + foto)...")
    os.makedirs(EMBEDDINGS_DIR, exist_ok=True)

    embeddings = {}
    debug_log = []
    ok, fallidos = 0, 0
    for fila in filas_con_id:
        producto_id = fila["id"]
        destino = os.path.join(EMBEDDINGS_DIR, f"{producto_id}.jpg")
        if not descargar_imagen(fila["imagen"], destino, debug_log=debug_log):
            fallidos += 1
            continue
        try:
            with Image.open(destino) as img:
                img = img.convert("RGB").resize((IMG_SIZE, IMG_SIZE))
                arr = np.asarray(img, dtype=np.float32)
                arr = (arr / 127.5) - 1.0
                arr = np.expand_dims(arr, axis=0)  # [1, 224, 224, 3]
            vector = extractor_embedding.predict(arr, verbose=0)[0]
            # Redondeado a 5 decimales: precisión de sobra para similitud de
            # coseno, y reduce el tamaño del JSON que se sube/descarga.
            embeddings[producto_id] = [round(float(v), 5) for v in vector]
            ok += 1
        except Exception as e:
            log(f"  ⚠️ No se pudo calcular embedding para producto {producto_id}: {e}")
            fallidos += 1
        finally:
            try:
                os.remove(destino)
            except OSError:
                pass

    log(f"Embeddings calculados: {ok} ok, {fallidos} fallidos de {len(filas_con_id)}.")
    return embeddings


def _obtener_token_firebase():
    if not FIREBASE_SERVICE_ACCOUNT_JSON:
        return None
    try:
        info = json.loads(FIREBASE_SERVICE_ACCOUNT_JSON)
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=[
                "https://www.googleapis.com/auth/firebase.database",
                "https://www.googleapis.com/auth/userinfo.email",
            ],
        )
        creds.refresh(GoogleAuthRequest())
        return creds.token
    except Exception as e:
        log(f"⚠️ No se pudo autenticar con el service account de Firebase: {e}")
        return None


def subir_embeddings_firebase(embeddings):
    """Sube TODOS los embeddings en una sola llamada (PATCH a la raíz de
    /embeddings), en vez de una petición por producto — mucho más eficiente
    para GitHub Actions y para el límite de bandwidth del plan gratuito."""
    if not embeddings:
        log("⚠️ No hay embeddings para subir.")
        return

    token = _obtener_token_firebase()
    if not token:
        log("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON no configurado (o inválido) — "
            "los embeddings NO se subieron a Firebase. El auto-tag de categoría "
            "no se ve afectado, solo el buscador visual de Comunidad.")
        return

    url = f"{FIREBASE_RTDB_URL}/embeddings.json"
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(embeddings).encode("utf-8"),
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            method="PATCH",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            if resp.status == 200:
                log(f"✅ {len(embeddings)} embeddings subidos a Firebase RTDB ({FIREBASE_RTDB_URL}/embeddings).")
            else:
                log(f"⚠️ Firebase respondió con estado {resp.status} al subir embeddings.")
    except urllib.error.HTTPError as e:
        cuerpo = e.read()[:300].decode("utf-8", errors="replace")
        log(f"⚠️ Error subiendo embeddings a Firebase: HTTP {e.code} - {cuerpo}")
    except Exception as e:
        log(f"⚠️ Error subiendo embeddings a Firebase: {e}")


def limpiar_embeddings_temporal():
    import shutil
    if os.path.isdir(EMBEDDINGS_DIR):
        shutil.rmtree(EMBEDDINGS_DIR)


def main():
    log("=== Iniciando reentrenamiento del modelo de auto-tag de categoría ===")
    if not GOOGLE_API_KEY:
        log("⚠️ GOOGLE_API_KEY no configurada — usando el truco de link público de Drive "
            "(menos confiable, Google lo bloquea seguido desde IPs de datacenter). "
            "Agrega el secret GOOGLE_API_KEY para descargas confiables.")
    if not FIREBASE_SERVICE_ACCOUNT_JSON:
        log("⚠️ FIREBASE_SERVICE_ACCOUNT_JSON no configurada — el modelo se entrena "
            "normal, pero no se subirán/actualizarán los embeddings del buscador "
            "visual de Comunidad en este reentrenamiento.")

    filas = leer_catalogo()
    categorias_finales = construir_dataset(filas)
    categorias_finales = validar_dataset_final(categorias_finales)
    model, class_names, base_model = entrenar(categorias_finales)
    extractor_embedding = exportar(model, class_names, base_model)
    limpiar_dataset_temporal()

    embeddings = generar_embeddings_catalogo_completo(filas, extractor_embedding)
    subir_embeddings_firebase(embeddings)
    limpiar_embeddings_temporal()

    log("=== Reentrenamiento completado ===")


if __name__ == "__main__":
    main()
