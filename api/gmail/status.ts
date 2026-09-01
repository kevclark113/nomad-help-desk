/**
 * GET /api/gmail/status
 * Auth: Firebase ID token in the Authorization header.
 *
 * Reports whether the caller is approved for the feature and whether they've
 * connected Gmail. Reads the server-only token doc, so the client never sees the
 * refresh token itself.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth'
import { isAllowed } from '../_lib/allowlist'
import { adminDb } from '../_lib/firebaseAdmin'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req)
    const data = (await adminDb().collection('gmailTokens').doc(user.uid).get()).data()
    res.status(200).json({
      allowed: isAllowed(user.email),
      connected: Boolean(data?.refreshToken),
      gmailAddress: (data?.gmailAddress as string) ?? null,
    })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
