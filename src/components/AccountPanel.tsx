import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { color, radius } from '../theme/tokens'
import { Button, Field } from '../theme/components/ui'

/** Friendly messages for the Firebase auth error codes we expect. */
function friendlyError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/email-already-in-use':
      return 'An account already exists for that email — try signing in.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.'
    default:
      return (err as Error)?.message ?? 'Something went wrong. Please try again.'
  }
}

export function AccountPanel() {
  const { user, loading, enabled, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut } =
    useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Accounts aren't available (Firebase not configured) — hide entirely.
  if (!enabled) return null
  if (loading) {
    return <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>Checking sign-in…</p>
  }

  // Signed in — compact status + sign out.
  if (user) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              aria-hidden="true"
              style={{ width: 8, height: 8, borderRadius: '50%', background: color.olive }}
            />
            <span style={{ color: color.paper, fontSize: 14, fontWeight: 600 }}>
              Synced across devices
            </span>
          </div>
          <div
            style={{
              color: color.muted,
              fontSize: 12,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.email ?? 'Signed in'}
          </div>
        </div>
        <Button variant="ghost" onClick={() => void signOut()} style={{ flex: '0 0 auto' }}>
          Sign out
        </Button>
      </div>
    )
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(friendlyError(e))
    } finally {
      setBusy(false)
    }
  }

  const canSubmit = email.trim() !== '' && password !== '' && !busy

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>
        Optional — sign in to back up your trips and sync them across devices.
      </p>

      <Button variant="ghost" onClick={() => void run(signInWithGoogle)} disabled={busy}>
        Continue with Google
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: color.muted, fontSize: 12 }}>
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
        or
        <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.12)' }} />
      </div>

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Password"
        type="password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <span style={{ color: color.coral, fontSize: 12 }}>{error}</span>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button
          onClick={() =>
            void run(() =>
              mode === 'signup'
                ? signUpWithEmail(email.trim(), password)
                : signInWithEmail(email.trim(), password),
            )
          }
          disabled={!canSubmit}
          style={{ opacity: canSubmit ? 1 : 0.5 }}
        >
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signup' ? 'signin' : 'signup')
            setError(null)
          }}
          style={{
            font: 'inherit',
            fontSize: 12,
            color: color.cobalt,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            borderRadius: radius.pill,
          }}
        >
          {mode === 'signup' ? 'Have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  )
}
