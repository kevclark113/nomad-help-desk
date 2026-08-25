/**
 * Per-user trip storage in Firestore, at `users/{uid}/trips/{tripId}`.
 * Offline persistence (configured in firebase.ts) makes reads/writes work
 * offline and sync automatically when back online.
 *
 * All Firestore SDK access goes through dynamic imports so the SDK stays out of
 * the main bundle until a user actually signs in.
 */
import { loadFirebase } from './firebase'
import type { NewTrip, Trip } from './types'

function toTrip(id: string, data: Record<string, unknown>): Trip {
  return {
    id,
    entryDate: String(data.entryDate),
    exitDate: String(data.exitDate),
    note: data.note != null ? String(data.note) : undefined,
    countryCode: data.countryCode != null ? String(data.countryCode) : undefined,
  }
}

/** Firestore rejects `undefined` values; drop them. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) (out as Record<string, unknown>)[k] = v
  return out
}

/** Live subscription to a user's trips, ordered by entry date. Returns an unsubscribe fn. */
export function subscribeTrips(
  uid: string,
  onData: (trips: Trip[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let unsub = () => {}
  let cancelled = false
  void (async () => {
    try {
      const { db } = await loadFirebase()
      const fs = await import('firebase/firestore')
      if (cancelled) return
      const q = fs.query(fs.collection(db, 'users', uid, 'trips'), fs.orderBy('entryDate'))
      unsub = fs.onSnapshot(
        q,
        (snap) => onData(snap.docs.map((d) => toTrip(d.id, d.data()))),
        (err) => onError?.(err),
      )
    } catch (err) {
      onError?.(err as Error)
    }
  })()
  return () => {
    cancelled = true
    unsub()
  }
}

export async function addTrip(uid: string, trip: NewTrip): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  const id = crypto.randomUUID()
  await fs.setDoc(
    fs.doc(fs.collection(db, 'users', uid, 'trips'), id),
    stripUndefined({ ...trip, createdAt: fs.serverTimestamp() }),
  )
}

/** Insert-or-replace a trip preserving its id — used by migration. */
export async function putTrip(uid: string, trip: Trip): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  const { id, ...data } = trip
  await fs.setDoc(
    fs.doc(fs.collection(db, 'users', uid, 'trips'), id),
    stripUndefined({ ...data, createdAt: fs.serverTimestamp() }),
  )
}

export async function updateTrip(
  uid: string,
  id: string,
  changes: Partial<NewTrip>,
): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  await fs.updateDoc(fs.doc(fs.collection(db, 'users', uid, 'trips'), id), stripUndefined({ ...changes }))
}

export async function deleteTrip(uid: string, id: string): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  await fs.deleteDoc(fs.doc(fs.collection(db, 'users', uid, 'trips'), id))
}
