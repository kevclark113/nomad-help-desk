/** Frontend calls to the Gmail serverless routes, authorized with the user's ID token. */
import type { User } from 'firebase/auth'

export interface GmailStatus {
  allowed: boolean
  connected: boolean
  gmailAddress: string | null
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}

export async function fetchGmailStatus(user: User): Promise<GmailStatus> {
  const token = await user.getIdToken()
  const res = await fetch('/api/gmail/status', { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load Gmail status'))
  return (await res.json()) as GmailStatus
}

/** Starts the OAuth flow by redirecting the browser to Google's consent screen. */
export async function startGmailConnect(user: User): Promise<void> {
  const token = await user.getIdToken()
  const res = await fetch('/api/gmail/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to start Gmail connect'))
  const { url } = (await res.json()) as { url: string }
  window.location.href = url
}
