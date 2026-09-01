/** Request auth helpers for the Gmail API routes. */
import type { VercelRequest } from '@vercel/node'
import { adminAuth } from './firebaseAdmin'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export interface AuthedUser {
  uid: string
  email: string | null
}

/**
 * Verify the Firebase ID token in the `Authorization: Bearer <token>` header and
 * return the caller's uid + email. Throws HttpError(401) when missing/invalid.
 */
export async function requireUser(req: VercelRequest): Promise<AuthedUser> {
  const header = req.headers.authorization ?? ''
  const match = /^Bearer (.+)$/.exec(header)
  if (!match) throw new HttpError(401, 'Missing Authorization bearer token')
  try {
    const decoded = await adminAuth().verifyIdToken(match[1])
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    throw new HttpError(401, 'Invalid or expired session')
  }
}
