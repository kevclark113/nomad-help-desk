/**
 * Reads/dismisses the in-app notifications the background scan writes to
 * users/{uid}/notifications. Firestore SDK loaded lazily (see firebase.ts).
 */
import { loadFirebase } from './firebase'

export interface ScanItem {
  type: 'trip' | 'mark'
  id?: string
  code?: string
  countryName: string
  entryDate: string
  exitDate: string
  kind: string
  summary: string
}

export interface ScanNotification {
  id: string
  kind: string
  createdAt: number
  items: ScanItem[]
}

/** Unseen 'gmail-scan' notifications for a user, newest first. */
export async function getUnseenScanNotifications(uid: string): Promise<ScanNotification[]> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  const q = fs.query(
    fs.collection(db, 'users', uid, 'notifications'),
    fs.where('seen', '==', false),
  )
  const snap = await fs.getDocs(q)
  return snap.docs
    .map((d) => {
      const data = d.data() as Omit<ScanNotification, 'id'>
      return { id: d.id, ...data }
    })
    .filter((n) => n.kind === 'gmail-scan' && Array.isArray(n.items) && n.items.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function dismissNotification(uid: string, id: string): Promise<void> {
  const { db } = await loadFirebase()
  const fs = await import('firebase/firestore')
  await fs.deleteDoc(fs.doc(fs.collection(db, 'users', uid, 'notifications'), id))
}
