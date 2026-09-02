import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useTripStore } from '../lib/useTripStore'
import { useVisitedStore } from '../lib/useVisitedStore'
import {
  dismissNotification,
  getUnseenScanNotifications,
  type ScanItem,
  type ScanNotification,
} from '../lib/firestoreNotifications'
import { color } from '../theme/tokens'
import { Panel } from '../theme/components/ui'
import { Button } from '../theme/components/ui'

const KIND_ICON: Record<string, string> = { flight: '✈️', hotel: '🏨', train: '🚆', other: '📍' }

function itemLine(it: ScanItem): string {
  const dates = it.entryDate === it.exitDate ? it.entryDate : `${it.entryDate} → ${it.exitDate}`
  const where = it.type === 'mark' ? `${it.countryName} (map)` : it.countryName
  return `${it.summary || where} · ${dates}`
}

/**
 * Shows what the automatic background scan added, so a changed trip count is
 * never a surprise. "Looks good" keeps them; "Undo" removes the added items.
 */
export function ScanNotice() {
  const { user } = useAuth()
  const { deleteTrip } = useTripStore()
  const { clearMark } = useVisitedStore()
  const [notes, setNotes] = useState<ScanNotification[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!user) {
      setNotes([])
      return
    }
    let cancelled = false
    void getUnseenScanNotifications(user.uid)
      .then((n) => {
        if (!cancelled) setNotes(n)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user || notes.length === 0) return null

  const note = notes[0]
  const total = note.items.length

  const dismiss = async () => {
    setBusy(true)
    try {
      await dismissNotification(user.uid, note.id)
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    setBusy(true)
    try {
      for (const it of note.items) {
        if (it.type === 'trip' && it.id) await deleteTrip(it.id)
        else if (it.type === 'mark' && it.code) await clearMark(it.code)
      }
      await dismissNotification(user.uid, note.id)
      setNotes((prev) => prev.filter((n) => n.id !== note.id))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel style={{ borderColor: 'rgba(53,176,188,0.4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ color: color.paper, fontSize: 14, fontWeight: 700 }}>
          📥 Nomad added {total} {total === 1 ? 'trip' : 'trips'} from your inbox
        </span>
        <ul style={{ margin: 0, paddingLeft: 18, color: color.muted, fontSize: 13, lineHeight: 1.6 }}>
          {note.items.map((it, i) => (
            <li key={i}>
              <span aria-hidden="true">{KIND_ICON[it.kind] ?? '📍'} </span>
              <span style={{ color: color.paper }}>{itemLine(it)}</span>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="chipTeal" onClick={() => void dismiss()} disabled={busy}>
            Looks good
          </Button>
          <Button variant="danger" onClick={() => void undo()} disabled={busy}>
            Undo
          </Button>
        </div>
      </div>
    </Panel>
  )
}
