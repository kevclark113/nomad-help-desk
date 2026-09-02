/**
 * Background scan core: for one user, read booking emails not seen before, run
 * Claude extraction, auto-apply the HIGH-confidence trips (Schengen -> tracker
 * trip, others -> visited map), and drop an in-app notification of what changed.
 * Reused by the scheduled cron and the owner's manual "run now" trigger.
 *
 * Dedup has two layers: processed message ids (so we never re-extract or
 * re-charge Claude for the same email) and existing trip/mark keys (so we never
 * add a duplicate even if a message is seen fresh).
 */
import type { AdminDb } from './firebaseAdmin.js'
import { getAccessToken, getBookingEmailContents } from './gmail.js'
import { extractTripsFromEmails } from './extract.js'
import { isSchengen } from './schengen.js'
import { addTrip, addVisitedMark, existingTripKeys, existingVisitedCodes } from './serverStore.js'

const MAX_PROCESSED_IDS = 1000

export interface ScanSummary {
  scanned: number
  newEmails: number
  added: number
}

interface AddedItem {
  type: 'trip' | 'mark'
  id?: string
  code?: string
  countryName: string
  entryDate: string
  exitDate: string
  kind: string
  summary: string
}

export async function scanAndApplyForUser(db: AdminDb, uid: string): Promise<ScanSummary> {
  const tokenDoc = (await db.collection('gmailTokens').doc(uid).get()).data()
  const refreshToken = tokenDoc?.refreshToken as string | undefined
  if (!refreshToken) return { scanned: 0, newEmails: 0, added: 0 }

  const stateRef = db.collection('gmailScanState').doc(uid)
  const state = (await stateRef.get()).data()
  const processed = new Set<string>(Array.isArray(state?.processedIds) ? state!.processedIds : [])

  const accessToken = await getAccessToken(refreshToken)
  const emails = await getBookingEmailContents(accessToken, 20)
  const fresh = emails.filter((e) => !processed.has(e.id))

  const items: AddedItem[] = []

  if (fresh.length > 0) {
    const trips = await extractTripsFromEmails(fresh)
    const highs = trips.filter(
      (t) => t.confidence === 'high' && t.countryCode && t.entryDate && t.exitDate,
    )
    if (highs.length > 0) {
      const [tripKeys, marks] = await Promise.all([
        existingTripKeys(db, uid),
        existingVisitedCodes(db, uid),
      ])
      for (const t of highs) {
        const code = t.countryCode.toUpperCase()
        if (isSchengen(code)) {
          const key = `${code}|${t.entryDate}|${t.exitDate}`
          if (tripKeys.has(key)) continue
          const id = await addTrip(db, uid, {
            entryDate: t.entryDate,
            exitDate: t.exitDate,
            countryCode: code,
            note: t.summary,
          })
          tripKeys.add(key)
          items.push({
            type: 'trip',
            id,
            countryName: t.countryName,
            entryDate: t.entryDate,
            exitDate: t.exitDate,
            kind: t.kind,
            summary: t.summary,
          })
        } else {
          if (marks.has(code)) continue
          await addVisitedMark(db, uid, code)
          marks.add(code)
          items.push({
            type: 'mark',
            code,
            countryName: t.countryName,
            entryDate: t.entryDate,
            exitDate: t.exitDate,
            kind: t.kind,
            summary: t.summary,
          })
        }
      }
    }
  }

  // Remember every fetched id so we don't reprocess it (cap the list).
  const merged = Array.from(new Set([...processed, ...emails.map((e) => e.id)]))
  await stateRef.set(
    { processedIds: merged.slice(-MAX_PROCESSED_IDS), lastScanAt: Date.now() },
    { merge: true },
  )

  // Notify the user in-app about what was auto-added.
  if (items.length > 0) {
    await db.collection('users').doc(uid).collection('notifications').add({
      kind: 'gmail-scan',
      createdAt: Date.now(),
      seen: false,
      items,
    })
  }

  return { scanned: emails.length, newEmails: fresh.length, added: items.length }
}
