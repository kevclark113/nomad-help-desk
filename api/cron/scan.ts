/**
 * /api/cron/scan
 * Runs the background scan for every connected user.
 *
 * Auth: either Vercel Cron (Authorization: Bearer <CRON_SECRET>, injected by
 * Vercel when CRON_SECRET is set) OR an owner triggering it manually to test.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isOwner } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { scanAndApplyForUser } from '../_lib/autoscan.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const secret = process.env.CRON_SECRET
    const auth = req.headers.authorization ?? ''
    let authorized = Boolean(secret) && auth === `Bearer ${secret}`
    if (!authorized) {
      // Allow an owner to trigger a run manually (for testing).
      try {
        const user = await requireUser(req)
        authorized = isOwner(user.email)
      } catch {
        authorized = false
      }
    }
    if (!authorized) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const db = await adminDb()
    const tokensSnap = await db.collection('gmailTokens').get()

    let totalAdded = 0
    const results: Record<string, unknown> = {}
    for (const doc of tokensSnap.docs) {
      try {
        const summary = await scanAndApplyForUser(db, doc.id)
        results[doc.id] = summary
        totalAdded += summary.added
      } catch (e) {
        results[doc.id] = { error: (e as Error).message }
      }
    }

    res.status(200).json({ users: tokensSnap.size, totalAdded, results })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
