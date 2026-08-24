import type { SchengenStatus } from '../../lib/schengen'
import { LIMIT_DAYS } from '../../lib/schengen'
import { formatHuman } from '../../lib/dateUtils'
import { color, radius, type } from '../tokens'
import { riskOf, riskLabel, riskColor } from '../status'
import { Orb } from './Orb'

/**
 * The centerpiece. Dark navy card, shaded orbs bleeding off the right corners,
 * big day count, coral progress bar, marigold footer. See DESIGN.md.
 */
export function StatusCard({ status }: { status: SchengenStatus }) {
  const { daysUsed, daysRemaining, nextResetDate } = status
  const risk = riskOf(daysRemaining)
  const pct = Math.min(100, Math.max(0, (daysUsed / LIMIT_DAYS) * 100))

  const remainingText =
    daysRemaining >= 0
      ? `${daysRemaining} days left`
      : `over by ${Math.abs(daysRemaining)} days`
  const resetText = nextResetDate
    ? `window resets ${formatHuman(nextResetDate)}`
    : 'no days used yet'

  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius.card,
        padding: '26px 24px 22px',
        background: `linear-gradient(160deg, ${color.groundSheenTop} 0%, ${color.ground} 46%, ${color.groundSheenBottom} 100%)`,
        boxShadow: '0 28px 64px rgba(0,0,0,0.5)',
        isolation: 'isolate',
      }}
    >
      {/* Orbs bleed off the right corners; card overflow clips them. */}
      <Orb
        hue="teal"
        size={150}
        className="orb-enter"
        style={{ top: -54, right: -46, zIndex: 0 }}
      />
      <Orb
        hue="rose"
        size={92}
        className="orb-enter orb-enter--2"
        style={{ bottom: -40, right: -22, zIndex: 0 }}
      />

      <div className="content-enter" style={{ position: 'relative', zIndex: 1 }}>
        {/* Top row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: type.heading, fontWeight: 500, color: color.paper }}>
            Schengen area
          </span>
          <span
            style={{
              background: color.marigold,
              color: color.groundSheenBottom,
              fontSize: 12,
              fontWeight: 700,
              padding: '5px 11px',
              borderRadius: radius.pill,
              whiteSpace: 'nowrap',
            }}
          >
            rolling 90 / 180
          </span>
        </div>

        {/* Big count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
            margin: '18px 0 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
            <span
              style={{
                fontFamily: type.display,
                fontSize: type.bigCount,
                fontWeight: 700,
                lineHeight: 1,
                color: color.paper,
                letterSpacing: '-0.02em',
              }}
            >
              {daysUsed}
            </span>
            <span style={{ color: color.muted, fontSize: 15 }}>/ {LIMIT_DAYS} days used</span>
          </div>
          <span
            style={{
              alignSelf: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${riskColor[risk]}`,
              color: riskColor[risk],
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: radius.pill,
              whiteSpace: 'nowrap',
            }}
          >
            {riskLabel[risk]}
          </span>
        </div>

        {/* Progress bar */}
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={LIMIT_DAYS}
          aria-valuenow={daysUsed}
          aria-label="Schengen days used"
          style={{
            height: 12,
            borderRadius: radius.pill,
            background: 'rgba(0,0,0,0.28)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              borderRadius: radius.pill,
              background: `linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%), ${color.coral}`,
              transition: 'width 240ms ease',
            }}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            color: color.muted,
            fontSize: 13,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: color.marigold,
              flex: '0 0 auto',
            }}
          />
          <span>
            {remainingText} · {resetText}
          </span>
        </div>
      </div>
    </section>
  )
}
