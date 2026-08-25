import type { Trip } from '../lib/types'
import { formatHuman, inclusiveDays, daysBetween, type ISODate } from '../lib/dateUtils'
import { schengenName } from '../lib/schengenCountries'
import { color } from '../theme/tokens'
import { Button } from '../theme/components/ui'

/** Does `date` fall within the trip's stay (inclusive)? */
function tripContains(trip: Trip, date: ISODate): boolean {
  return daysBetween(trip.entryDate, date) >= 0 && daysBetween(date, trip.exitDate) >= 0
}

/** Read-only list of recorded trips with edit/delete actions. */
export function TripsList({
  trips,
  violationDate,
  onEdit,
  onDelete,
}: {
  trips: Trip[]
  /** The date the 90-day limit is first breached, if any — used to flag the offending trip. */
  violationDate: ISODate | null
  onEdit: (trip: Trip) => void
  onDelete: (id: string) => void
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
      {trips.map((t) => {
        const breaches = violationDate !== null && tripContains(t, violationDate)
        return (
          <li
            key={t.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 12,
              background: breaches ? 'rgba(237,138,111,0.12)' : 'rgba(0,0,0,0.2)',
              // Coral left accent bar on the offending trip.
              borderLeft: `3px solid ${breaches ? color.coral : 'transparent'}`,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ color: color.paper, fontSize: 14, fontWeight: 600 }}>
                {formatHuman(t.entryDate, true)} → {formatHuman(t.exitDate, true)}
              </div>
              <div style={{ color: color.muted, fontSize: 12, marginTop: 2 }}>
                {inclusiveDays(t.entryDate, t.exitDate)} days
                {t.countryCode ? ` · ${schengenName(t.countryCode)}` : ''}
                {t.note ? ` · ${t.note}` : ''}
              </div>
              {breaches && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    marginTop: 6,
                    color: color.coral,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{ width: 7, height: 7, borderRadius: '50%', background: color.coral }}
                  />
                  crosses 90 days on {formatHuman(violationDate!)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}>
              <Button variant="ghost" onClick={() => onEdit(t)} aria-label="Edit trip">
                Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => onDelete(t.id)}
                aria-label="Delete trip"
              >
                Delete
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
