/**
 * Server-side writes/reads of a user's trips and visited marks, in the SAME
 * Firestore shape the client uses (users/{uid}/trips, users/{uid}/visited), so
 * auto-added items sync straight into the app. Used by the background scan.
 */
import { randomUUID } from 'node:crypto'
import type { AdminDb } from './firebaseAdmin.js'

/** Existing trip keys (countryCode|entryDate|exitDate) for dedup. */
export async function existingTripKeys(db: AdminDb, uid: string): Promise<Set<string>> {
  const snap = await db.collection('users').doc(uid).collection('trips').get()
  const keys = new Set<string>()
  snap.forEach((d) => {
    const x = d.data()
    if (x.countryCode) keys.add(`${String(x.countryCode).toUpperCase()}|${x.entryDate}|${x.exitDate}`)
  })
  return keys
}

/** Country codes already marked visited, for dedup. */
export async function existingVisitedCodes(db: AdminDb, uid: string): Promise<Set<string>> {
  const snap = await db.collection('users').doc(uid).collection('visited').get()
  const codes = new Set<string>()
  snap.forEach((d) => {
    if ((d.data().status ?? 'visited') === 'visited') codes.add(d.id.toUpperCase())
  })
  return codes
}

export interface NewServerTrip {
  entryDate: string
  exitDate: string
  countryCode: string
  note?: string
}

/** Create a trip; returns its generated id (matches client crypto.randomUUID ids). */
export async function addTrip(db: AdminDb, uid: string, trip: NewServerTrip): Promise<string> {
  const id = randomUUID()
  await db
    .collection('users')
    .doc(uid)
    .collection('trips')
    .doc(id)
    .set({
      entryDate: trip.entryDate,
      exitDate: trip.exitDate,
      countryCode: trip.countryCode.toUpperCase(),
      note: trip.note ?? null,
      createdAt: Date.now(),
    })
  return id
}

/** Mark a country visited (doc id = uppercased alpha-2, matching the client). */
export async function addVisitedMark(db: AdminDb, uid: string, code: string): Promise<void> {
  await db
    .collection('users')
    .doc(uid)
    .collection('visited')
    .doc(code.toUpperCase())
    .set({ status: 'visited', addedAt: Date.now() }, { merge: true })
}
