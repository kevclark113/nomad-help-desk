/**
 * POST /api/gmail/extract
 * Auth: Firebase ID token in the Authorization header.
 *
 * Scans the caller's Gmail for booking emails, runs them through Claude, and
 * returns structured proposed trips for review. No writes yet — applying trips
 * (and the automatic scheduled version) come next.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isAllowed } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { getAccessToken, getBookingEmailContents } from '../_lib/gmail.js'
import { extractTripsFromEmails } from '../_lib/extract.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const user = await requireUser(req)
    if (!isAllowed(user.email)) throw new HttpError(403, 'This account is not approved for Gmail import.')

    const db = await adminDb()
    const tokenDoc = (await db.collection('gmailTokens').doc(user.uid).get()).data()
    if (!tokenDoc?.refreshToken) throw new HttpError(400, 'Gmail is not connected.')

    const accessToken = await getAccessToken(tokenDoc.refreshToken as string)
    const emails = await getBookingEmailContents(accessToken, 12)
    const trips = await extractTripsFromEmails(emails)

    res.status(200).json({ scanned: emails.length, trips })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
