import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import * as local from './db'
import * as cloud from './firestoreVisited'
import type { VisitedCountry } from './types'

export interface VisitedStore {
  /** Uppercase alpha-2 codes the user marked visited directly. */
  codes: Set<string>
  addVisited: (code: string) => Promise<void>
  removeVisited: (code: string) => Promise<void>
  toggleVisited: (code: string) => Promise<void>
}

/**
 * Manually-toggled visited countries. Signed out → local Dexie (reactive via
 * useLiveQuery). Signed in → Firestore (reactive via onSnapshot), with a
 * one-time migration of local toggles into the account on first sign-in.
 * Mirrors useTripStore.
 */
export function useVisitedStore(): VisitedStore {
  const { user } = useAuth()
  const localVisited = useLiveQuery(local.getVisited, [], [] as VisitedCountry[])
  const [cloudVisited, setCloudVisited] = useState<VisitedCountry[] | null>(null)
  const migratedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      setCloudVisited(null)
      return
    }
    setCloudVisited(null)
    return cloud.subscribeVisited(user.uid, setCloudVisited)
  }, [user])

  // One-time migration of local toggles into the cloud on first sign-in.
  useEffect(() => {
    if (!user) return
    const uid = user.uid
    const key = `nomad-visited-migrated-${uid}`
    if (localStorage.getItem(key) || migratedFor.current === uid) return
    migratedFor.current = uid
    void (async () => {
      try {
        const all = await local.getVisited()
        for (const v of all) await cloud.addVisited(uid, v.code, v.addedAt)
        localStorage.setItem(key, '1')
      } catch {
        // Non-fatal; migration retries next load if the flag wasn't set.
      }
    })()
  }, [user])

  const rows = user ? (cloudVisited ?? []) : localVisited
  const codes = new Set(rows.map((v) => v.code.toUpperCase()))

  const addVisited = useCallback(
    async (code: string) => {
      if (user) await cloud.addVisited(user.uid, code)
      else await local.addVisited(code)
    },
    [user],
  )

  const removeVisited = useCallback(
    async (code: string) => {
      if (user) await cloud.removeVisited(user.uid, code)
      else await local.removeVisited(code)
    },
    [user],
  )

  const toggleVisited = useCallback(
    async (code: string) => {
      const c = code.toUpperCase()
      if (codes.has(c)) await removeVisited(c)
      else await addVisited(c)
    },
    [codes, addVisited, removeVisited],
  )

  return { codes, addVisited, removeVisited, toggleVisited }
}
