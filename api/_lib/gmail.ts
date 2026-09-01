/**
 * Gmail read helpers shared by the manual scan (api/gmail/scan) and, later, the
 * scheduled background scan. Uses the stored refresh token to mint a short-lived
 * access token, then queries the Gmail API for likely travel-booking emails.
 * All access is read-only (gmail.readonly scope).
 */

/** Exchange a stored refresh token for a short-lived access token. */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error(`Failed to refresh access token (${res.status})`)
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error('No access token returned')
  return data.access_token
}

/**
 * Gmail search query pre-filtering to travel bookings: common booking-platform /
 * airline / hotel senders, plus reservation-style subjects. Deliberately broad —
 * later Claude decides what's actually a trip. Tune as we see real inbox hits.
 */
export const BOOKING_QUERY = [
  'newer_than:1y',
  '(',
  'subject:(itinerary OR reservation OR "booking confirmation" OR "e-ticket" OR "boarding pass" OR "flight confirmation" OR "hotel confirmation" OR "your trip" OR "check-in")',
  'OR from:(booking.com OR airbnb.com OR expedia.com OR hotels.com OR agoda.com OR ryanair.com OR easyjet.com OR united.com OR delta.com OR aa.com OR lufthansa.com OR klm.com OR airfrance.com OR vueling.com OR wizzair.com OR britishairways.com OR marriott.com OR hilton.com OR ihg.com OR accor.com OR skyscanner.net OR kayak.com OR trip.com OR kiwi.com OR hostelworld.com)',
  ')',
].join(' ')

export interface EmailHeader {
  id: string
  subject: string
  from: string
  date: string
  snippet: string
}

/** List booking-candidate message IDs, then fetch light metadata for each. */
export async function searchBookingEmails(accessToken: string, max = 20): Promise<EmailHeader[]> {
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('q', BOOKING_QUERY)
  listUrl.searchParams.set('maxResults', String(max))
  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!listRes.ok) throw new Error(`Gmail search failed (${listRes.status}): ${await listRes.text()}`)
  const list = (await listRes.json()) as { messages?: Array<{ id: string }> }
  const ids = (list.messages ?? []).map((m) => m.id)

  const headers = await Promise.all(
    ids.map(async (id): Promise<EmailHeader | null> => {
      const mUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
      mUrl.searchParams.set('format', 'metadata')
      for (const h of ['Subject', 'From', 'Date']) mUrl.searchParams.append('metadataHeaders', h)
      const mRes = await fetch(mUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!mRes.ok) return null
      const m = (await mRes.json()) as {
        snippet?: string
        payload?: { headers?: Array<{ name: string; value: string }> }
      }
      const hs = m.payload?.headers ?? []
      const get = (n: string) => hs.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? ''
      return { id, subject: get('Subject'), from: get('From'), date: get('Date'), snippet: m.snippet ?? '' }
    }),
  )

  return headers.filter((h): h is EmailHeader => h !== null)
}

export interface EmailContent {
  id: string
  subject: string
  from: string
  date: string
  body: string
}

type GmailPart = {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPart[]
}

/** Recursively pull plain-text (falling back to stripped HTML) from a Gmail payload. */
function extractPlainText(part: GmailPart | undefined): string {
  if (!part) return ''
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return Buffer.from(part.body.data, 'base64url').toString('utf8')
  }
  for (const p of part.parts ?? []) {
    const t = extractPlainText(p)
    if (t) return t
  }
  if (part.mimeType === 'text/html' && part.body?.data) {
    return Buffer.from(part.body.data, 'base64url')
      .toString('utf8')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  }
  return ''
}

/** Fetch full booking-candidate emails with their text bodies, for AI extraction. */
export async function getBookingEmailContents(accessToken: string, max = 12): Promise<EmailContent[]> {
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  listUrl.searchParams.set('q', BOOKING_QUERY)
  listUrl.searchParams.set('maxResults', String(max))
  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!listRes.ok) throw new Error(`Gmail search failed (${listRes.status}): ${await listRes.text()}`)
  const list = (await listRes.json()) as { messages?: Array<{ id: string }> }
  const ids = (list.messages ?? []).map((m) => m.id)

  const contents = await Promise.all(
    ids.map(async (id): Promise<EmailContent | null> => {
      const mUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`)
      mUrl.searchParams.set('format', 'full')
      const mRes = await fetch(mUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!mRes.ok) return null
      const m = (await mRes.json()) as {
        snippet?: string
        payload?: GmailPart & { headers?: Array<{ name: string; value: string }> }
      }
      const hs = m.payload?.headers ?? []
      const get = (n: string) => hs.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value ?? ''
      const body = (extractPlainText(m.payload) || m.snippet || '').slice(0, 2500)
      return { id, subject: get('Subject'), from: get('From'), date: get('Date'), body }
    }),
  )

  return contents.filter((c): c is EmailContent => c !== null)
}
