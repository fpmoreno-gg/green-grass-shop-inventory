import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// True once a real Firebase project is configured via .env (see .env.example).
// While false, the app runs fully in "demo mode" against src/data/local.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  try {
    // Offline persistence: the crew works job sites with spotty signal, so
    // reads come from an IndexedDB cache instantly and writes made offline
    // queue locally and sync automatically once the connection returns.
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // IndexedDB unavailable (e.g. private browsing) — fall back to the
    // default in-memory cache; the app still works, just without offline support.
    db = getFirestore(app);
  }
}

export { app, auth, db };

// Firestore security rules require an authenticated request. The app itself
// gates access with a shop PIN (see src/lib/auth.tsx) — this anonymous sign-in
// only satisfies `request.auth != null` in firestore.rules.
//
// Shared promise: every subscription and write calls this at startup at the
// same moment, and each one used to see `currentUser === null` (the persisted
// session hadn't been restored yet) and start its own sign-in — minting a new
// anonymous user per call, and failing outright when opened without signal.
let authPromise: Promise<void> | null = null;

export function ensureFirebaseAuth(): Promise<void> {
  if (!auth) return Promise.resolve();
  const a = auth;
  authPromise ??= (async () => {
    await a.authStateReady();
    if (!a.currentUser) await signInAnonymously(a);
  })().catch((err) => {
    authPromise = null;
    throw err;
  });
  return authPromise;
}
