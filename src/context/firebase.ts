import { initializeApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

// Modular SDK init (migrated from firebase/compat in July 2026: the compat
// layer eagerly bundled ~230KB gzip on first paint). Every consumer already
// used the modular API against these instances, so only this file changed.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_BACKEND_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_BACKEND_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_BACKEND_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_BACKEND_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_BACKEND_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_BACKEND_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_BACKEND_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

const auth: Auth = getAuth(app);
// Pin local persistence explicitly (survives tab close/restart, shared across
// tabs). It is the default, but pinning guards against a future SDK/default
// change silently downgrading sessions and logging everyone out.
// Fire-and-forget: it settles before any sign-in call resolves.
setPersistence(auth, browserLocalPersistence).catch(() => undefined);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);

export { app, auth, db, storage };
