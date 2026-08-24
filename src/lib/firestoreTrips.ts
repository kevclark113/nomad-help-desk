/**
 * Per-user trip storage in Firestore, at `users/{uid}/trips/{tripId}`.
 * Offline persistence (configured in firebase.ts) makes reads/writes work
 * offline and sync automatically when back online.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type CollectionReference,
} from 'firebase/firestore'
import { requireDb } from './firebase'
import type { NewTrip, Trip } from './types'

function tripsCol(uid: string): CollectionReference {
  return collection(requireDb(), 'users', uid, 'trips')
}

function toTrip(id: string, data: Record<string, unknown>): Trip {
  return {
    id,
    entryDate: String(data.entryDate),
    exitDate: String(data.exitDate),
    note: data.note != null ? String(data.note) : undefined,
  }
}

/** Live subscription to a user's trips, ordered by entry date. Returns an unsubscribe fn. */
export function subscribeTrips(
  uid: string,
  onData: (trips: Trip[]) => void,
  onError?: (err: Error) => void,
): () => void {
  const q = query(tripsCol(uid), orderBy('entryDate'))
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => toTrip(d.id, d.data()))),
    (err) => onError?.(err),
  )
}

export async function getTripsOnce(uid: string): Promise<Trip[]> {
  const snap = await getDocs(tripsCol(uid))
  return snap.docs.map((d) => toTrip(d.id, d.data()))
}

export async function addTrip(uid: string, trip: NewTrip): Promise<void> {
  const id = crypto.randomUUID()
  await setDoc(doc(tripsCol(uid), id), stripUndefined({ ...trip, createdAt: serverTimestamp() }))
}

/** Insert-or-replace a trip preserving its id — used by migration. */
export async function putTrip(uid: string, trip: Trip): Promise<void> {
  const { id, ...data } = trip
  await setDoc(doc(tripsCol(uid), id), stripUndefined({ ...data, createdAt: serverTimestamp() }))
}

export async function updateTrip(
  uid: string,
  id: string,
  changes: Partial<NewTrip>,
): Promise<void> {
  await updateDoc(doc(tripsCol(uid), id), stripUndefined({ ...changes }))
}

export async function deleteTrip(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(tripsCol(uid), id))
}

/** Firestore rejects `undefined` values; drop them. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) (out as Record<string, unknown>)[k] = v
  return out
}
