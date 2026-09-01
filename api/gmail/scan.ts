/**
 * POST /api/gmail/scan
 * Auth: Firebase ID token in the Authorization header.
 *
 * Manual trigger for the read path: uses the caller's stored refresh token to
 * search Gmail for likely travel bookings and returns light metadata. No AI and
 * no writes yet — this proves the read path that the scheduled background scan
 * will reuse. Extraction into trips is a later step.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isAllowed } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { getAccessToken, searchBookingEmails } from '../_lib/gmail.js'

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
    const emails = await searchBookingEmails(accessToken, 20)

    res.status(200).json({
      count: emails.length,
      emails: emails.map((e) => ({ subject: e.subject, from: e.from, date: e.date })),
    })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
