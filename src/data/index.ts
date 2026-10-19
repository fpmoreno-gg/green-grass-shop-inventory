import { isFirebaseConfigured } from "../lib/firebase";
import { firestoreRepository } from "./firestore/firestoreRepository";
import { localRepository } from "./local/localRepository";
import type { DataRepository } from "./types";

// Single switch point: real Firestore once a project is configured
// (.env filled in, see .env.example), demo/local store otherwise.
export const repository: DataRepository = isFirebaseConfigured ? firestoreRepository : localRepository;

export * from "./types";
