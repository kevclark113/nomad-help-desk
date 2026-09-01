/**
 * GET /api/gmail/callback?code=...&state=...
 * The redirect target Google sends the user back to after consent.
 *
 * Validates the one-time state nonce, exchanges the auth code for tokens, and
 * stores the refresh token in the server-only `gmailTokens/{uid}` collection
 * (clients are denied access to it by Firestore rules). Always redirects back to
 * the app with a `?gmail=connected` or `?gmail=error&reason=...` flag.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { adminDb } from '../_lib/firebaseAdmin'
import { GMAIL_SCOPE, baseUrl, redirectUri } from '../_lib/google'

const STATE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const appHome = baseUrl(req)
  const fail = (reason: string) =>
    res.redirect(302, `${appHome}/?gmail=error&reason=${encodeURIComponent(reason)}`)

  try {
    const { code, state, error } = req.query as Record<string, string | undefined>
    if (error) return fail(error)
    if (!code || !state) return fail('missing_params')

    let parsed: { uid: string; nonce: string }
    try {
      parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'))
    } catch {
      return fail('bad_state')
    }

    // One-time state check: nonce must match and be recent, then it's consumed.
    const stateRef = adminDb().collection('gmailOAuthState').doc(parsed.uid)
    const saved = (await stateRef.get()).data()
    if (!saved || saved.nonce !== parsed.nonce || Date.now() - saved.createdAt > STATE_TTL_MS) {
      return fail('state_expired')
    }
    await stateRef.delete()

    // Exchange the authorization code for tokens.
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
        redirect_uri: redirectUri(req),
        grant_type: 'authorization_code',
      }),
    })
    if (!tokenRes.ok) {
      console.error('Token exchange failed', tokenRes.status, await tokenRes.text())
      return fail('token_exchange')
    }
    const tokens = (await tokenRes.json()) as {
      refresh_token?: string
      access_token?: string
      scope?: string
    }
    // No refresh token means Google already had consent on file. prompt=consent
    // should force one; if it's still missing, ask the user to remove the app's
    // access at myaccount.google.com and reconnect.
    if (!tokens.refresh_token) return fail('no_refresh_token')

    // Look up which Gmail address was connected (for display only).
    let gmailAddress: string | null = null
    try {
      const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      if (profileRes.ok) gmailAddress = ((await profileRes.json()).emailAddress as string) ?? null
    } catch {
      /* non-fatal */
    }

    // Secret refresh token — server-only collection (clients denied by rules).
    await adminDb().collection('gmailTokens').doc(parsed.uid).set({
      refreshToken: tokens.refresh_token,
      scope: tokens.scope ?? GMAIL_SCOPE,
      gmailAddress,
      connectedAt: Date.now(),
    })

    return res.redirect(302, `${appHome}/?gmail=connected`)
  } catch (err) {
    console.error('Gmail callback error', err)
    return fail('server')
  }
}
