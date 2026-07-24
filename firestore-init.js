/**
 * FirestoreSync.gs
 * ------------------------------------------------------------------
 * Capa de conexión entre Apps Script y Firestore vía la REST API,
 * usando el mismo Service Account que ya usas para FCM/RTDB
 * (Script Property: FCM_SERVICE_ACCOUNT).
 *
 * SOLO se usa para ESCRIBIR (espejo write-through) desde GAS. Las
 * lecturas rápidas del frontend deben ir directo con el SDK de
 * Firestore en el navegador — este archivo no reemplaza eso, solo
 * mantiene los documentos actualizados para que esas lecturas sirvan.
 *
 * SETUP REQUERIDO (una sola vez):
 * 1. En la consola de Firebase del proyecto que uses (el mismo de
 *    FCM/RTDB, u otro), crear una base de datos Firestore en modo
 *    Nativo si aún no existe.
 * 2. Confirmar que el Service Account guardado en FCM_SERVICE_ACCOUNT
 *    tenga el rol "Cloud Datastore User" (o "Editor") en ese proyecto
 *    de GCP. Si el proyecto de Firestore es distinto al de FCM_PROJECT_ID,
 *    agrega la Script Property FIRESTORE_PROJECT_ID con el project_id
 *    correcto.
 * 3. Correr testFirestoreConnection() una vez desde el editor de Apps
 *    Script para confirmar que las credenciales y el scope funcionan.
 * 4. Escribir las Firestore Security Rules restringiendo escritura solo
 *    al Service Account (las escrituras vía este módulo usan un token
 *    OAuth2 de servidor, no pasan por las reglas de cliente, pero igual
 *    hay que bloquear escritura pública desde el SDK del navegador).
 * ------------------------------------------------------------------
 */

function _getFirestoreService() {
  var serviceAccountJson = getSecret("FCM_SERVICE_ACCOUNT");
  var creds = JSON.parse(serviceAccountJson);

  return OAuth2.createService("Firestore")
    .setTokenUrl("https://oauth2.googleapis.com/token")
    .setPrivateKey(creds.private_key)
    .setIssuer(creds.client_email)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope("https://www.googleapis.com/auth/datastore");
}

function _firestoreProjectId() {
  // Si Firestore vive en el mismo proyecto de Firebase que ya usas para
  // FCM, no hace falta configurar nada extra. Si decides usar un
  // proyecto distinto, agrega FIRESTORE_PROJECT_ID en Script Properties.
  return getOptionalSecret("FIRESTORE_PROJECT_ID") || getSecret("FCM_PROJECT_ID");
}

function _firestoreBaseUrl() {
  return "https://firestore.googleapis.com/v1/projects/" + _firestoreProjectId() + "/databases/(default)/documents";
}

// ============================================================
// Conversión JS <-> formato REST de Firestore
// (Firestore REST envuelve cada valor con un descriptor de tipo:
//  {"stringValue": "x"}, {"integerValue": "5"}, etc.)
// ============================================================

function _fsEncodeValue(value) {
  if (value === null || typeof value === 'undefined') return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') {
    return (value % 1 === 0) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(_fsEncodeValue) } };
  }
  if (typeof value === 'object') {
    return { mapValue: { fields: _fsEncodeFields(value) } };
  }
  return { stringValue: String(value) };
}

function _fsEncodeFields(obj) {
  var fields = {};
  Object.keys(obj).forEach(function (key) {
    fields[key] = _fsEncodeValue(obj[key]);
  });
  return fields;
}

function _fsDecodeValue(value) {
  if (!value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(_fsDecodeValue);
  if ('mapValue' in value) return _fsDecodeFields(value.mapValue.fields || {});
  return null;
}

function _fsDecodeFields(fields) {
  var obj = {};
  Object.keys(fields || {}).forEach(function (key) {
    obj[key] = _fsDecodeValue(fields[key]);
  });
  return obj;
}

// ============================================================
// Operaciones CRUD
// ============================================================

/**
 * Crea o actualiza (merge) un documento en Firestore.
 *
 * collectionPath : ej. "beneficiarios_aprobados"
 * docId          : ej. el id del beneficiario/producto/vendedor
 * dataObj        : objeto plano JS con los campos a guardar
 *
 * Usa PATCH + updateMask con TODOS los campos de dataObj. Eso equivale
 * a un "set con merge": crea el doc si no existe, y si ya existía solo
 * toca los campos indicados (no borra campos que otro flujo haya
 * escrito y que dataObj no incluya).
 *
 * Nunca lanza excepción hacia arriba — devuelve true/false. Como dice
 * el plan: la sincronización a Firestore NUNCA debe tumbar la
 * operación principal en Sheets si falla.
 */
function fsMirrorWrite(collectionPath, docId, dataObj) {
  try {
    var service = _getFirestoreService();
    if (!service.hasAccess()) {
      Logger.log('⚠️ Sin acceso OAuth2 para Firestore: ' + service.getLastError());
      return false;
    }

    var fieldNames = Object.keys(dataObj).filter(function (k) { return k !== ''; });
    if (!fieldNames.length) return true; // nada que escribir

    var maskParams = fieldNames
      .map(function (f) { return 'updateMask.fieldPaths=' + encodeURIComponent(f); })
      .join('&');
    var url = _firestoreBaseUrl() + '/' + collectionPath + '/' +
      encodeURIComponent(String(docId)) + '?' + maskParams;

    var payload = { fields: _fsEncodeFields(dataObj) };

    var response = UrlFetchApp.fetch(url, {
      method: 'patch',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + service.getAccessToken() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code >= 200 && code < 300) return true;

    Logger.log('⚠️ fsMirrorWrite falló (' + code + ') en ' + collectionPath + '/' + docId +
      ': ' + response.getContentText());
    return false;
  } catch (err) {
    Logger.log('🔥 ERROR fsMirrorWrite: ' + err.toString());
    return false;
  }
}

/**
 * Borra un documento en Firestore. No es ruidoso si el doc ya no
 * existía (Firestore responde 200 igual sobre un delete de doc
 * inexistente).
 */
function fsMirrorDelete(collectionPath, docId) {
  try {
    var service = _getFirestoreService();
    if (!service.hasAccess()) {
      Logger.log('⚠️ Sin acceso OAuth2 para Firestore (delete): ' + service.getLastError());
      return false;
    }

    var url = _firestoreBaseUrl() + '/' + collectionPath + '/' + encodeURIComponent(String(docId));
    var response = UrlFetchApp.fetch(url, {
      method: 'delete',
      headers: { Authorization: 'Bearer ' + service.getAccessToken() },
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    if (code >= 200 && code < 300) return true;

    Logger.log('⚠️ fsMirrorDelete falló (' + code + ') en ' + collectionPath + '/' + docId +
      ': ' + response.getContentText());
    return false;
  } catch (err) {
    Logger.log('🔥 ERROR fsMirrorDelete: ' + err.toString());
    return false;
  }
}

/**
 * Lectura puntual desde GAS. Poco usada en el patrón final (el
 * frontend debe leer Firestore directo con su propio SDK), pero útil
 * para debug, backfills iniciales y el test de conexión de abajo.
 */
function fsGet(collectionPath, docId) {
  try {
    var service = _getFirestoreService();
    if (!service.hasAccess()) return null;
    var url = _firestoreBaseUrl() + '/' + collectionPath + '/' + encodeURIComponent(String(docId));
    var response = UrlFetchApp.fetch(url, {
      headers: { Authorization: 'Bearer ' + service.getAccessToken() },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) return null;
    var body = JSON.parse(response.getContentText());
    return _fsDecodeFields(body.fields || {});
  } catch (err) {
    Logger.log('🔥 ERROR fsGet: ' + err.toString());
    return null;
  }
}

/**
 * Prueba de conexión de punta a punta: escribe un doc en la colección
 * "_test", lo lee de vuelta, y lo borra. Correr UNA VEZ manualmente
 * desde el editor de Apps Script (▶ Ejecutar con esta función
 * seleccionada) después de completar el setup del encabezado. Revisa
 * el Registro de ejecución para ver el resultado.
 */
function testFirestoreConnection() {
  var ok = fsMirrorWrite('_test', 'ping', { hola: 'mundo', fecha: new Date(), numero: 42 });
  Logger.log('Escritura de prueba: ' + (ok ? 'OK' : 'FALLÓ'));
  if (ok) {
    var leido = fsGet('_test', 'ping');
    Logger.log('Lectura de prueba: ' + JSON.stringify(leido));
    fsMirrorDelete('_test', 'ping');
    Logger.log('Doc de prueba borrado.');
  }
}
