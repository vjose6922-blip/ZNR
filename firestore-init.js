/**
 * firestore-init.js
 * ------------------------------------------------------------------
 * Inicializa Firestore en el frontend y expone helpers de lectura en
 * window.znrFirestore para que scripts clásicos (no-módulo) como
 * comunidad.js puedan usarlos sin convertirse ellos mismos en módulos.
 *
 * Usa getApps()/getApp() para reutilizar la instancia de Firebase si
 * fcm-init.js (u otro módulo) ya la inicializó en la misma página, y
 * evitar el error "Firebase App named '[DEFAULT]' already exists".
 *
 * IMPORTANTE: agrega el <script type="module" src="firestore-init.js">
 * ANTES del <script src="comunidad.js" defer"> en el HTML, para que
 * window.znrFirestore ya exista cuando comunidad.js se ejecute.
 * ------------------------------------------------------------------
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore-lite.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaOe_lxLdQtTFCtw2BDR8KZRSafEMkkes",
  authDomain: "znr-live.firebaseapp.com",
  databaseURL: "https://znr-live-default-rtdb.firebaseio.com",
  projectId: "znr-live",
  storageBucket: "znr-live.firebasestorage.app",
  messagingSenderId: "1038143238323",
  appId: "1:1038143238323:web:5171b9dd8823628086c0c6"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.znrFirestore = window.znrFirestore || {};

/**
 * Pide un Firebase Custom Token a GAS e inicia sesión en Firebase Auth
 * con él. Debe llamarse ANTES de leer colecciones protegidas por
 * auth.uid (notificaciones_centro, ventas_comunidad). Devuelve el uid
 * con el que quedó autenticado, o null si falló (en cuyo caso el
 * caller debe seguir usando GAS normalmente, sin Firestore).
 *
 * ownerType: 'vendedor' | 'cliente'
 * ownerRef:  vendorToken (si es vendedor) o teléfono a 10 dígitos (si es cliente)
 */
window.znrFirestore.signIn = async function (ownerType, ownerRef) {
  try {
    const params = new URLSearchParams();
    params.append('action', 'obtenerFirebaseToken');
    if (ownerType === 'vendedor') params.append('vendorToken', ownerRef);
    else params.append('telefono', ownerRef);

    const res = await fetch(window.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // mismo patrón que window.apiFetch
      body: params.toString()
    });
    const data = await res.json();
    if (!data.ok || !data.firebaseToken) {
      console.warn('No se pudo obtener firebaseToken:', data.error);
      return null;
    }

    const cred = await signInWithCustomToken(auth, data.firebaseToken);
    return cred.user.uid; // debería coincidir con data.uid
  } catch (err) {
    console.warn('signIn de Firebase falló:', err);
    return null;
  }
};

/**
 * Devuelve { ok: true, beneficiarios: [...] } igual que el endpoint GAS
 * obtenerBeneficiariosAprobados, o { ok: false, error } si algo falla
 * (el caller debe hacer fallback a GAS en ese caso).
 */
window.znrFirestore.getBeneficiariosAprobados = async function () {
  try {
    const snap = await getDocs(collection(db, 'beneficiarios_aprobados'));
    const beneficiarios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return { ok: true, beneficiarios };
  } catch (err) {
    console.warn('Firestore beneficiarios_aprobados falló, se usará GAS como respaldo:', err);
    return { ok: false, error: String(err) };
  }
};

/**
 * Devuelve { ok: true, promedio, total, detalle } igual que el endpoint
 * GAS obtenerCalificacionesVendedor, o { ok: false, error } si falla
 * (el caller debe hacer fallback a GAS en ese caso). Si el vendedor
 * todavía no tiene calificaciones, el doc puede no existir todavía en
 * Firestore (nunca se escribió) — en ese caso también se cae a GAS,
 * que sabe devolver el resumen en cero de forma segura.
 */
window.znrFirestore.getCalificacionesVendedor = async function (vendedorUid) {
  try {
    const snap = await getDoc(doc(db, 'calificaciones_vendedor', vendedorUid));
    if (!snap.exists()) return { ok: false, error: 'doc no encontrado' };
    const data = snap.data();
    return { ok: true, promedio: data.promedio, total: data.total, detalle: data.detalle || [] };
  } catch (err) {
    console.warn('Firestore calificaciones_vendedor falló, se usará GAS como respaldo:', err);
    return { ok: false, error: String(err) };
  }
};

/**
 * Asegura que haya una sesión de Firebase Auth con el uid esperado
 * ("vendedor_<id>" o "cliente_<id>"). Si ya está autenticado como ese
 * uid, no hace ninguna llamada de red. Si no, pide un custom token a
 * GAS e inicia sesión. Una vez logueado, Firebase mantiene la sesión
 * sola entre recargas de página (no hay que repetir esto en cada
 * visita, solo cuando cambia de identidad o no hay sesión).
 *
 * ownerRef: vendorToken (si ownerType === 'vendedor') o teléfono (si 'cliente')
 */
window.znrFirestore.ensureSignedIn = async function (ownerType, ownerId, ownerRef) {
  const expectedUid = ownerType + '_' + String(ownerId);
  if (auth.currentUser && auth.currentUser.uid === expectedUid) return expectedUid;
  return await window.znrFirestore.signIn(ownerType, ownerRef);
};

function _fsNormalizarFecha(data) {
  if (data && data.fecha && typeof data.fecha.toDate === 'function') {
    data.fecha = data.fecha.toDate().toISOString();
  }
  return data;
}

/**
 * Devuelve { ok: true, notificaciones: [...] } igual que
 * misNotificacionesVendedor/misNotificacionesCliente (últimas 30, más
 * recientes primero), o { ok: false, error } si falla o si no hay
 * sesión de Firebase (el caller debe hacer fallback a GAS).
 *
 * ownerType: 'vendedor' | 'cliente'
 * ownerId:   vendor.uid (vendedor) o teléfono (cliente)
 * ownerRef:  vendorToken (vendedor) o teléfono (cliente) — lo que
 *            necesita GAS para emitir el custom token
 */
window.znrFirestore.getNotificacionesCentro = async function (ownerType, ownerId, ownerRef) {
  try {
    const uid = await window.znrFirestore.ensureSignedIn(ownerType, ownerId, ownerRef);
    if (!uid) return { ok: false, error: 'sin sesión de Firebase' };

    const q = query(
      collection(db, 'notificaciones_centro', ownerType + '_' + String(ownerId), 'items'),
      orderBy('fecha', 'desc'),
      limit(30)
    );
    const snap = await getDocs(q);
    const notificaciones = snap.docs.map(d => _fsNormalizarFecha({ id: d.id, ownerType, ...d.data() }));
    return { ok: true, notificaciones };
  } catch (err) {
    console.warn('Firestore notificaciones_centro falló, se usará GAS como respaldo:', err);
    return { ok: false, error: String(err) };
  }
};

/**
 * Devuelve { ok: true, notificaciones: [...] } igual que
 * listarNotificacionesVentaComunidad (un objeto por pedido agrupado),
 * o { ok: false, error } si falla (el caller debe hacer fallback a GAS).
 */
window.znrFirestore.getVentasComunidadVendedor = async function (vendorUid, vendorToken) {
  try {
    const uid = await window.znrFirestore.ensureSignedIn('vendedor', vendorUid, vendorToken);
    if (!uid) return { ok: false, error: 'sin sesión de Firebase' };

    const snap = await getDocs(collection(db, 'ventas_comunidad', vendorUid, 'pedidos'));
    const notificaciones = snap.docs.map(d => _fsNormalizarFecha(d.data()));
    return { ok: true, notificaciones };
  } catch (err) {
    console.warn('Firestore ventas_comunidad falló, se usará GAS como respaldo:', err);
    return { ok: false, error: String(err) };
  }
};

