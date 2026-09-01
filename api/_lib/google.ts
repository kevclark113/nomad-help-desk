/** Shared Google OAuth constants + URL helpers for the Gmail routes. */
import type { VercelRequest } from '@vercel/node'

/** Read-only Gmail access — the minimum needed to scan for bookings. */
export const GMAIL_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

/** The deployment's own origin, derived from the incoming request. */
export function baseUrl(req: VercelRequest): string {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https'
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || ''
  return `${proto}://${host}`
}

/**
 * The OAuth redirect URI. Must exactly match one registered on the Google OAuth
 * client (production: https://nomadhelpdesk.vercel.app/api/gmail/callback, or
 * http://localhost:5173/api/gmail/callback for local dev). Deriving it from the
 * request keeps start + callback consistent on whichever host is serving.
 */
export function redirectUri(req: VercelRequest): string {
  return `${baseUrl(req)}/api/gmail/callback`
}
