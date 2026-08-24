import { color } from './tokens'
import type { SchengenStatus } from '../lib/schengen'
import { toDayNumber, type ISODate } from '../lib/dateUtils'

/**
 * Risk wording + accent color scale for the status chip.
 * Design decision (see DESIGN.md): "on track" → "cutting it close" → "over".
 *
 * "will exceed" is added for the case where the user isn't over *today*, but a
 * recorded (future) trip will push them past 90 — so entering a violating trip
 * flips the chip off "on track" even before the violation date arrives.
 */
export type Risk = 'on-track' | 'close' | 'will-exceed' | 'over'

/** Days-remaining threshold below which we warn "cutting it close". */
export const CLOSE_THRESHOLD = 15

export function riskOf(status: SchengenStatus, asOf: ISODate): Risk {
  const { daysRemaining, projectedViolationDate } = status

  // The chip reflects TODAY's rolling window. A past breach that has since
  // rolled out of the 180-day window leaves you compliant again, so it does not
  // make the chip "over" (the trips list still flags the historical crossing).

  // Currently over the limit.
  if (daysRemaining < 0) return 'over'

  // Compliant today, but a recorded FUTURE trip will breach 90.
  if (projectedViolationDate !== null && toDayNumber(projectedViolationDate) > toDayNumber(asOf)) {
    return 'will-exceed'
  }

  if (daysRemaining <= CLOSE_THRESHOLD) return 'close'
  return 'on-track'
}

export const riskLabel: Record<Risk, string> = {
  'on-track': 'on track',
  close: 'cutting it close',
  'will-exceed': 'will exceed',
  over: 'over',
}

export const riskColor: Record<Risk, string> = {
  'on-track': color.olive,
  close: color.marigold,
  'will-exceed': color.coral,
  over: color.coral,
}
