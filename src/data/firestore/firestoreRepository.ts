import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromCache,
  getDocs,
  increment,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, ensureFirebaseAuth } from "../../lib/firebase";
import type { DataRepository } from "../types";
import {
  docToLoan,
  docToMovement,
  docToShopManager,
  docToSupply,
  docToTool,
  docToTrailer,
  docToTrailerInventoryRecord,
  docToWorker,
  loanToDoc,
  movementToDoc,
  shopManagerToDoc,
  supplyToDoc,
  toolToDoc,
  trailerInventoryRecordToDoc,
  trailerToDoc,
  workerToDoc,
} from "./mappers";

function requireDb() {
  if (!db) throw new Error("Firestore is not configured — see .env.example");
  return db;
}

function newDocRef(collectionName: string) {
  return doc(collection(requireDb(), collectionName));
}

// Prefer the local cache (every collection here is live-subscribed, so it's
// already there) and only go to the network if it's missing — a plain getDoc
// waits on the server first, which stalls for seconds with poor signal.
async function readDoc(ref: DocumentReference<DocumentData>) {
  try {
    return await getDocFromCache(ref);
  } catch {
    return await getDoc(ref);
  }
}

// With the persistent local cache (see lib/firebase.ts), a write is applied
// on the device and queued for sync the instant it's issued, but its promise
// only settles once the server acknowledges it — which never happens while
// offline. Treating "no answer yet" as a failure made the UI report an error
// for a write that was actually saved, and retrying it created duplicates.
// So: skip the wait entirely when the device knows it's offline; otherwise
// wait briefly, so a genuine server rejection (bad data, rules) still
// surfaces as an error, and after that trust the queue.
const SERVER_ACK_WAIT_MS = 8000;

async function settle(write: Promise<unknown>): Promise<void> {
  const logLateFailure = (err: unknown) => console.error("A queued write was rejected by the server", err);
  if (!navigator.onLine) {
    write.catch(logLateFailure);
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stillPending = new Promise<"pending">((resolve) => {
    timer = setTimeout(() => resolve("pending"), SERVER_ACK_WAIT_MS);
  });
  try {
    const outcome = await Promise.race([write.then(() => "done" as const), stillPending]);
    if (outcome === "pending") write.catch(logLateFailure);
  } finally {
    clearTimeout(timer);
  }
}

// onSnapshot rejects with permission-denied if it's opened before the
// anonymous sign-in (ensureFirebaseAuth) resolves, and never recovers on its
// own — so every subscribe needs to wait for auth first. Centralized here
// instead of duplicating the same race-free setup in all seven subscribers.
function subscribeWithAuth<T>(
  collectionName: string,
  mapper: (doc: QueryDocumentSnapshot<DocumentData>) => T,
  cb: (items: T[]) => void,
): () => void {
  let unsub: (() => void) | undefined;
  let cancelled = false;
  const attach = () => {
    if (cancelled) return;
    unsub = onSnapshot(
      collection(requireDb(), collectionName),
      (snap) => cb(snap.docs.map(mapper)),
      (err) => console.error(`Live updates for "${collectionName}" stopped`, err),
    );
  };
  ensureFirebaseAuth().then(attach, (err) => {
    // Sign-in can fail on a first-ever launch with no signal; attaching anyway
    // still serves whatever is in the local cache.
    console.error("Anonymous sign-in failed", err);
    attach();
  });
  return () => {
    cancelled = true;
    unsub?.();
  };
}

// Real Firestore-backed implementation of DataRepository, used once a
// Firebase project is configured (see src/lib/firebase.ts + .env.example).
export const firestoreRepository: DataRepository = {
  subscribeTools: (cb) => subscribeWithAuth("tools", docToTool, cb),
  getTool: async (id) => {
    await ensureFirebaseAuth();
    const snap = await readDoc(doc(requireDb(), "tools", id));
    return snap.exists() ? docToTool(snap as QueryDocumentSnapshot<DocumentData>) : undefined;
  },
  getToolPhoto: async (id) => {
    await ensureFirebaseAuth();
    const snap = await getDoc(doc(requireDb(), "tool_photos", id));
    return snap.exists() ? (snap.data().photo ?? undefined) : undefined;
  },
  addTool: async (tool) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("tools");
    await settle(setDoc(ref, toolToDoc({ ...tool, issues: [] })));
    return ref.id;
  },
  updateTool: async (id, patch) => {
    await ensureFirebaseAuth();
    const partial: Record<string, unknown> = {};
    if (patch.status) partial.status = patch.status;
    if (patch.assignedTo !== undefined) partial.assigned_to = patch.assignedTo;
    if (patch.issues) partial.issues = patch.issues;
    await settle(updateDoc(doc(requireDb(), "tools", id), partial));
  },
  addToolIssue: async (id, issue) => {
    await ensureFirebaseAuth();
    await settle(updateDoc(doc(requireDb(), "tools", id), { issues: arrayUnion({ ...issue, id: crypto.randomUUID() }) }));
  },

  subscribeWorkers: (cb) => subscribeWithAuth("workers", docToWorker, cb),
  addWorker: async (worker) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("workers");
    await settle(setDoc(ref, workerToDoc(worker)));
    return ref.id;
  },

  subscribeLoans: (cb) => subscribeWithAuth("loans", docToLoan, cb),
  // Loan + tool status in one batch: separately, a dropped connection between
  // the two left a loan on record while the tool still read "available" —
  // free to be lent out a second time.
  createLoan: async (loan) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("loans");
    const batch = writeBatch(requireDb());
    batch.set(ref, loanToDoc(loan));
    batch.update(doc(requireDb(), "tools", loan.toolId), { status: "checked_out", assigned_to: loan.workerId });
    await settle(batch.commit());
    return ref.id;
  },
  returnLoan: async (id, patch) => {
    await ensureFirebaseAuth();
    const loanRef = doc(requireDb(), "loans", id);
    const loanSnap = await readDoc(loanRef);
    const loan = loanSnap.exists() ? docToLoan(loanSnap as QueryDocumentSnapshot<DocumentData>) : undefined;

    const batch = writeBatch(requireDb());
    batch.update(loanRef, {
      return_date: patch.returnDate,
      return_condition: patch.returnCondition,
      return_photo: patch.returnPhoto ?? null,
      return_shop_manager: patch.returnShopManager ?? null,
      return_worker_confirmed_at: patch.returnWorkerConfirmedAt ?? null,
    });
    if (loan) {
      const toolRef = doc(requireDb(), "tools", loan.toolId);
      const toolSnap = await readDoc(toolRef);
      // An issue reported while the tool was out already flagged it for
      // repair — a "good" return mustn't silently clear that.
      const alreadyInRepair = toolSnap.exists() && toolSnap.data().status === "repair";
      const nextStatus = patch.returnCondition === "needs_repair" || alreadyInRepair ? "repair" : "available";
      batch.update(toolRef, { status: nextStatus, assigned_to: null });
    }
    await settle(batch.commit());
  },

  subscribeSupplies: (cb) => subscribeWithAuth("supplies", docToSupply, cb),
  getSupplyPhoto: async (id) => {
    await ensureFirebaseAuth();
    const snap = await getDoc(doc(requireDb(), "supply_photos", id));
    return snap.exists() ? (snap.data().photo ?? undefined) : undefined;
  },
  addSupply: async (supply) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("supplies");
    const batch = writeBatch(requireDb());
    batch.set(ref, supplyToDoc(supply));
    if (supply.photo) batch.set(doc(requireDb(), "supply_photos", ref.id), { photo: supply.photo });
    await settle(batch.commit());
    return ref.id;
  },
  // increment() is applied server-side, so two devices adjusting the same
  // supply at once both count — the old read-then-write lost one of them.
  adjustSupply: async (id, delta, movement) => {
    await ensureFirebaseAuth();
    const batch = writeBatch(requireDb());
    batch.update(doc(requireDb(), "supplies", id), { current_quantity: increment(delta) });
    batch.set(newDocRef("supply_movements"), movementToDoc({ ...movement, supplyId: id }));
    await settle(batch.commit());
  },
  subscribeSupplyMovements: (cb) => subscribeWithAuth("supply_movements", docToMovement, cb),

  subscribeTrailers: (cb) => subscribeWithAuth("trailers", docToTrailer, cb),
  addTrailer: async (trailer) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("trailers");
    await settle(setDoc(ref, trailerToDoc(trailer)));
    return ref.id;
  },
  updateTrailer: async (id, patch) => {
    await ensureFirebaseAuth();
    const partial: Record<string, unknown> = {};
    if (patch.supplies) partial.supplies = patch.supplies.map((s) => ({ supply_id: s.supplyId, quantity: s.quantity }));
    if (patch.name) partial.name = patch.name;
    if (patch.assignedWorkerId !== undefined) partial.assigned_worker_id = patch.assignedWorkerId;
    await settle(updateDoc(doc(requireDb(), "trailers", id), partial));
  },
  addTrailerInventoryRecord: async (record) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("trailer_inventory_records");
    await settle(setDoc(ref, trailerInventoryRecordToDoc(record)));
    return ref.id;
  },
  getTrailerInventoryRecords: async (trailerId) => {
    await ensureFirebaseAuth();
    const q = query(collection(requireDb(), "trailer_inventory_records"), where("trailer_id", "==", trailerId));
    const snap = await getDocs(q);
    return snap.docs.map(docToTrailerInventoryRecord).sort((a, b) => b.date.localeCompare(a.date));
  },

  subscribeShopManagers: (cb) => subscribeWithAuth("shop_managers", docToShopManager, cb),
  addShopManager: async (manager) => {
    await ensureFirebaseAuth();
    const ref = newDocRef("shop_managers");
    await settle(setDoc(ref, shopManagerToDoc(manager)));
    return ref.id;
  },
  updateShopManager: async (id, patch) => {
    await ensureFirebaseAuth();
    const partial: Record<string, unknown> = {};
    if (patch.name !== undefined) partial.name = patch.name;
    if (patch.pin !== undefined) partial.pin = patch.pin;
    await settle(updateDoc(doc(requireDb(), "shop_managers", id), partial));
  },
  deleteShopManager: async (id) => {
    await ensureFirebaseAuth();
    await settle(deleteDoc(doc(requireDb(), "shop_managers", id)));
  },
};
