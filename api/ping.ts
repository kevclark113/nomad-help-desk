/**
 * TEMPORARY diagnostic endpoint. No top-level imports, so if this 500s the fault
 * is the TS/ESM function runtime itself; if it returns 200 JSON, the runtime is
 * fine and the payload tells us whether firebase-admin loads and whether the env
 * vars are present. Remove once the Gmail functions are confirmed working.
 */
export default async function handler(_req: unknown, res: any) {
  const result: Record<string, unknown> = {
    ok: true,
    node: process.version,
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT_B64,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
  }
  try {
    const app = await import('firebase-admin/app')
    result.firebaseAdmin =
      typeof app.initializeApp === 'function' ? 'loaded' : 'loaded-but-no-initializeApp'
  } catch (e) {
    result.firebaseAdmin = 'FAILED: ' + String((e as Error)?.message ?? e)
  }
  res.status(200).json(result)
}
