/**
 * POST /api/invite/redeem   (any signed-in user)
 * Body: { token: string }
 * Redeems an invite for the signed-in user's email, adding them to the allowlist.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { redeemInvite } from '../_lib/invites.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const user = await requireUser(req)
    if (!user.email) throw new HttpError(400, 'Your account has no email to approve.')

    const token = typeof req.body?.token === 'string' ? req.body.token : ''
    if (!token) throw new HttpError(400, 'Missing invite token.')

    const db = await adminDb()
    const result = await redeemInvite(db, token, user.email)
    if (!result.ok) {
      res.status(400).json({ error: result.reason })
      return
    }
    res.status(200).json({ ok: true, email: result.email })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
