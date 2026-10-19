// Importa el catálogo de herramientas exportado de Trellis a Firestore,
// subiendo cada foto real a Firebase Storage primero.
//
// Uso:
//   node --env-file=.env scripts/import-tools-from-trellis.mjs
//
// Lee scripts/data/trellis_tools_export.json (exportado desde Trellis) y por
// cada herramienta:
//   1. Si tiene photoUrl (una URL pública de Supabase), descarga la imagen.
//   2. Sube esa imagen a Firebase Storage en tools/<code>.jpg
//   3. Crea el documento en la colección `tools` de Firestore con el campo
//      `photo` apuntando a la URL pública de Firebase Storage.
//
// Es seguro re-ejecutar: usa el campo `code` como id de documento (slug), así
// que una segunda corrida sobrescribe los mismos documentos en vez de duplicarlos.

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc, writeBatch } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const storage = getStorage(app);

await signInAnonymously(auth);
console.log("Autenticado con Firebase.");

const dataPath = path.join(__dirname, "data", "trellis_tools_export.json");
const tools = JSON.parse(readFileSync(dataPath, "utf-8"));
console.log(`Leyendo ${tools.length} herramientas desde ${dataPath}`);

// Convierte "6739" -> "6739"; si el code viene vacío usa el trellisToolId.
function slugify(code, trellisToolId) {
  const base = (code || trellisToolId || "tool").toString().trim();
  return base.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
}

async function uploadPhoto(photoUrl, slug) {
  if (!photoUrl) return null;
  try {
    const res = await fetch(photoUrl);
    if (!res.ok) {
      console.warn(`  ⚠ No se pudo descargar foto de ${slug}: HTTP ${res.status}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? "png" : "jpg";

    const storageRef = ref(storage, `tools/${slug}.${ext}`);
    await uploadBytes(storageRef, new Uint8Array(arrayBuffer), { contentType });
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (e) {
    console.warn(`  ⚠ Error subiendo foto de ${slug}: ${e.message}`);
    return null;
  }
}

let processed = 0;
let withPhoto = 0;
let photoFailed = 0;
const errors = [];

// Procesa en lotes pequeños para no saturar memoria/red (fotos son pesadas).
const BATCH_SIZE = 25;

for (let i = 0; i < tools.length; i += BATCH_SIZE) {
  const batchTools = tools.slice(i, i + BATCH_SIZE);

  await Promise.all(
    batchTools.map(async (t) => {
      const slug = slugify(t.code, t.trellisToolId);
      let photoUrl = null;

      if (t.photoUrl) {
        photoUrl = await uploadPhoto(t.photoUrl, slug);
        if (photoUrl) withPhoto++;
        else photoFailed++;
      }

      const toolDoc = {
        code: t.code || null,
        photo: photoUrl,
        type: t.type || "",
        brand: t.brand || "",
        model: t.model || "",
        serial_number: t.serialNumber || "",
        group: t.group || "",
        home_location: t.homeLocation || "",
        status: t.status || "available",
        assigned_to: t.assignedTo || null,
        issues: [],
        source: "trellis",
        trellis_tool_id: t.trellisToolId || null,
      };

      try {
        await setDoc(doc(db, "tools", slug), toolDoc, { merge: false });
        processed++;
      } catch (e) {
        errors.push({ slug, error: e.message });
      }
    })
  );

  console.log(
    `Progreso: ${Math.min(i + BATCH_SIZE, tools.length)}/${tools.length} ` +
      `(${withPhoto} con foto subida, ${photoFailed} fotos fallidas)`
  );
}

console.log("\n=== Resumen ===");
console.log(`Total procesados: ${processed}/${tools.length}`);
console.log(`Con foto subida a Firebase Storage: ${withPhoto}`);
console.log(`Fotos que fallaron: ${photoFailed}`);
console.log(`Errores de Firestore: ${errors.length}`);
if (errors.length) {
  console.log(JSON.stringify(errors.slice(0, 10), null, 2));
}

process.exit(0);
