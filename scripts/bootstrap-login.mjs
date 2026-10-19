// One-time bootstrap: a brand-new Firestore project has zero `shop_managers`
// documents, which means nobody can pass the app's PIN login screen yet —
// there's nothing to match against. This writes exactly one manager record
// so you can sign in once and add the rest of your team from Settings.
//
// Run with:  node --env-file=.env scripts/bootstrap-login.mjs
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const auth = getAuth(app);
const db = getFirestore(app);

await signInAnonymously(auth);

const ref = collection(db, "shop_managers");
const existing = await getDocs(ref);

if (!existing.empty) {
  console.log(`shop_managers already has ${existing.size} document(s) — nothing to do.`);
  process.exit(0);
}

await addDoc(ref, { name: "Shop Manager", pin: "1234" });
console.log("Created the first shop_managers document: name=\"Shop Manager\", pin=1234.");
console.log("Sign in with PIN 1234, then go to Configuración to add your real team and change this.");
process.exit(0);
