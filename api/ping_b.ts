import { redirectUri } from './_lib/google'
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, from: 'google', t: typeof redirectUri })
}
