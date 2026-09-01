/**
 * Single-use, per-person invite links. An owner creates an invite (token); the
 * invitee opens the link, signs in, and redeeming adds their email to the
 * allowlist. Stored in the server-only `invites` collection (clients denied by
 * Firestore rules; managed via the Admin SDK).
 *
 * NOTE: this grants app-level feature access only. While the Google OAuth app is
 * in Testing mode, the invitee must ALSO be added to Google's OAuth test-user
 * list by hand before they can connect Gmail — there is no API for that.
 */
import { randomBytes } from 'node:crypto'
import type { AdminDb } from './firebaseAdmin.js'
import { addToAllowlist } from './allowlist.js'

export interface InviteRecord {
  token: string
  createdByEmail: string
  createdAt: number
  note: string | null
  redeemed: boolean
  redeemedEmail: string | null
  redeemedAt: number | null
  revoked: boolean
}

export async function createInvite(
  db: AdminDb,
  createdByEmail: string,
  note?: string,
): Promise<InviteRecord> {
  const token = randomBytes(9).toString('base64url')
  const rec: InviteRecord = {
    token,
    createdByEmail: createdByEmail.toLowerCase(),
    createdAt: Date.now(),
    note: note?.trim() || null,
    redeemed: false,
    redeemedEmail: null,
    redeemedAt: null,
    revoked: false,
  }
  await db.collection('invites').doc(token).set(rec)
  return rec
}

export async function listInvites(db: AdminDb): Promise<InviteRecord[]> {
  const snap = await db.collection('invites').orderBy('createdAt', 'desc').get()
  return snap.docs.map((d) => d.data() as InviteRecord)
}

export async function revokeInvite(db: AdminDb, token: string): Promise<void> {
  await db.collection('invites').doc(token).set({ revoked: true }, { merge: true })
}

export type RedeemResult = { ok: true; email: string } | { ok: false; reason: string }

export async function redeemInvite(
  db: AdminDb,
  token: string,
  email: string,
): Promise<RedeemResult> {
  const lower = email.toLowerCase()
  const ref = db.collection('invites').doc(token)
  const snap = await ref.get()
  if (!snap.exists) return { ok: false, reason: 'This invite link is not valid.' }
  const inv = snap.data() as InviteRecord
  if (inv.revoked) return { ok: false, reason: 'This invite link has been revoked.' }
  if (inv.redeemed) {
    // Re-opening one's own already-redeemed link is fine (idempotent).
    if (inv.redeemedEmail === lower) return { ok: true, email: lower }
    return { ok: false, reason: 'This invite link has already been used.' }
  }
  await addToAllowlist(db, lower, { viaInvite: token })
  await ref.set(
    { redeemed: true, redeemedEmail: lower, redeemedAt: Date.now() },
    { merge: true },
  )
  return { ok: true, email: lower }
}
