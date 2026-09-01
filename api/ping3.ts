/**
 * TEMPORARY diagnostic. Only distinguishing feature: it imports types from
 * '@vercel/node' (a devDependency). If this 500s while ping (no imports) works,
 * the @vercel/node type import is breaking the bundle at runtime. Remove later.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, test: 'vercel-node-type-import' })
}
