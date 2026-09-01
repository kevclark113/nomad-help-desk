import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { gmailFeatureAllowed } from '../lib/gmailFeature'
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

/** One extracted trip, shown as a compact card for review. */
function TripProposal({ trip }: { trip: ProposedTrip }) {
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
          {trip.countryCode ? ` (${trip.countryCode})` : ''} · {dates}
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
    </div>
  )
}

export function GmailConnect() {
  const { user } = useAuth()
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ExtractResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const allowed = gmailFeatureAllowed(user?.email)

  // Surface the ?gmail= result after returning from Google, then clean the URL.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const g = params.get('gmail')
    if (!g) return
    if (g === 'connected') setNotice('Gmail connected. Email scanning is coming soon.')
    else if (g === 'error') setError(`Couldn’t connect Gmail. ${reasonText(params.get('reason'))}`)
    params.delete('gmail')
    params.delete('reason')
    const qs = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''))
  }, [])

  // Load connection status for approved, signed-in users.
  useEffect(() => {
    if (!user || !allowed) {
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
  }, [user, allowed, notice])

  if (!user || !allowed) return null

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
    try {
      setScanResult(await extractTrips(user))
    } catch (e) {
      setScanError((e as Error).message)
    } finally {
      setScanning(false)
    }
  }

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

            <div>
              <Button variant="chipTeal" onClick={() => void scan()} disabled={scanning}>
                {scanning ? 'Scanning your inbox…' : 'Scan now'}
              </Button>
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
                      <TripProposal key={i} trip={t} />
                    ))}
                  </div>
                )}
                <span style={{ color: color.muted, fontSize: 11, marginTop: 2 }}>
                  Next: these get added to your tracker automatically — no action needed from you.
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
