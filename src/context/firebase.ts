import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";
import type { Firestore } from "firebase/firestore";
import type { FirebaseStorage } from "firebase/storage";

// Modular SDK init (migrated from firebase/compat in July 2026: the compat
// layer eagerly bundled ~230KB gzip on first paint). Every consumer already
// used the modular API against these instances, so only this file changed.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_BACKEND_FIREBASE_API_KEY,
  // Custom auth domain: on the production domain the auth handler is proxied
  // (see netlify.toml "/__/*"), so Google sign-in brands as our own domain and
  // the popup/redirect handshake stays first-party. Everywhere else (local
  // dev, previews) fall back to the project's firebaseapp.com domain.
  authDomain: location.hostname.endsWith("snagemguild.com")
    ? location.hostname
    : import.meta.env.VITE_BACKEND_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_BACKEND_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_BACKEND_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_BACKEND_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_BACKEND_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_BACKEND_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// App Check is opt-in: set VITE_APPCHECK_SITE_KEY (reCAPTCHA v3 site key from
// the Firebase console, App Check section) to enable it. When the variable is
// unset the firebase/app-check chunk never loads. Enforcing App Check on
// Firestore/Storage/Functions is a separate console step.
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_SITE_KEY;
if (appCheckSiteKey) {
  import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  });
}

const auth: Auth = getAuth(app);
// Pin local persistence explicitly (survives tab close/restart, shared across
// tabs). It is the default, but pinning guards against a future SDK/default
// change silently downgrading sessions and logging everyone out.
// Fire-and-forget: it settles before any sign-in call resolves.
setPersistence(auth, browserLocalPersistence).catch(() => undefined);

// Firestore and Storage stay out of the initial bundle: each loads on first
// actual use, matching the dynamic-import pattern every query module uses.
// Both are memoized so repeat callers share one instance.
let dbPromise: Promise<Firestore> | undefined;
async function getDb(): Promise<Firestore> {
  dbPromise ??= import("firebase/firestore").then(({ getFirestore }) => getFirestore(app));
  return dbPromise;
}

let storagePromise: Promise<FirebaseStorage> | undefined;
async function getStorage(): Promise<FirebaseStorage> {
  storagePromise ??= import("firebase/storage").then((m) => m.getStorage(app));
  return storagePromise;
}

export { app, auth, getDb, getStorage };
