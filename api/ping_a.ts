import { isAllowed } from './_lib/allowlist'
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, from: 'allowlist', t: typeof isAllowed })
}
