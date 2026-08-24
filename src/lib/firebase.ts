/**
 * Firebase initialization.
 *
 * The web config below is *public* by design (Firebase security comes from Auth
 * + Firestore security rules, not from hiding these values). We still read it
 * from env vars so it isn't hard-coded and can differ per environment.
 *
 * If the config isn't present (e.g. local dev before setup), Firebase stays
 * disabled and the app runs in local-only mode (Dexie) — accounts are optional.
 */
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

/** True once the Firebase web config is provided. Gates all account features. */
export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId)

let app: FirebaseApp | null = null
let authRef: Auth | null = null
let dbRef: Firestore | null = null

if (firebaseEnabled) {
  app = initializeApp(config as Required<typeof config>)
  authRef = getAuth(app)
  // Offline-first: Firestore caches locally and syncs automatically.
  dbRef = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
}

/** Firebase Auth, or null when Firebase isn't configured. */
export const auth = authRef
/** Firestore, or null when Firebase isn't configured. */
export const db = dbRef

/** Narrowing helpers for consumers that require Firebase to be present. */
export function requireAuth(): Auth {
  if (!authRef) throw new Error('Firebase Auth is not configured')
  return authRef
}
export function requireDb(): Firestore {
  if (!dbRef) throw new Error('Firestore is not configured')
  return dbRef
}
