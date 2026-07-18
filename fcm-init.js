
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyAaOe_lxLdQtTFCtw2BDR8KZRSafEMkkes",
  authDomain: "znr-live.firebaseapp.com",
  databaseURL: "https://znr-live-default-rtdb.firebaseio.com",
  projectId: "znr-live",
  storageBucket: "znr-live.firebasestorage.app",
  messagingSenderId: "1038143238323",
  appId: "1:1038143238323:web:5171b9dd8823628086c0c6"
};

const VAPID_KEY = "BBnC4VSj0bWV72W9zZeXQUvDSybe8ccZTMhSjtu13gABzbzE1WqwVQ8kCxkcrFk3pTSzrasf978ZqWdsaUgly9o";

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * Manda el token al backend (Apps Script) para guardarlo asociado
 * a un vendedor o cliente.
 */
async function registrarTokenFCM(ownerType, ownerId, token) {
  const API_URL = window.API_URL;
  if (!API_URL || !ownerType || !ownerId || !token) return false;
  try {
    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "guardarTokenFCM",
        ownerType,
        ownerId,
        token,
        userAgent: navigator.userAgent
      })
    });
    return true;
  } catch (err) {
    console.error("No se pudo guardar el token FCM:", err);
    return false;
  }
}


async function solicitarPermisoNotificacionesSiFalta(ownerType, ownerId) {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

    // Ya se decidió "denied" antes → JS no puede volver a preguntar, respetamos eso
    if (Notification.permission === "denied") return null;

    // Nunca se ha preguntado → aquí sale el diálogo nativo del navegador
    if (Notification.permission === "default") {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") return null;
    }

    // permission === "granted" (recién otorgado o ya lo tenía de antes)
    const registration = await navigator.serviceWorker.register("/znr/firebase-messaging-sw.js");
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) return null;

    if (ownerType && ownerId) {
      await registrarTokenFCM(ownerType, ownerId, token);
    }

    return token;

  } catch (err) {
    console.error("Error solicitando permiso de notificaciones:", err);
    return null;
  }
}

// Notificaciones recibidas MIENTRAS la app está abierta en primer plano
onMessage(messaging, (payload) => {
  console.log("🔔 Push recibido en primer plano:", payload);
  const { title, body } = payload.notification || {};
  if (title && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/znr/logo.svg" });
  }
  window.dispatchEvent(new CustomEvent('ZNR:nueva-notificacion'));
});

// Se exponen para usarlas desde common.js / comunidad.js (scripts normales, no módulo)
window.solicitarPermisoNotificacionesSiFalta = solicitarPermisoNotificacionesSiFalta;
window.registrarTokenFCM = registrarTokenFCM;
