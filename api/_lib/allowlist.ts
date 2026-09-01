/**
 * Who may use the Gmail-import feature.
 *
 * Access = an OWNER (hardcoded admins, always allowed) OR an email present in the
 * Firestore `allowlist` collection (added by redeeming an invite, see invites.ts).
 * This is the AUTHORITATIVE gate — enforced on every request.
 */
import type { AdminDb } from './firebaseAdmin.js'

/** Admins: always allowed, and the only ones who can create/manage invites. */
const OWNER_EMAILS = ['kevclark113@gmail.com'].map((e) => e.toLowerCase())

export function isOwner(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.toLowerCase())
}

/** Firestore doc id for an email (lowercased; emails contain no '/'). */
function emailKey(email: string): string {
  return email.trim().toLowerCase()
}

/** Approved to use the feature: an owner, or present in the Firestore allowlist. */
export async function isAllowed(db: AdminDb, email: string | null | undefined): Promise<boolean> {
  if (!email) return false
  if (isOwner(email)) return true
  const snap = await db.collection('allowlist').doc(emailKey(email)).get()
  return snap.exists
}

export async function addToAllowlist(
  db: AdminDb,
  email: string,
  meta: { addedBy?: string; viaInvite?: string } = {},
): Promise<void> {
  await db
    .collection('allowlist')
    .doc(emailKey(email))
    .set(
      {
        email: emailKey(email),
        addedAt: Date.now(),
        addedBy: meta.addedBy ?? null,
        viaInvite: meta.viaInvite ?? null,
      },
      { merge: true },
    )
}

export interface AllowedUser {
  email: string
  addedAt: number
}

export async function listAllowlist(db: AdminDb): Promise<AllowedUser[]> {
  const snap = await db.collection('allowlist').get()
  return snap.docs.map((d) => {
    const x = d.data()
    return { email: String(x.email ?? d.id), addedAt: Number(x.addedAt ?? 0) }
  })
}
