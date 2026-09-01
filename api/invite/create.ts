/**
 * POST /api/invite/create   (owner only)
 * Body: { note?: string }
 * Creates a single-use invite and returns its token + shareable URL.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isOwner } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { createInvite } from '../_lib/invites.js'
import { baseUrl } from '../_lib/google.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }
    const user = await requireUser(req)
    if (!isOwner(user.email)) throw new HttpError(403, 'Only an owner can create invites.')

    const note = typeof req.body?.note === 'string' ? req.body.note : undefined
    const db = await adminDb()
    const invite = await createInvite(db, user.email ?? '', note)

    res.status(200).json({ token: invite.token, url: `${baseUrl(req)}/invite/${invite.token}` })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
