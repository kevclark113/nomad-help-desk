import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '../auth/AuthProvider'
import * as local from './db'
import * as cloud from './firestoreVisited'
import type { CountryMark, MarkStatus } from './types'

export interface CountryMarksStore {
  /** Alpha-2 (uppercase) → manual mark status. */
  marks: Map<string, MarkStatus>
  setMark: (code: string, status: MarkStatus) => Promise<void>
  clearMark: (code: string) => Promise<void>
  /** Set the mark to `status`, or clear it if it already has that status. */
  toggleMark: (code: string, status: MarkStatus) => Promise<void>
}

/**
 * Manually-marked countries (visited / bucket-list). Signed out → local Dexie
 * (reactive via useLiveQuery). Signed in → Firestore (reactive via onSnapshot),
 * with a one-time migration of local marks into the account on first sign-in.
 * Mirrors useTripStore.
 */
export function useVisitedStore(): CountryMarksStore {
  const { user } = useAuth()
  const localMarks = useLiveQuery(local.getMarks, [], [] as CountryMark[])
  const [cloudMarks, setCloudMarks] = useState<CountryMark[] | null>(null)
  const migratedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      setCloudMarks(null)
      return
    }
    setCloudMarks(null)
    return cloud.subscribeMarks(user.uid, setCloudMarks)
  }, [user])

  // One-time migration of local marks into the cloud on first sign-in.
  useEffect(() => {
    if (!user) return
    const uid = user.uid
    const key = `nomad-visited-migrated-${uid}`
    if (localStorage.getItem(key) || migratedFor.current === uid) return
    migratedFor.current = uid
    void (async () => {
      try {
        const all = await local.getMarks()
        for (const m of all) await cloud.setMark(uid, m.code, m.status, m.addedAt)
        localStorage.setItem(key, '1')
      } catch {
        // Non-fatal; migration retries next load if the flag wasn't set.
      }
    })()
  }, [user])

  const rows = user ? (cloudMarks ?? []) : localMarks
  const marks = useMemo(
    () => new Map(rows.map((m) => [m.code.toUpperCase(), m.status])),
    [rows],
  )

  const setMark = useCallback(
    async (code: string, status: MarkStatus) => {
      if (user) await cloud.setMark(user.uid, code, status)
      else await local.setMark(code, status)
    },
    [user],
  )

  const clearMark = useCallback(
    async (code: string) => {
      if (user) await cloud.clearMark(user.uid, code)
      else await local.clearMark(code)
    },
    [user],
  )

  const toggleMark = useCallback(
    async (code: string, status: MarkStatus) => {
      const c = code.toUpperCase()
      if (marks.get(c) === status) await clearMark(c)
      else await setMark(c, status)
    },
    [marks, setMark, clearMark],
  )

  return { marks, setMark, clearMark, toggleMark }
}
