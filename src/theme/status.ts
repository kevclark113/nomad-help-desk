import { color } from './tokens'

/**
 * Risk wording + accent color scale for the status chip.
 * Design decision (see DESIGN.md): "on track" → "cutting it close" → "over".
 */
export type Risk = 'on-track' | 'close' | 'over'

/** Days-remaining threshold below which we warn "cutting it close". */
export const CLOSE_THRESHOLD = 15

export function riskOf(daysRemaining: number): Risk {
  if (daysRemaining < 0) return 'over'
  if (daysRemaining <= CLOSE_THRESHOLD) return 'close'
  return 'on-track'
}

export const riskLabel: Record<Risk, string> = {
  'on-track': 'on track',
  close: 'cutting it close',
  over: 'over',
}

export const riskColor: Record<Risk, string> = {
  'on-track': color.olive,
  close: color.marigold,
  over: color.coral,
}
