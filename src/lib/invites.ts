/** Client for the invite / allowlist admin endpoints. */
import type { User } from 'firebase/auth'

// Owners: always allowed, and the only ones who see the admin panel. Mirror of
// api/_lib/allowlist.ts OWNER_EMAILS — keep the two in sync.
const OWNER_EMAILS = ['kevclark113@gmail.com'].map((e) => e.toLowerCase())

export function isOwner(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.toLowerCase())
}

export interface InviteRecord {
  token: string
  createdByEmail: string
  createdAt: number
  note: string | null
  redeemed: boolean
  redeemedEmail: string | null
  redeemedAt: number | null
  revoked: boolean
  url: string
}

export interface AllowedUser {
  email: string
  addedAt: number
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}

async function authedPost<T>(user: User, path: string, body?: unknown): Promise<T> {
  const token = await user.getIdToken()
  const res = await fetch(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Request failed'))
  return (await res.json()) as T
}

export async function createInvite(user: User, note?: string): Promise<{ token: string; url: string }> {
  return authedPost(user, '/api/invite/create', { note })
}

export async function listInvites(
  user: User,
): Promise<{ invites: InviteRecord[]; allowlist: AllowedUser[] }> {
  const token = await user.getIdToken()
  const res = await fetch('/api/invite/list', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load invites'))
  return (await res.json()) as { invites: InviteRecord[]; allowlist: AllowedUser[] }
}

export async function revokeInvite(user: User, token: string): Promise<void> {
  await authedPost(user, '/api/invite/revoke', { token })
}

export async function redeemInvite(user: User, token: string): Promise<{ ok: true; email: string }> {
  return authedPost(user, '/api/invite/redeem', { token })
}

/** Owner-only: manually trigger the background scan for all connected users. */
export async function runAutoScan(
  user: User,
): Promise<{ users: number; totalAdded: number }> {
  return authedPost(user, '/api/cron/scan')
}
