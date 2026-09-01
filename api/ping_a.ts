import { isAllowed } from './_lib/allowlist.js'
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, from: 'allowlist.js (with extension)', t: typeof isAllowed })
}
