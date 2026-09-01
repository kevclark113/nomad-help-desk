/**
 * TEMPORARY diagnostic. Statically imports the shared _lib chain (same as the
 * Gmail functions do) and performs a real Firestore write. If this 500s at load,
 * the _lib import chain is the crash; if it returns 200, we also learn whether
 * Firestore writes work. Uses loose `any` types to avoid importing @vercel/node
 * (that variable is isolated in ping3). Remove once Gmail functions work.
 */
import { requireUser } from './_lib/auth'
import { isAllowed } from './_lib/allowlist'
import { redirectUri } from './_lib/google'

export default async function handler(req: any, res: any) {
  const result: Record<string, unknown> = {
    ok: true,
    libLoaded: {
      requireUser: typeof requireUser,
      isAllowed: typeof isAllowed,
      redirectUri: typeof redirectUri,
    },
  }
  try {
    const { cert, getApps, initializeApp } = await import('firebase-admin/app')
    const { getFirestore } = await import('firebase-admin/firestore')
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64 ?? '', 'base64').toString('utf8'))
    const app = getApps()[0] ?? initializeApp({ credential: cert(sa) })
    const db = getFirestore(app)
    await db.collection('diagnostic').doc('ping').set({ t: Date.now() })
    result.firestore = 'write-ok'
  } catch (e) {
    result.firestore = 'FAILED: ' + String((e as Error)?.message ?? e)
    result.stack = String((e as Error)?.stack ?? '').split('\n').slice(0, 6)
  }
  res.status(200).json(result)
}
