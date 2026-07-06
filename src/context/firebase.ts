import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_BACKEND_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_BACKEND_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_BACKEND_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_BACKEND_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_BACKEND_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_BACKEND_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_BACKEND_FIREBASE_MEASUREMENT_ID,
};

firebase.initializeApp(firebaseConfig);

type Auth = firebase.auth.Auth;
type Firestore = firebase.firestore.Firestore;
type Storage = firebase.storage.Storage;
// type Firebase = typeof firebase;

const auth: Auth = firebase.auth();
// Pin local persistence explicitly (survives tab close/restart, shared across tabs).
// It is the compat default, but pinning guards against a future SDK/default change
// silently downgrading sessions and logging everyone out. Fire-and-forget: it settles
// before any sign-in call resolves.
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => undefined);
const db: Firestore = firebase.firestore();
const storage: Storage = firebase.storage();

export { auth, db, storage, firebase };
