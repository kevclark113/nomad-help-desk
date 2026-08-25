/**
 * Per-user country marks in Firestore, at `users/{uid}/visited/{code}` (one doc
 * per alpha-2 code, carrying a status: 'visited' | 'bucket'). Mirrors the local
 * Dexie `visited` store so manual map marks sync across devices when signed in.
 *
 * Firestore SDK access goes through dynamic imports (see firebase.ts) so the SDK
 * stays out of the main bundle until sign-in.
 */
import { loadFirebase } from './firebase'
import type { CountryMark, MarkStatus } from './types'

function toMark(code: string, data: Record<string, unknown>): CountryMark {
  const status = data.status === 'bucket' ? 'bucket' : 'visited'
  return { code, status, addedAt: data.addedAt as string | undefined }
}

/** Live subscription to a user's country marks. Returns an unsubscribe fn. */
export function subscribeMarks(
  uid: string,
  onData: (marks: CountryMark[]) => void,
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
        (snap) => onData(snap.docs.map((d) => toMark(d.id, d.data()))),
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

export async function getMarksOnce(uid: string): Promise<CountryMark[]> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  const snap = await fs.getDocs(fs.collection(db, 'users', uid, 'visited'))
  return snap.docs.map((d) => toMark(d.id, d.data()))
}

export async function setMark(
  uid: string,
  code: string,
  status: MarkStatus,
  addedAt?: string,
): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  await fs.setDoc(fs.doc(fs.collection(db, 'users', uid, 'visited'), code.toUpperCase()), {
    status,
    addedAt: addedAt ?? fs.serverTimestamp(),
  })
}

export async function clearMark(uid: string, code: string): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  await fs.deleteDoc(fs.doc(fs.collection(db, 'users', uid, 'visited'), code.toUpperCase()))
}
