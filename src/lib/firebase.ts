/**
 * Firebase — lazily loaded.
 *
 * The web config below is *public* by design (security comes from Auth +
 * Firestore rules, not from hiding these). We keep the heavy Firebase SDK OUT
 * of the main bundle: `firebaseEnabled` is a cheap synchronous env check, and
 * the SDK itself is only imported when `loadFirebase()` is first called — i.e.
 * when a returning user restores a session, or when someone signs in.
 */
import type { Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'

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

export interface FirebaseServices {
  auth: Auth
  db: Firestore
}

let cached: Promise<FirebaseServices> | null = null

/** Load + initialize Firebase once (dynamic import keeps it out of the main chunk). */
export function loadFirebase(): Promise<FirebaseServices> {
  if (!firebaseEnabled) return Promise.reject(new Error('Firebase is not configured'))
  if (!cached) {
    cached = (async () => {
      const [{ initializeApp }, { getAuth }, fs] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ])
      const app = initializeApp(config as Required<typeof config>)
      const auth = getAuth(app)
      // Offline-first: Firestore caches locally and syncs automatically.
      const db = fs.initializeFirestore(app, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      })
      return { auth, db }
    })()
  }
  return cached
}
