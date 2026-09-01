import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { redeemInvite } from '../lib/invites'
import { color } from '../theme/tokens'
import { Panel } from '../theme/components/ui'
import { Button } from '../theme/components/ui'

/** Read an invite token from /invite/<token> or ?invite=<token>. */
function readInviteToken(): string | null {
  const m = window.location.pathname.match(/^\/invite\/([^/?#]+)/)
  if (m) return decodeURIComponent(m[1])
  return new URLSearchParams(window.location.search).get('invite')
}

/**
 * Shown at the top of the app when the URL carries an invite token. Signs the
 * invitee in (Google), redeems the invite to add them to the allowlist, and then
 * clears itself. Rendered outside the feature gate so a not-yet-approved invitee
 * can still complete it.
 */
export function InviteAccept() {
  const { user, loading, signInWithGoogle } = useAuth()
  const [token] = useState(readInviteToken)
  const [phase, setPhase] = useState<'idle' | 'redeeming' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!token || !user || phase !== 'idle') return
    setPhase('redeeming')
    redeemInvite(user, token)
      .then((r) => {
        setPhase('done')
        setMessage(`You're approved as ${r.email}.`)
      })
      .catch((e) => {
        setPhase('error')
        setMessage((e as Error).message)
      })
  }, [token, user, phase])

  if (!token || dismissed) return null

  const dismiss = () => {
    window.history.replaceState({}, '', '/')
    setDismissed(true)
  }

  return (
    <Panel style={{ borderColor: 'rgba(53,176,188,0.4)' }}>
      <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 8px', color: color.paper }}>
        You’re invited to Nomad Help Desk
      </h2>

      {!user && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>
            Sign in with the Google account you were invited with to accept your invite.
          </p>
          <div>
            <Button
              variant="chipTeal"
              disabled={signingIn || loading}
              onClick={() => {
                setSigningIn(true)
                void signInWithGoogle().catch((e) => setMessage((e as Error).message)).finally(() =>
                  setSigningIn(false),
                )
              }}
            >
              {signingIn ? 'Opening Google…' : 'Continue with Google'}
            </Button>
          </div>
          {message && <span style={{ color: color.coral, fontSize: 12 }}>{message}</span>}
        </div>
      )}

      {user && phase === 'redeeming' && (
        <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>Accepting your invite…</p>
      )}

      {user && phase === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: color.paper, fontSize: 14, margin: 0, fontWeight: 600 }}>{message} 🎉</p>
          <p style={{ color: color.muted, fontSize: 12, margin: 0 }}>
            You can now use the Import from Gmail feature. (If connecting Gmail is blocked, ask the
            person who invited you to add your email to the app’s Google test users.)
          </p>
          <div>
            <Button variant="chipTeal" onClick={dismiss}>
              Continue to Nomad
            </Button>
          </div>
        </div>
      )}

      {user && phase === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ color: color.coral, fontSize: 13, margin: 0 }}>{message}</p>
          <div>
            <Button variant="ghost" onClick={dismiss}>
              Continue to Nomad
            </Button>
          </div>
        </div>
      )}
    </Panel>
  )
}
