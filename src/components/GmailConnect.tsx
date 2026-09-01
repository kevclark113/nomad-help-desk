import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { gmailFeatureAllowed } from '../lib/gmailFeature'
import { fetchGmailStatus, startGmailConnect, type GmailStatus } from '../lib/gmailApi'
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

export function GmailConnect() {
  const { user } = useAuth()
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              aria-hidden="true"
              style={{ width: 8, height: 8, borderRadius: '50%', background: color.olive }}
            />
            <span style={{ color: color.paper, fontSize: 14, fontWeight: 600 }}>
              Gmail connected{status.gmailAddress ? ` · ${status.gmailAddress}` : ''}
            </span>
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
