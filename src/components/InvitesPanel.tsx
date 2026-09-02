import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  createInvite,
  isOwner,
  listInvites,
  revokeInvite,
  runAutoScan,
  type AllowedUser,
  type InviteRecord,
} from '../lib/invites'
import { color } from '../theme/tokens'
import { Panel } from '../theme/components/ui'
import { Button, Field } from '../theme/components/ui'

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      variant="ghost"
      style={{ padding: '6px 12px' }}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? 'Copied!' : label}
    </Button>
  )
}

function inviteStatus(inv: InviteRecord): string {
  if (inv.revoked) return 'Revoked'
  if (inv.redeemed) return `Used by ${inv.redeemedEmail ?? 'someone'}`
  return 'Pending'
}

/** Owner-only: create/manage invite links and see who's approved. */
export function InvitesPanel() {
  const { user } = useAuth()
  const [invites, setInvites] = useState<InviteRecord[]>([])
  const [allowlist, setAllowlist] = useState<AllowedUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanMsg, setScanMsg] = useState<string | null>(null)

  const owner = isOwner(user?.email)

  const reload = async () => {
    if (!user) return
    try {
      const data = await listInvites(user)
      setInvites(data.invites)
      setAllowlist(data.allowlist)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoaded(true)
    }
  }

  useEffect(() => {
    if (owner && user) void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, user])

  if (!user || !owner) return null

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      await createInvite(user, note.trim() || undefined)
      setNote('')
      await reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const runScan = async () => {
    if (!user) return
    setScanBusy(true)
    setScanMsg(null)
    try {
      const r = await runAutoScan(user)
      setScanMsg(`Scanned ${r.users} connected ${r.users === 1 ? 'user' : 'users'} · added ${r.totalAdded} new ${r.totalAdded === 1 ? 'trip' : 'trips'}.`)
    } catch (e) {
      setScanMsg((e as Error).message)
    } finally {
      setScanBusy(false)
    }
  }

  const revoke = async (token: string) => {
    setError(null)
    try {
      await revokeInvite(user, token)
      await reload()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  // Emails to add to Google's OAuth test-user list (owners are already there).
  const testUserEmails = allowlist.map((a) => a.email).join('\n')

  return (
    <Panel>
      <h2 className="panel-heading" style={{ fontSize: 20, margin: '0 0 12px', color: color.paper }}>
        Invites (owner)
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ color: color.muted, fontSize: 13, margin: 0 }}>
          Create a single-use link for someone you want to give access to. They open it, sign in with
          Google, and they’re approved.
        </p>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <Field
            label="Note (optional)"
            placeholder="e.g. Jennifer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <Button variant="chip" onClick={() => void create()} disabled={busy}>
            {busy ? 'Creating…' : 'Create invite link'}
          </Button>
        </div>

        {error && <span style={{ color: color.coral, fontSize: 12 }}>{error}</span>}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Button variant="ghost" onClick={() => void runScan()} disabled={scanBusy}>
            {scanBusy ? 'Scanning everyone…' : 'Run auto-scan now'}
          </Button>
          <span style={{ color: color.muted, fontSize: 12 }}>
            {scanMsg ?? 'Scans every connected inbox and auto-adds high-confidence trips. Runs daily on its own.'}
          </span>
        </div>

        {loaded && invites.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invites.map((inv) => {
              const pending = !inv.redeemed && !inv.revoked
              return (
                <div
                  key={inv.token}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    opacity: pending ? 1 : 0.7,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        color: color.paper,
                        fontSize: 13,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {inv.note || inv.url}
                    </div>
                    <div style={{ color: color.muted, fontSize: 12 }}>{inviteStatus(inv)}</div>
                  </div>
                  {pending && <CopyButton text={inv.url} label="Copy link" />}
                  {pending && (
                    <Button
                      variant="danger"
                      style={{ padding: '6px 12px' }}
                      onClick={() => void revoke(inv.token)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div
          style={{
            marginTop: 4,
            paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: color.paper, fontSize: 13, fontWeight: 600 }}>
              Approved ({allowlist.length})
            </span>
            {allowlist.length > 0 && <CopyButton text={testUserEmails} label="Copy emails" />}
          </div>
          {allowlist.length > 0 && (
            <div style={{ color: color.muted, fontSize: 12, lineHeight: 1.6 }}>
              {allowlist.map((a) => a.email).join(', ')}
            </div>
          )}
          <p style={{ color: color.marigold, fontSize: 12, margin: 0 }}>
            Reminder: also add each approved email to Google’s OAuth <b>test users</b> (Google Cloud
            → Google Auth Platform → Audience) so they can connect Gmail.
          </p>
        </div>
      </div>
    </Panel>
  )
}
