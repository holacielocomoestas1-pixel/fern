// firebase-sync.mjs — inicio de sesión y respaldo del progreso con Firebase (v4.3).
//
// Módulo compartido por la app principal (classic scripts, vía window.FernSync)
// y por la Academy (ES modules, vía import). La app funciona 100% sin sesión:
// el login solo añade una copia del progreso en la nube, por cuenta.
//
// Proyecto Firebase: fern-thai-police (plan Spark, gratis), Firestore en
// asia-southeast1. La configuración de abajo es la configuración pública del
// cliente que Firebase muestra para apps web: no es un secreto.
// Reglas de Firestore: cada usuario solo lee/escribe su propio documento
// users/{uid}. Campos: mainRaw, mainUpdatedAt, academyRaw, academyUpdatedAt.
// Regla de fusión: por lado (main / academy), gana la copia con updatedAt
// más reciente; si no hay copia en la nube, se sube la local.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyChua9lY1-quQ8RBL2DK_vIL3U1vV84G9s",
  authDomain: "fern-thai-police.firebaseapp.com",
  projectId: "fern-thai-police",
  storageBucket: "fern-thai-police.firebasestorage.app",
  messagingSenderId: "300376943998",
  appId: "1:300376943998:web:4a988f6b9d176f2f18172f",
};
const SDK_VERSION = "11.0.2";
const META_KEY = "fern-sync-meta";
const EMAIL_LINK_KEY = "fern-email-link";
const EMAIL_LINK_PENDING_KEY = "fern-email-link-pending";
const ACADEMY_KEY = "fern-academia-v1";
// Claves de sincronización que NUNCA entran en la foto del progreso.
const SYNC_KEYS = new Set([META_KEY, EMAIL_LINK_KEY, EMAIL_LINK_PENDING_KEY]);
const MAX_DOC_BYTES = 900000;

let sdk = null; // { auth, db, fns } cuando el SDK de la CDN cargó
let initPromise = null;
let initFailed = false;
let currentUser = null;
let syncStatus = "idle"; // idle | syncing | synced | offline | error
let lastSyncAt = 0;
let syncingNow = false;
let lastSyncedUid = "";
let academyApplyCallback = null;
const listeners = new Set();

function isAcademyPage() {
  return location.pathname.includes("fern-academia");
}

function readMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    const meta = raw ? JSON.parse(raw) : {};
    return { main: Number(meta.main) || 0, academy: Number(meta.academy) || 0 };
  } catch {
    return { main: 0, academy: 0 };
  }
}

function writeMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Sin almacenamiento: la sesión en memoria sigue funcionando.
  }
}

function setStatus(status) {
  if (syncStatus === status) return;
  syncStatus = status;
  emit("status");
}

function emit(kind) {
  const detail = {
    kind,
    user: currentUser
      ? { uid: currentUser.uid, email: currentUser.email || "", displayName: currentUser.displayName || "" }
      : null,
    status: syncStatus,
    lastSyncAt,
  };
  for (const cb of [...listeners]) {
    try { cb(detail); } catch { /* un oyente no debe romper la sync */ }
  }
  try {
    window.dispatchEvent(new CustomEvent("fern-auth", { detail }));
  } catch { /* entorno sin CustomEvent */ }
}

export function onSyncEvent(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSyncInfo() {
  return {
    user: currentUser
      ? { uid: currentUser.uid, email: currentUser.email || "", displayName: currentUser.displayName || "" }
      : null,
    status: syncStatus,
    lastSyncAt,
    ready: !!sdk,
  };
}

export function onAcademyCloudApply(cb) {
  academyApplyCallback = cb;
}

// --- Fotos del progreso local (cadenas tal cual, sin reinterpretar) ---

function snapshotMain() {
  const snap = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || SYNC_KEYS.has(key)) continue;
      if (key.startsWith("fern2-") || key.startsWith("fern-")) {
        snap[key] = localStorage.getItem(key);
      }
    }
  } catch {
    return "";
  }
  const keys = Object.keys(snap);
  if (!keys.length) return "";
  try {
    return JSON.stringify(snap);
  } catch {
    return "";
  }
}

function snapshotAcademy() {
  try {
    return localStorage.getItem(ACADEMY_KEY) || "";
  } catch {
    return "";
  }
}

function applyMainRaw(raw) {
  let snap;
  try {
    snap = JSON.parse(raw);
    if (!snap || typeof snap !== "object" || Array.isArray(snap)) return false;
  } catch {
    return false;
  }
  try {
    const doomed = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || SYNC_KEYS.has(key)) continue;
      if (key.startsWith("fern2-") || key.startsWith("fern-")) doomed.push(key);
    }
    for (const key of doomed) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(snap)) {
      if (typeof value === "string") localStorage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

function applyAcademyRaw(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return false;
    localStorage.setItem(ACADEMY_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

// --- Subida / bajada ---

function docRef() {
  return sdk.fns.doc(sdk.db, "users", currentUser.uid);
}

async function uploadSide(side) {
  if (!sdk || !currentUser) return false;
  const raw = side === "main" ? snapshotMain() : snapshotAcademy();
  if (!raw) return true; // nada local que subir: no es un error
  if (raw.length > MAX_DOC_BYTES) {
    setStatus("error");
    return false;
  }
  const now = Date.now();
  const data = side === "main"
    ? { mainRaw: raw, mainUpdatedAt: now }
    : { academyRaw: raw, academyUpdatedAt: now };
  setStatus("syncing");
  try {
    await sdk.fns.setDoc(docRef(), data, { merge: true });
    const meta = readMeta();
    meta[side] = now;
    writeMeta(meta);
    lastSyncAt = now;
    setStatus("synced");
    return true;
  } catch {
    setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
    return false;
  }
}

let uploadTimers = { main: 0, academy: 0 };

export function scheduleUpload(side) {
  if (!sdk || !currentUser) return;
  clearTimeout(uploadTimers[side]);
  uploadTimers[side] = setTimeout(() => { uploadSide(side); }, 2000);
}

export function noteLocalChange(side) {
  const meta = readMeta();
  meta[side] = Date.now();
  writeMeta(meta);
  scheduleUpload(side);
}

async function syncOnSignIn() {
  if (!sdk || !currentUser || syncingNow) return;
  syncingNow = true;
  try {
    setStatus("syncing");
    let cloud = {};
    try {
      const snap = await sdk.fns.getDoc(docRef());
      if (snap.exists()) cloud = snap.data() || {};
    } catch {
      setStatus(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error");
      return;
    }
    const meta = readMeta();
    let mainApplied = false;
    let academyApplied = false;

    // Lado principal
    const localMain = snapshotMain();
    if (cloud.mainRaw && Number(cloud.mainUpdatedAt) > meta.main && cloud.mainRaw !== localMain) {
      if (applyMainRaw(cloud.mainRaw)) {
        meta.main = Number(cloud.mainUpdatedAt);
        mainApplied = true;
      }
    } else if (localMain && (!cloud.mainRaw || meta.main > Number(cloud.mainUpdatedAt || 0))) {
      await uploadSide("main");
    }

    // Lado Academy
    const localAcademy = snapshotAcademy();
    if (cloud.academyRaw && Number(cloud.academyUpdatedAt) > meta.academy && cloud.academyRaw !== localAcademy) {
      if (applyAcademyRaw(cloud.academyRaw)) {
        meta.academy = Number(cloud.academyUpdatedAt);
        academyApplied = true;
      }
    } else if (localAcademy && (!cloud.academyRaw || meta.academy > Number(cloud.academyUpdatedAt || 0))) {
      await uploadSide("academy");
    }

    writeMeta(meta);
    lastSyncAt = Date.now();
    if (syncStatus === "syncing") setStatus("synced");

    // Aplicar en caliente según la página actual.
    if (mainApplied && !isAcademyPage()) {
      // La app principal lee el progreso al arrancar: recargar es la forma
      // segura de rehidratarlo. El meta ya quedó al día, así que no hay bucle.
      location.reload();
      return;
    }
    if (academyApplied && isAcademyPage() && academyApplyCallback) {
      academyApplyCallback();
    }
  } finally {
    syncingNow = false;
  }
}

// --- Autenticación ---

async function ensureInit() {
  if (sdk) return true;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const base = `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-auth.js`),
        import(`${base}/firebase-firestore.js`),
      ]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      sdk = {
        auth, db,
        fns: {
          doc: fsMod.doc, getDoc: fsMod.getDoc, setDoc: fsMod.setDoc,
          GoogleAuthProvider: authMod.GoogleAuthProvider,
          signInWithPopup: authMod.signInWithPopup,
          signInWithRedirect: authMod.signInWithRedirect,
          getRedirectResult: authMod.getRedirectResult,
          sendSignInLinkToEmail: authMod.sendSignInLinkToEmail,
          isSignInWithEmailLink: authMod.isSignInWithEmailLink,
          signInWithEmailLink: authMod.signInWithEmailLink,
          signOut: authMod.signOut,
          onAuthStateChanged: authMod.onAuthStateChanged,
        },
      };
      initFailed = false;

      // Resultado de un inicio con redirección (móviles donde el popup falla).
      try { await sdk.fns.getRedirectResult(auth); } catch { /* no había redirección */ }

      sdk.fns.onAuthStateChanged(auth, user => {
        currentUser = user || null;
        if (user) {
          // Inicio nuevo o sesión persistente al abrir la app: sincronizar
          // una sola vez por sesión (lastSyncedUid evita repetirlo).
          if (user.uid !== lastSyncedUid) {
            lastSyncedUid = user.uid;
            syncOnSignIn();
          }
        } else {
          lastSyncedUid = "";
          setStatus("idle");
        }
        emit("auth");
      });
      return true;
    } catch {
      initFailed = true;
      setStatus("offline");
      initPromise = null; // reintentar en la próxima acción del usuario
      return false;
    }
  })();
  return initPromise;
}

export function initFirebaseSync() {
  ensureInit();
  // Sin await: la app nunca espera a Firebase para arrancar.
}

export async function signInWithGoogle() {
  const ok = await ensureInit();
  if (!ok) throw new Error("firebase-unavailable");
  const provider = new sdk.fns.GoogleAuthProvider();
  try {
    await sdk.fns.signInWithPopup(sdk.auth, provider);
  } catch (err) {
    const code = err && err.code ? err.code : "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || code === "auth/popup-closed-by-user") {
      if (code === "auth/popup-closed-by-user") throw err;
      await sdk.fns.signInWithRedirect(sdk.auth, provider);
      return; // la página recarga y getRedirectResult completa el inicio
    }
    throw err;
  }
}

export async function sendEmailLink(email) {
  const ok = await ensureInit();
  if (!ok) throw new Error("firebase-unavailable");
  const actionCodeSettings = {
    url: location.origin + location.pathname,
    handleCodeInApp: true,
  };
  await sdk.fns.sendSignInLinkToEmail(sdk.auth, email, actionCodeSettings);
  try {
    localStorage.setItem(EMAIL_LINK_KEY, email);
    localStorage.setItem(EMAIL_LINK_PENDING_KEY, "1");
  } catch { /* sin almacenamiento: el enlace igual llega al correo */ }
}

export function emailLinkNeedsEmail() {
  if (!sdk) return false;
  try {
    if (!sdk.fns.isSignInWithEmailLink(sdk.auth, location.href)) return false;
    return !localStorage.getItem(EMAIL_LINK_KEY);
  } catch {
    return false;
  }
}

export async function completeEmailLink(email) {
  const ok = await ensureInit();
  if (!ok) throw new Error("firebase-unavailable");
  await sdk.fns.signInWithEmailLink(sdk.auth, email, location.href);
  try {
    localStorage.removeItem(EMAIL_LINK_KEY);
    localStorage.removeItem(EMAIL_LINK_PENDING_KEY);
  } catch { /* no pasa nada */ }
}

export async function signOutUser() {
  const ok = await ensureInit();
  if (!ok) throw new Error("firebase-unavailable");
  await sdk.fns.signOut(sdk.auth);
}

// Completar un enlace de correo abierto en ESTE dispositivo (el correo se
// guardó al enviar el enlace). Se ejecuta solo al arrancar, sin molestar.
async function maybeCompleteEmailLink() {
  const ok = await ensureInit();
  if (!ok) return;
  try {
    if (!sdk.fns.isSignInWithEmailLink(sdk.auth, location.href)) return;
    const email = localStorage.getItem(EMAIL_LINK_KEY);
    if (!email) return; // la UI pedirá el correo para completarlo
    await completeEmailLink(email);
    // Limpiar la URL del enlace para no reintentarlo al recargar.
    try { history.replaceState(null, "", location.pathname); } catch { /* la URL con el enlace no rompe nada */ }
  } catch {
    // Enlace inválido o vencido: la usuaria puede pedir otro desde su perfil.
    try {
      localStorage.removeItem(EMAIL_LINK_KEY);
      localStorage.removeItem(EMAIL_LINK_PENDING_KEY);
    } catch { /* no pasa nada */ }
  }
}

// Arranque: cargar el SDK en segundo plano y completar enlaces si los hay.
initFirebaseSync();
maybeCompleteEmailLink();

// API global para los scripts clásicos de la app principal.
window.FernSync = {
  getSyncInfo,
  signInWithGoogle,
  sendEmailLink,
  completeEmailLink,
  signOutUser,
  noteLocalChange,
  scheduleUpload,
  emailLinkNeedsEmail,
  initFirebaseSync,
};
