import type { CSSProperties } from 'react'

/**
 * A shaded, lit sphere (lit from top-left) — a deliberate dimensional choice,
 * not a flat disc. See DESIGN.md "Shape & dimension".
 */
type Hue = 'teal' | 'rose'

const palettes: Record<Hue, { base: string; mid: string; hi: string }> = {
  teal: { base: '#166069', mid: '#35B0BC', hi: '#9CE6EC' },
  rose: { base: '#9A4573', mid: '#DA6EA6', hi: '#F6C2DC' },
}

export function Orb({
  size,
  hue,
  style,
  className,
}: {
  size: number
  hue: Hue
  style?: CSSProperties
  className?: string
}) {
  const p = palettes[hue]
  return (
    <div
      aria-hidden="true"
      className={className}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 32% 28%, ${p.hi} 0%, ${p.mid} 42%, ${p.base} 100%)`,
        boxShadow:
          'inset -6px -9px 20px rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.35)',
        ...style,
      }}
    />
  )
}
