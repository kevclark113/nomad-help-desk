/**
 * Claude-powered trip extraction: turn booking emails into structured proposed
 * trips. Reused by the manual /api/gmail/extract and (later) the scheduled scan.
 *
 * The Anthropic SDK is loaded via dynamic import() inside the function to keep
 * the serverless cold start light. We prompt for strict JSON and parse it
 * defensively — no schema-validation dependency, so it works on any model.
 */
import type { EmailContent } from './gmail.js'

export interface ProposedTrip {
  sourceIndex: number
  countryCode: string
  countryName: string
  entryDate: string
  exitDate: string
  confidence: 'high' | 'medium' | 'low'
  kind: 'flight' | 'hotel' | 'train' | 'other'
  summary: string
}

const SYSTEM = `You extract international travel trips from a traveler's booking emails, to populate a Schengen 90/180-day tracker and a visited-countries map.

For each email, decide whether it means the traveler is physically in a country for a date or date range.

INCLUDE as trips:
- Flight bookings (arrival into a country).
- Hotel / Airbnb / hostel / accommodation stays (check-in to check-out).
- Intercity or international train journeys.

EXCLUDE (never output these): tickets or reservations for attractions, museums, tours, restaurants, events, shows, or car rentals — anything that is not lodging or transport between places. Example: a "Vatican Museums booking" is an attraction ticket, NOT a trip.

Rules:
- countryCode: ISO 3166-1 alpha-2 (ES, CZ, DE, FR, IT, ...). countryName: English country name.
- Dates in YYYY-MM-DD. For a stay, entryDate = check-in, exitDate = check-out. For a one-way flight or a single train journey, use the travel date for BOTH entryDate and exitDate. If the year is missing, infer the most likely year from context.
- confidence: "high" when dates and country are explicit, "medium" when inferred, "low" when uncertain.
- kind: one of flight, hotel, train, other.
- summary: a short human label, e.g. "Ryanair flight to Spain" or "Hotel in Prague".
- sourceIndex: the EMAIL number you extracted this from.
- Prefer one trip spanning a stay in a country; only output separate arrival/departure trips when clearly warranted.

Respond with ONLY a JSON object (no prose, no markdown code fences) in exactly this shape:
{"trips":[{"sourceIndex":0,"countryCode":"ES","countryName":"Spain","entryDate":"2026-08-30","exitDate":"2026-10-11","confidence":"high","kind":"hotel","summary":"Hotel in Barcelona"}]}
If no trips qualify, respond with {"trips":[]}.`

/** Pull the JSON object out of the model's text (tolerating stray prose/fences). */
function parseTripsJson(text: string): ProposedTrip[] {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) return []
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { trips?: unknown }
    return Array.isArray(parsed.trips) ? (parsed.trips as ProposedTrip[]) : []
  } catch {
    return []
  }
}

/** Run Claude over the emails and return proposed trips. */
export async function extractTripsFromEmails(emails: EmailContent[]): Promise<ProposedTrip[]> {
  if (emails.length === 0) return []

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic()

  const rendered = emails
    .map(
      (e, i) =>
        `--- EMAIL ${i} ---\nFrom: ${e.from}\nDate: ${e.date}\nSubject: ${e.subject}\n\n${e.body}`,
    )
    .join('\n\n')

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Extract trips from these ${emails.length} booking email(s):\n\n${rendered}`,
      },
    ],
  })

  const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('')

  return parseTripsJson(text)
}
