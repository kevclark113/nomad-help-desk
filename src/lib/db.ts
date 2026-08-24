import Dexie, { type Table } from 'dexie'
import type { Trip, NewTrip } from './types'
import { isValidISODate, daysBetween } from './dateUtils'

/**
 * Local-first storage via IndexedDB (Dexie). Used when signed out (and as the
 * source for the one-time migration into the cloud on first sign-in).
 *
 * v2 switches the primary key from an auto-incrementing number to a string id,
 * so trips share one shape with Firestore. The v1→v2 upgrade clears the old
 * store (pre-launch local test data only).
 */
class NomadDB extends Dexie {
  trips!: Table<Trip, string>

  constructor() {
    super('nomad-help-desk')
    this.version(1).stores({ trips: '++id, entryDate' })
    this.version(2)
      .stores({ trips: 'id, entryDate' })
      .upgrade((tx) => tx.table('trips').clear())
  }
}

export const db = new NomadDB()

export function newId(): string {
  return crypto.randomUUID()
}

function assertValidTrip(trip: Pick<Trip, 'entryDate' | 'exitDate'>): void {
  if (!isValidISODate(trip.entryDate)) throw new Error(`Invalid entryDate: ${trip.entryDate}`)
  if (!isValidISODate(trip.exitDate)) throw new Error(`Invalid exitDate: ${trip.exitDate}`)
  if (daysBetween(trip.entryDate, trip.exitDate) < 0) {
    throw new Error(`exitDate (${trip.exitDate}) is before entryDate (${trip.entryDate})`)
  }
}

export async function getTrips(): Promise<Trip[]> {
  return db.trips.orderBy('entryDate').toArray()
}

export async function addTrip(trip: NewTrip): Promise<Trip> {
  assertValidTrip(trip)
  const full: Trip = { id: newId(), ...trip }
  await db.trips.add(full)
  return full
}

/** Insert-or-replace by id — used when migrating existing trips. */
export async function putTrip(trip: Trip): Promise<void> {
  assertValidTrip(trip)
  await db.trips.put(trip)
}

export async function updateTrip(id: string, changes: Partial<NewTrip>): Promise<void> {
  const existing = await db.trips.get(id)
  if (!existing) throw new Error(`Trip ${id} not found`)
  assertValidTrip({ ...existing, ...changes })
  await db.trips.update(id, changes)
}

export async function deleteTrip(id: string): Promise<void> {
  await db.trips.delete(id)
}
