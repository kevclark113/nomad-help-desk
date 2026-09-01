/**
 * Firebase Admin SDK, initialized lazily on first use.
 *
 * The SDK is pulled in via dynamic import() *inside* the request path rather than
 * a top-level static import — importing firebase-admin at module-evaluation time
 * can crash the serverless cold start (its Firestore client has dynamic internals
 * that don't always initialize under the bundler). Loading it lazily keeps module
 * load cheap and lets any failure surface as a caught, JSON error.
 *
 * Credentials come from the base64-encoded service-account JSON in the
 * FIREBASE_SERVICE_ACCOUNT_B64 env var (set in Vercel). The Admin SDK bypasses
 * Firestore security rules, so it can read/write the server-only collections
 * (`gmailTokens`, `gmailOAuthState`) that clients are denied.
 */
import type { Auth } from 'firebase-admin/auth'
import type { Firestore } from 'firebase-admin/firestore'

interface AdminServices {
  auth: Auth
  db: Firestore
}

let servicesPromise: Promise<AdminServices> | null = null

function loadAdmin(): Promise<AdminServices> {
  if (!servicesPromise) {
    servicesPromise = (async () => {
      const { cert, getApps, initializeApp } = await import('firebase-admin/app')
      const { getAuth } = await import('firebase-admin/auth')
      const { getFirestore } = await import('firebase-admin/firestore')

      const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
      if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not set')
      const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))

      const app = getApps()[0] ?? initializeApp({ credential: cert(serviceAccount) })
      return { auth: getAuth(app), db: getFirestore(app) }
    })()
  }
  return servicesPromise
}

export async function adminAuth(): Promise<Auth> {
  return (await loadAdmin()).auth
}

export async function adminDb(): Promise<Firestore> {
  return (await loadAdmin()).db
}
