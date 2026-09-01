import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useTripStore } from '../lib/useTripStore'
import { useVisitedStore } from '../lib/useVisitedStore'
import { SCHENGEN_COUNTRIES } from '../lib/schengenCountries'
import { isOwner } from '../lib/invites'
import {
  fetchGmailStatus,
  extractTrips,
  startGmailConnect,
  type GmailStatus,
  type ExtractResult,
  type ProposedTrip,
} from '../lib/gmailApi'
import { color } from '../theme/tokens'
import { Panel } from '../theme/components/ui'
import { Button } from '../theme/components/ui'

/** Friendly text for the ?gmail=error&reason=... codes the callback can return. */
function reasonText(reason: string | null): string {
  switch (reason) {
    case 'no_refresh_token':
      return 'Google didn’t return access. Remove Nomad at myaccount.google.com/permissions, then reconnect.'
    case 'state_expired':
      return 'The connection link expired. Please try again.'
    default:
      return 'Please try again.'
  }
}

const SCHENGEN_CODES = new Set(SCHENGEN_COUNTRIES.map((c) => c.code))

/** Schengen countries become tracker trips (count toward 90/180); others go on the map. */
function destinationFor(trip: ProposedTrip): 'trip' | 'map' {
  return SCHENGEN_CODES.has(trip.countryCode?.toUpperCase()) ? 'trip' : 'map'
}

const CONFIDENCE_COLOR: Record<ProposedTrip['confidence'], string> = {
  high: color.olive,
  medium: color.marigold,
  low: color.coral,
}

const KIND_ICON: Record<ProposedTrip['kind'], string> = {
  flight: '✈️',
  hotel: '🏨',
  train: '🚆',
  other: '📍',
}

type ApplyState = 'new' | 'exists' | 'added' | 'error'

/** One extracted trip, shown as a compact card with an add action. */
function TripProposal({
  trip,
  destination,
  state,
  busy,
  onAdd,
}: {
  trip: ProposedTrip
  destination: 'trip' | 'map'
  state: ApplyState
  busy: boolean
  onAdd: () => void
}) {
  const dates =
    trip.entryDate === trip.exitDate ? trip.entryDate : `${trip.entryDate} → ${trip.exitDate}`

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 18 }}>
        {KIND_ICON[trip.kind]}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: color.paper, fontSize: 14, fontWeight: 600 }}>
          {trip.summary || trip.countryName}
        </div>
        <div style={{ color: color.muted, fontSize: 12 }}>
          {trip.countryName}
          {trip.countryCode ? ` (${trip.countryCode.toUpperCase()})` : ''} · {dates}
          {destination === 'map' ? ' · visited map (non-Schengen)' : ' · tracker'}
        </div>
      </div>

      <span
        title={`${trip.confidence} confidence`}
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: CONFIDENCE_COLOR[trip.confidence],
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          flex: '0 0 auto',
        }}
      >
        {trip.confidence}
      </span>

      <span style={{ flex: '0 0 auto', minWidth: 70, textAlign: 'right' }}>
        {state === 'new' && (
          <Button variant="ghost" onClick={onAdd} disabled={busy} style={{ padding: '6px 12px' }}>
            Add
          </Button>
        )}
        {state === 'added' && (
          <span style={{ color: color.olive, fontSize: 12, fontWeight: 600 }}>Added ✓</span>
        )}
        {state === 'exists' && (
          <span style={{ color: color.muted, fontSize: 12 }}>
            {destination === 'trip' ? 'In tracker' : 'On map'}
          </span>
        )}
        {state === 'error' && <span style={{ color: color.coral, fontSize: 12 }}>Failed</span>}
      </span>
    </div>
  )
}

export function GmailConnect() {
  const { user } = useAuth()
  const { trips, addTrip } = useTripStore()
  const { marks, setMark } = useVisitedStore()
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ExtractResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [applied, setApplied] = useState<Record<number, 'added' | 'error'>>({})
  const [applyingAll, setApplyingAll] = useState(false)

  const owner = isOwner(user?.email)
  const canUse = owner || status?.allowed === true

  // Keys of trips already in the tracker, to avoid proposing duplicates.
  const existingTripKeys = useMemo(
    () =>
      new Set(
        trips
          .filter((t) => t.countryCode)
          .map((t) => `${t.countryCode!.toUpperCase()}|${t.entryDate}|${t.exitDate}`),
      ),
    [trips],
  )

  // What state a proposal is in: already added this session, already present, or new.
  const stateFor = (trip: ProposedTrip, i: number): ApplyState => {
    if (applied[i] === 'added') return 'added'
    if (applied[i] === 'error') return 'error'
    const code = trip.countryCode?.toUpperCase()
    if (!code) return 'new'
    if (destinationFor(trip) === 'trip') {
      return existingTripKeys.has(`${code}|${trip.entryDate}|${trip.exitDate}`) ? 'exists' : 'new'
    }
    return marks.get(code) === 'visited' ? 'exists' : 'new'
  }

  // Surface the ?gmail= result after returning from Google, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const g = params.get('gmail')
    if (!g) return
    if (g === 'connected') setNotice('Gmail connected. Scan your inbox to import trips.')
    else if (g === 'error') setError(`Couldn’t connect Gmail. ${reasonText(params.get('reason'))}`)
    params.delete('gmail')
    params.delete('reason')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [])

  // Load connection status for any signed-in user; it also tells us whether the
  // server considers them approved (owner or on the Firestore allowlist).
  useEffect(() => {
    if (!user) {
      setStatus(null)
      return
    }
    let cancelled = false
    void fetchGmailStatus(user)
      .then((s) => {
        if (!cancelled) setStatus(s)
      })
      .catch(() => {
        /* status is best-effort; the connect button still works */
      })
    return () => {
      cancelled = true
    }
  }, [user, notice])

  if (!user || !canUse) return null

  const connect = async () => {
    setBusy(true)
    setError(null)
    try {
      await startGmailConnect(user)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const scan = async () => {
    setScanning(true)
    setScanError(null)
    setScanResult(null)
    setApplied({})
    try {
      setScanResult(await extractTrips(user))
    } catch (e) {
      setScanError((e as Error).message)
    } finally {
      setScanning(false)
    }
  }

  const applyTrip = async (trip: ProposedTrip, i: number) => {
    const code = trip.countryCode?.toUpperCase()
    if (!code || !trip.entryDate || !trip.exitDate) return
    try {
      if (destinationFor(trip) === 'trip') {
        await addTrip({
          entryDate: trip.entryDate,
          exitDate: trip.exitDate,
          countryCode: code,
          note: trip.summary,
        })
      } else {
        await setMark(code, 'visited')
      }
      setApplied((a) => ({ ...a, [i]: 'added' }))
    } catch {
      setApplied((a) => ({ ...a, [i]: 'error' }))
    }
  }

  const applyAll = async () => {
    if (!scanResult) return
    setApplyingAll(true)
    for (let i = 0; i < scanResult.trips.length; i++) {
      if (stateFor(scanResult.trips[i], i) === 'new') await applyTrip(scanResult.trips[i], i)
    }
    setApplyingAll(false)
  }

  const newCount = scanResult
    ? scanResult.trips.filter((t, i) => stateFor(t, i) === 'new').length
    : 0

  return (
    <Panel>
      <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 12px', color: color.paper }}>
        Import from Gmail
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>
          Connect Gmail so Nomad can find flight and hotel bookings in your inbox and add them for
          you. Nomad reads only booking-related emails, and always asks before adding a trip.
        </p>

        {status?.connected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span
                aria-hidden="true"
                style={{ width: 8, height: 8, borderRadius: '50%', background: color.olive }}
              />
              <span style={{ color: color.paper, fontSize: 14, fontWeight: 600 }}>
                Gmail connected{status.gmailAddress ? ` · ${status.gmailAddress}` : ''}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="chipTeal" onClick={() => void scan()} disabled={scanning}>
                {scanning ? 'Scanning your inbox…' : 'Scan now'}
              </Button>
              {newCount > 0 && (
                <Button variant="chip" onClick={() => void applyAll()} disabled={applyingAll}>
                  {applyingAll ? 'Adding…' : `Add all ${newCount}`}
                </Button>
              )}
            </div>

            {scanResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ color: color.paper, fontSize: 13, fontWeight: 600 }}>
                  {scanResult.trips.length === 0
                    ? `Scanned ${scanResult.scanned} booking email${scanResult.scanned === 1 ? '' : 's'} — no trips found.`
                    : `Found ${scanResult.trips.length} trip${scanResult.trips.length === 1 ? '' : 's'} in ${scanResult.scanned} booking email${scanResult.scanned === 1 ? '' : 's'}:`}
                </span>
                {scanResult.trips.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {scanResult.trips.map((t, i) => (
                      <TripProposal
                        key={i}
                        trip={t}
                        destination={destinationFor(t)}
                        state={stateFor(t, i)}
                        busy={applyingAll}
                        onAdd={() => void applyTrip(t, i)}
                      />
                    ))}
                  </div>
                )}
                <span style={{ color: color.muted, fontSize: 11, marginTop: 2 }}>
                  Schengen countries are added as tracker trips; other countries are marked on your
                  visited map. Soon this will happen automatically in the background.
                </span>
              </div>
            )}
            {scanError && <span style={{ color: color.coral, fontSize: 12 }}>{scanError}</span>}
          </div>
        ) : (
          <div>
            <Button variant="chipTeal" onClick={() => void connect()} disabled={busy}>
              {busy ? 'Connecting…' : 'Connect Gmail'}
            </Button>
          </div>
        )}

        {notice && <span style={{ color: color.olive, fontSize: 12 }}>{notice}</span>}
        {error && <span style={{ color: color.coral, fontSize: 12 }}>{error}</span>}
      </div>
    </Panel>
  )
}
