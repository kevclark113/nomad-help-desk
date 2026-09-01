/**
 * POST /api/invite/revoke   (owner only)
 * Body: { token: string }
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isOwner } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { revokeInvite } from '../_lib/invites.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const user = await requireUser(req)
    if (!isOwner(user.email)) throw new HttpError(403, 'Only an owner can revoke invites.')

    const token = typeof req.body?.token === 'string' ? req.body.token : ''
    if (!token) throw new HttpError(400, 'Missing invite token.')

    const db = await adminDb()
    await revokeInvite(db, token)
    res.status(200).json({ ok: true })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
