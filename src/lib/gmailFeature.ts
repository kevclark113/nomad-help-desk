/**
 * Client-side gate for the Gmail-import feature: decides whether to SHOW the UI.
 * The server (api/_lib/allowlist.ts) is authoritative and enforces the real
 * allowlist on every request — keep the two lists in sync. To approve a friend,
 * add their email here and on the server (or set GMAIL_ALLOWLIST in Vercel).
 */
const ALLOWLIST = ['kevclark113@gmail.com', 'jenniferaclark315@gmail.com'].map((e) =>
  e.toLowerCase(),
)

export function gmailFeatureAllowed(email: string | null | undefined): boolean {
  return !!email && ALLOWLIST.includes(email.toLowerCase())
}
