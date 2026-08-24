import { useState } from 'react'
import type { Trip } from '../lib/types'
import { checkPlannedTrip, schengenStatus } from '../lib/schengen'
import { isValidISODate, daysBetween, inclusiveDays, formatHuman } from '../lib/dateUtils'
import { color, radius } from '../theme/tokens'
import { Field } from '../theme/components/ui'

/**
 * "Plan a trip": enter proposed dates and see whether they'd bust the 90-day
 * limit, the first date they would, and the latest exit that stays safe.
 */
export function PlanTrip({ trips }: { trips: Trip[] }) {
  const [entryDate, setEntryDate] = useState('')
  const [exitDate, setExitDate] = useState('')

  const valid =
    isValidISODate(entryDate) &&
    isValidISODate(exitDate) &&
    daysBetween(entryDate, exitDate) >= 0

  const result = valid ? checkPlannedTrip(trips, entryDate, exitDate) : null
  const atExit = valid
    ? schengenStatus([...trips, { entryDate, exitDate }], exitDate)
    : null
  const plannedLen = valid ? inclusiveDays(entryDate, exitDate) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Field
          label="Proposed entry"
          type="date"
          value={entryDate}
          max={exitDate || undefined}
          onChange={(e) => setEntryDate(e.target.value)}
          style={{ flex: '1 1 140px' }}
        />
        <Field
          label="Proposed exit"
          type="date"
          value={exitDate}
          min={entryDate || undefined}
          onChange={(e) => setExitDate(e.target.value)}
          style={{ flex: '1 1 140px' }}
        />
      </div>

      {!valid && (
        <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>
          Enter desired dates to check your stay.
        </p>
      )}

      {valid && result && atExit && (
        <div
          style={{
            borderRadius: radius.chunky,
            padding: '14px 16px',
            background: result.wouldExceed
              ? 'rgba(237,138,111,0.12)'
              : 'rgba(157,187,68,0.12)',
            border: `1px solid ${result.wouldExceed ? color.coral : color.olive}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <strong
            style={{
              color: result.wouldExceed ? color.coral : color.olive,
              fontSize: 15,
            }}
          >
            {result.wouldExceed
              ? 'Over the limit'
              : `Fits — a ${plannedLen}-day stay`}
          </strong>

          {result.wouldExceed ? (
            <>
              <span style={{ color: color.paper, fontSize: 13 }}>
                This {plannedLen}-day stay first exceeds 90 days on{' '}
                <strong>{formatHuman(result.firstViolationDate!, true)}</strong>.
              </span>
              <span style={{ color: color.muted, fontSize: 13 }}>
                {result.latestSafeExitDate
                  ? `Latest safe exit from ${formatHuman(entryDate)}: ${formatHuman(
                      result.latestSafeExitDate,
                      true,
                    )}.`
                  : 'You are already at 90 days for this window — no safe stay from this entry.'}
              </span>
            </>
          ) : (
            <span style={{ color: color.muted, fontSize: 13 }}>
              You&rsquo;d have <strong style={{ color: color.paper }}>{atExit.daysRemaining} days</strong>{' '}
              left at exit ({formatHuman(exitDate, true)}).
            </span>
          )}
        </div>
      )}
    </div>
  )
}
