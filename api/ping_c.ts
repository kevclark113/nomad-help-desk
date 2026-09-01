import { adminAuth } from './_lib/firebaseAdmin'
export default function handler(_req: any, res: any) {
  res.status(200).json({ ok: true, from: 'firebaseAdmin', t: typeof adminAuth })
}
