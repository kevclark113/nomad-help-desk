import Dexie, { type Table } from 'dexie'
import type { Trip } from './types'
import { isValidISODate, daysBetween } from './dateUtils'

/**
 * Local-first storage via IndexedDB (Dexie). No accounts, no network.
 */
class NomadDB extends Dexie {
  trips!: Table<Trip, number>

  constructor() {
    super('nomad-help-desk')
    this.version(1).stores({
      // Indexed on entryDate so we can query/sort trips by when they started.
      trips: '++id, entryDate',
    })
  }
}

export const db = new NomadDB()

function assertValidTrip(trip: Pick<Trip, 'entryDate' | 'exitDate'>): void {
  if (!isValidISODate(trip.entryDate)) {
    throw new Error(`Invalid entryDate: ${trip.entryDate}`)
  }
  if (!isValidISODate(trip.exitDate)) {
    throw new Error(`Invalid exitDate: ${trip.exitDate}`)
  }
  if (daysBetween(trip.entryDate, trip.exitDate) < 0) {
    throw new Error(`exitDate (${trip.exitDate}) is before entryDate (${trip.entryDate})`)
  }
}

export async function getTrips(): Promise<Trip[]> {
  return db.trips.orderBy('entryDate').toArray()
}

export async function addTrip(trip: Omit<Trip, 'id'>): Promise<number> {
  assertValidTrip(trip)
  return db.trips.add(trip)
}

export async function updateTrip(id: number, changes: Partial<Omit<Trip, 'id'>>): Promise<void> {
  const existing = await db.trips.get(id)
  if (!existing) throw new Error(`Trip ${id} not found`)
  const merged = { ...existing, ...changes }
  assertValidTrip(merged)
  await db.trips.update(id, changes)
}

export async function deleteTrip(id: number): Promise<void> {
  await db.trips.delete(id)
}
