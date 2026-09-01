/**
 * GET /api/invite/list   (owner only)
 * Returns all invites and the current allowlist, for the admin panel.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isOwner, listAllowlist } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { listInvites } from '../_lib/invites.js'
import { baseUrl } from '../_lib/google.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireUser(req)
    if (!isOwner(user.email)) throw new HttpError(403, 'Only an owner can view invites.')

    const db = await adminDb()
    const [invites, allowlist] = await Promise.all([listInvites(db), listAllowlist(db)])
    const base = baseUrl(req)

    res.status(200).json({
      invites: invites.map((i) => ({ ...i, url: `${base}/invite/${i.token}` })),
      allowlist,
    })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
