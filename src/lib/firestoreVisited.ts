/**
 * Per-user "visited countries" storage in Firestore, at
 * `users/{uid}/visited/{code}` (one doc per alpha-2 code). Mirrors the local
 * Dexie `visited` store so manual map toggles sync across devices when signed in.
 *
 * Firestore SDK access goes through dynamic imports (see firebase.ts) so the SDK
 * stays out of the main bundle until sign-in.
 */
import { loadFirebase } from './firebase'
import type { VisitedCountry } from './types'

/** Live subscription to a user's visited countries. Returns an unsubscribe fn. */
export function subscribeVisited(
  uid: string,
  onData: (visited: VisitedCountry[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let unsub = () => {}
  let cancelled = false
  void (async () => {
    try {
      const { db } = await loadFirebase()
      const fs = await import('firebase/firestore')
      if (cancelled) return
      unsub = fs.onSnapshot(
        fs.collection(db, 'users', uid, 'visited'),
        (snap) => onData(snap.docs.map((d) => ({ code: d.id, addedAt: d.data().addedAt }))),
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

export async function getVisitedOnce(uid: string): Promise<VisitedCountry[]> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  const snap = await fs.getDocs(fs.collection(db, 'users', uid, 'visited'))
  return snap.docs.map((d) => ({ code: d.id, addedAt: d.data().addedAt }))
}

export async function addVisited(uid: string, code: string, addedAt?: string): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  const data: Record<string, unknown> = { addedAt: addedAt ?? fs.serverTimestamp() }
  await fs.setDoc(fs.doc(fs.collection(db, 'users', uid, 'visited'), code.toUpperCase()), data)
}

export async function removeVisited(uid: string, code: string): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  await fs.deleteDoc(fs.doc(fs.collection(db, 'users', uid, 'visited'), code.toUpperCase()))
}
