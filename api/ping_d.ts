import { HttpError } from './_lib/auth'
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, from: 'auth', t: typeof HttpError })
}
