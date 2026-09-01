/**
 * POST /api/gmail/start
 * Auth: Firebase ID token in the Authorization header.
 *
 * Verifies the caller is signed in and approved, mints a one-time state nonce
 * (stored server-side), and returns the Google OAuth consent URL for the client
 * to redirect to. `access_type=offline` + `prompt=consent` ensure Google returns
 * a refresh token we can reuse for background scans.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomBytes } from 'node:crypto'
import { HttpError, requireUser } from '../_lib/auth.js'
import { isAllowed } from '../_lib/allowlist.js'
import { adminDb } from '../_lib/firebaseAdmin.js'
import { GMAIL_SCOPE, redirectUri } from '../_lib/google.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    const user = await requireUser(req)
    const db = await adminDb()
    if (!(await isAllowed(db, user.email))) {
      throw new HttpError(403, 'This account is not approved for Gmail import.')
    }

    const nonce = randomBytes(16).toString('hex')
    await db.collection('gmailOAuthState').doc(user.uid).set({
      nonce,
      createdAt: Date.now(),
    })

    const state = Buffer.from(JSON.stringify({ uid: user.uid, nonce })).toString('base64url')
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: redirectUri(req),
      response_type: 'code',
      scope: GMAIL_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
      state,
    })

    res.status(200).json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` })
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500
    res.status(status).json({ error: (err as Error).message })
  }
}
