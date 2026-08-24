import type { Trip } from '../lib/types'
import { formatHuman, inclusiveDays } from '../lib/dateUtils'
import { color } from '../theme/tokens'
import { Button } from '../theme/components/ui'

/** Read-only list of recorded trips with edit/delete actions. */
export function TripsList({
  trips,
  onEdit,
  onDelete,
}: {
  trips: Trip[]
  onEdit: (trip: Trip) => void
  onDelete: (id: number) => void
}) {
  if (trips.length === 0) {
    return (
      <p style={{ color: color.muted, fontSize: 14, margin: 0 }}>
        No trips yet. Add your first Schengen stay above.
      </p>
    )
  }

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
      {trips.map((t) => (
        <li
          key={t.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: color.paper, fontSize: 14, fontWeight: 600 }}>
              {formatHuman(t.entryDate, true)} → {formatHuman(t.exitDate, true)}
            </div>
            <div style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>
              {inclusiveDays(t.entryDate, t.exitDate)} days
              {t.note ? ` · ${t.note}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
            <Button variant="ghost" onClick={() => onEdit(t)} aria-label="Edit trip">
              Edit
            </Button>
            <Button
              variant="danger"
              onClick={() => t.id !== undefined && onDelete(t.id)}
              aria-label="Delete trip"
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
