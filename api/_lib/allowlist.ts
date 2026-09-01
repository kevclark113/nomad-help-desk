/**
 * Server-side allowlist for the Gmail-import feature. This is the AUTHORITATIVE
 * gate — the client UI gate in `src/lib/gmailFeature.ts` mirrors it for display,
 * but only this decides whether a connect actually proceeds.
 *
 * To approve a friend: set the GMAIL_ALLOWLIST env var in Vercel to a
 * comma-separated list of emails, or add to DEFAULT_ALLOWLIST below (and mirror
 * it in src/lib/gmailFeature.ts so their UI shows the feature).
 */
const DEFAULT_ALLOWLIST = ['kevclark113@gmail.com', 'jenniferaclark315@gmail.com']

function allowlist(): string[] {
  const env = process.env.GMAIL_ALLOWLIST
  const list = env ? env.split(',') : DEFAULT_ALLOWLIST
  return list.map((e) => e.trim().toLowerCase()).filter(Boolean)
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false
  return allowlist().includes(email.toLowerCase())
}
