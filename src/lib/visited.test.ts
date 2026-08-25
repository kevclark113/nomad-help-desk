import { describe, it, expect } from 'vitest'
import { visitedCodes, countryStats, normalizeCode, classifyCountries } from './visited'
import type { Trip, MarkStatus } from './types'

const marks = (entries: Record<string, MarkStatus>): Map<string, MarkStatus> =>
  new Map(Object.entries(entries))

const trip = (id: string, entryDate: string, exitDate: string, countryCode?: string): Trip => ({
  id,
  entryDate,
  exitDate,
  countryCode,
})

describe('normalizeCode', () => {
  it('uppercases and trims', () => {
    expect(normalizeCode(' pt ')).toBe('PT')
    expect(normalizeCode('es')).toBe('ES')
  })
})

describe('visitedCodes', () => {
  it('unions trip countries with manual toggles, deduped and uppercased', () => {
    const trips = [trip('1', '2026-01-01', '2026-01-10', 'PT'), trip('2', '2026-02-01', '2026-02-05', 'ES')]
    const codes = visitedCodes(trips, ['th', 'pt']) // manual lowercase + duplicate of PT
    expect(codes).toEqual(new Set(['PT', 'ES', 'TH']))
  })

  it('ignores trips without a country code', () => {
    const trips = [trip('1', '2026-01-01', '2026-01-10'), trip('2', '2026-02-01', '2026-02-05', 'FR')]
    expect(visitedCodes(trips, [])).toEqual(new Set(['FR']))
  })

  it('is empty with no trips and no manual toggles', () => {
    expect(visitedCodes([], [])).toEqual(new Set())
  })
})

describe('countryStats', () => {
  it('aggregates days, trip count, and first/last dates per country', () => {
    const trips = [
      trip('1', '2026-03-10', '2026-03-20', 'PT'), // 11 days
      trip('2', '2026-06-01', '2026-06-05', 'PT'), // 5 days
      trip('3', '2026-04-01', '2026-04-02', 'ES'), // 2 days
      trip('4', '2026-05-01', '2026-05-10'), // no country → ignored
    ]
    const stats = countryStats(trips)
    expect(stats.get('PT')).toEqual({
      code: 'PT',
      days: 16,
      trips: 2,
      firstEntry: '2026-03-10',
      lastExit: '2026-06-05',
    })
    expect(stats.get('ES')).toEqual({
      code: 'ES',
      days: 2,
      trips: 1,
      firstEntry: '2026-04-01',
      lastExit: '2026-04-02',
    })
    expect(stats.size).toBe(2)
  })

  it('normalizes country codes when aggregating', () => {
    const trips = [trip('1', '2026-01-01', '2026-01-02', 'pt'), trip('2', '2026-02-01', '2026-02-02', 'PT')]
    const stats = countryStats(trips)
    expect(stats.size).toBe(1)
    expect(stats.get('PT')?.trips).toBe(2)
  })
})

describe('classifyCountries', () => {
  const today = '2026-08-25'

  it('splits past/ongoing trips (visited) from future trips (upcoming)', () => {
    const trips = [
      trip('1', '2026-03-01', '2026-03-10', 'PT'), // past → visited
      trip('2', '2026-08-25', '2026-09-01', 'ES'), // starts today → visited
      trip('3', '2026-12-01', '2026-12-10', 'GR'), // future → upcoming
    ]
    const { visited, upcoming, bucket } = classifyCountries(trips, marks({}), today)
    expect(visited).toEqual(new Set(['PT', 'ES']))
    expect(upcoming).toEqual(new Set(['GR']))
    expect(bucket).toEqual(new Set())
  })

  it('classifies manual visited and bucket marks', () => {
    const { visited, bucket } = classifyCountries([], marks({ TH: 'visited', JP: 'bucket' }), today)
    expect(visited).toEqual(new Set(['TH']))
    expect(bucket).toEqual(new Set(['JP']))
  })

  it('keeps a country in both visited and upcoming (been there + going again)', () => {
    const trips = [
      trip('1', '2026-01-01', '2026-01-10', 'PT'), // past
      trip('2', '2026-12-01', '2026-12-10', 'PT'), // future
    ]
    const { visited, upcoming, bucket } = classifyCountries(trips, marks({}), today)
    expect(visited.has('PT')).toBe(true)
    expect(upcoming.has('PT')).toBe(true)
    expect(bucket.has('PT')).toBe(false)
  })

  it('drops bucket when a country is visited or upcoming', () => {
    const trips = [
      trip('1', '2026-12-01', '2026-12-10', 'GR'), // future GR (upcoming)
      trip('2', '2026-01-01', '2026-01-05', 'IT'), // past IT (visited)
    ]
    // IT also marked bucket (should stay visited); GR also marked bucket (stays upcoming)
    const { visited, upcoming, bucket } = classifyCountries(
      trips,
      marks({ IT: 'bucket', GR: 'bucket', JP: 'bucket' }),
      today,
    )
    expect(visited).toEqual(new Set(['IT']))
    expect(upcoming).toEqual(new Set(['GR']))
    expect(bucket).toEqual(new Set(['JP'])) // IT and GR removed by precedence
  })
})
