import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import * as local from './db'
import * as cloud from './firestoreTrips'
import type { NewTrip, Trip } from './types'

export interface TripStore {
  trips: Trip[]
  addTrip: (trip: NewTrip) => Promise<void>
  updateTrip: (id: string, changes: Partial<NewTrip>) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
  /** True while signed in but the first cloud snapshot hasn't arrived yet. */
  syncing: boolean
  error: string | null
}

/**
 * Single source of trips for the app. Signed out → local Dexie (reactive via
 * useLiveQuery). Signed in → Firestore (reactive via onSnapshot), with a
 * one-time migration of any local trips into the account on first sign-in.
 */
export function useTripStore(): TripStore {
  const { user } = useAuth()
  const localTrips = useLiveQuery(local.getTrips, [], [] as Trip[])
  const [cloudTrips, setCloudTrips] = useState<Trip[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const migratedFor = useRef<string | null>(null)

  // Cloud subscription while signed in.
  useEffect(() => {
    if (!user) {
      setCloudTrips(null)
      return
    }
    setCloudTrips(null)
    const unsub = cloud.subscribeTrips(user.uid, setCloudTrips, (e) => setError(e.message))
    return unsub
  }, [user])

  // One-time migration of local trips into the cloud on first sign-in.
  useEffect(() => {
    if (!user) return
    const uid = user.uid
    const key = `nomad-migrated-${uid}`
    if (localStorage.getItem(key) || migratedFor.current === uid) return
    migratedFor.current = uid
    void (async () => {
      try {
        const localAll = await local.getTrips()
        // putTrip is keyed by the trip's id, so this is idempotent.
        for (const t of localAll) await cloud.putTrip(uid, t)
        localStorage.setItem(key, '1')
      } catch (e) {
        setError((e as Error).message)
      }
    })()
  }, [user])

  const addTrip = useCallback(
    async (trip: NewTrip) => {
      if (user) await cloud.addTrip(user.uid, trip)
      else await local.addTrip(trip)
    },
    [user],
  )

  const updateTrip = useCallback(
    async (id: string, changes: Partial<NewTrip>) => {
      if (user) await cloud.updateTrip(user.uid, id, changes)
      else await local.updateTrip(id, changes)
    },
    [user],
  )

  const deleteTrip = useCallback(
    async (id: string) => {
      if (user) await cloud.deleteTrip(user.uid, id)
      else await local.deleteTrip(id)
    },
    [user],
  )

  return {
    trips: user ? (cloudTrips ?? []) : localTrips,
    addTrip,
    updateTrip,
    deleteTrip,
    syncing: !!user && cloudTrips === null,
    error,
  }
}
