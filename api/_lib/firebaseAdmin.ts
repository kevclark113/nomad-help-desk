/**
 * Firebase Admin SDK, initialized once per serverless instance.
 *
 * Credentials come from the base64-encoded service-account JSON in the
 * FIREBASE_SERVICE_ACCOUNT_B64 env var (set in Vercel). The Admin SDK bypasses
 * Firestore security rules, so it can read/write the server-only collections
 * (`gmailTokens`, `gmailOAuthState`) that clients are denied.
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let app: App | undefined

function initAdmin(): App {
  if (app) return app
  const existing = getApps()[0]
  if (existing) {
    app = existing
    return app
  }
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  if (!b64) throw new Error('FIREBASE_SERVICE_ACCOUNT_B64 is not set')
  const serviceAccount = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
  app = initializeApp({ credential: cert(serviceAccount) })
  return app
}

export function adminAuth() {
  return getAuth(initAdmin())
}

export function adminDb() {
  return getFirestore(initAdmin())
}
