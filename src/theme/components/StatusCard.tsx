import type { CSSProperties } from 'react'
import type { SchengenStatus } from '../../lib/schengen'
import { LIMIT_DAYS } from '../../lib/schengen'
import { formatHuman, type ISODate } from '../../lib/dateUtils'
import { color } from '../tokens'
import { riskOf, riskLabel, type Risk } from '../status'

/** Served from public/ at the site root by Vite. */
const earthUrl = '/earth.png'

/**
 * The centerpiece — the wide "Schengen Zone" card: dark navy, blue text glow,
 * amber/lime pills, a big day count, coral progress bar, and the illustrated
 * earth bleeding off the right edge. Styling lives in index.css (.zone-*);
 * this supplies the live data and the two dynamic bits (fill width, status
 * pill color). See the Schengen Zone design study.
 */

/** Layered pill fill + non-black ink per risk level. */
const statusStyle: Record<Risk, CSSProperties> = {
  'on-track': { background: 'linear-gradient(180deg, #b6e06e, #a4d65e)', color: '#16341a' },
  close: { background: 'linear-gradient(180deg, #f6d46a, #f2c94c)', color: '#4a3a08' },
  'will-exceed': { background: 'linear-gradient(180deg, #f79070, #e05f45)', color: '#4a1b0c' },
  over: { background: 'linear-gradient(180deg, #f79070, #e05f45)', color: '#4a1b0c' },
}

export function StatusCard({ status, asOf }: { status: SchengenStatus; asOf: ISODate }) {
  const { daysUsed, daysRemaining, nextResetDate, projectedViolationDate } = status
  const risk = riskOf(status, asOf)
  const pct = Math.min(100, Math.max(0, (daysUsed / LIMIT_DAYS) * 100))

  const remainingText =
    daysRemaining >= 0
      ? `${daysRemaining} days left`
      : `over by ${Math.abs(daysRemaining)} days`

  // When a saved future trip will breach 90, lead the footer with that warning;
  // otherwise show the normal reset info.
  const secondaryText =
    risk === 'will-exceed' && projectedViolationDate
      ? `exceeds 90 on ${formatHuman(projectedViolationDate)}`
      : nextResetDate
        ? `1 day frees up ${formatHuman(nextResetDate)}`
        : 'no days used yet'

  return (
    <section className="zone-card">
      <div className="zone-col content-enter">
        <h1 className="zone-title">Schengen Zone</h1>

        <div className="zone-pill-row">
          <span className="zone-pill">rolling 90 / 180</span>
          <span className="zone-status" style={statusStyle[risk]}>
            {riskLabel[risk]}
          </span>
        </div>

        <div className="zone-count-row">
          <span className="zone-count">{daysUsed}</span>
          <span className="zone-count-sub">/ {LIMIT_DAYS} days used</span>
        </div>

        <div
          className="zone-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={LIMIT_DAYS}
          aria-valuenow={daysUsed}
          aria-label="Schengen days used"
        >
          <div className="zone-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="zone-foot">
          <span
            className="zone-foot-dot"
            aria-hidden="true"
            style={{
              background: risk === 'over' || risk === 'will-exceed' ? color.coral : color.marigold,
            }}
          />
          <span className="zone-foot-text">
            {remainingText} · {secondaryText}
          </span>
        </div>
      </div>

      <div className="zone-earth">
        <img src={earthUrl} alt="" aria-hidden="true" />
      </div>
    </section>
  )
}
