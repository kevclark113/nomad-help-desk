/**
 * Firebase Admin SDK, initialized lazily on first use.
 *
 * IMPORTANT: there are NO top-level imports from firebase-admin here — not even
 * `import type`. A top-level `import type { Firestore } from 'firebase-admin/firestore'`
 * was enough to pull the heavy Firestore/gRPC module into the serverless bundle
 * at load time and crash the function (FUNCTION_INVOCATION_FAILED on every call).
 * Everything is loaded through dynamic import() inside the request path, and the
 * service types are inferred rather than imported.
 *
 * Credentials come from the base64-encoded service-account JSON in the
 * FIREBASE_SERVICE_ACCOUNT_B64 env var (set in Vercel). The Admin SDK bypasses
 * Firestore security rules, so it can read/write the server-only collections
 * (`gmailTokens`, `gmailOAuthState`) that clients are denied.
 */

function createServices() {
  return (async () => {
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

let servicesPromise: ReturnType<typeof createServices> | null = null

function loadAdmin() {
  if (!servicesPromise) servicesPromise = createServices()
  return servicesPromise
}

export async function adminAuth() {
  return (await loadAdmin()).auth
}

export async function adminDb() {
  return (await loadAdmin()).db
}

// Inferred service types (avoids importing firebase-admin types at module top).
export type AdminAuth = Awaited<ReturnType<typeof adminAuth>>
export type AdminDb = Awaited<ReturnType<typeof adminDb>>
