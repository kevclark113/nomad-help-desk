import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { color, radius } from '../tokens'

/** A dark rounded surface for grouping content below the status card. */
export function Panel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <section
      style={{
        borderRadius: radius.chunky,
        padding: 18,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.06)',
        ...style,
      }}
    >
      {children}
    </section>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'ghost' | 'danger'
}

export function Button({ variant = 'solid', style, ...rest }: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
    solid: { background: color.cobalt, color: color.paper, border: '1px solid transparent' },
    ghost: {
      background: 'transparent',
      color: color.muted,
      border: '1px solid rgba(255,255,255,0.14)',
    },
    danger: {
      background: 'transparent',
      color: color.coral,
      border: '1px solid rgba(237,138,111,0.4)',
    },
  }
  return (
    <button
      style={{
        font: 'inherit',
        fontSize: 13,
        fontWeight: 600,
        padding: '8px 14px',
        borderRadius: radius.pill,
        cursor: 'pointer',
        ...variants[variant],
        ...style,
      }}
      {...rest}
    />
  )
}

export function Field({
  label,
  style,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  // `style` sizes the label wrapper (layout: flex/width). The input always
  // fills that wrapper's width — never apply flex sizing directly to the input,
  // or its basis becomes a *height* inside this column and it grows tall.
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, ...style }}>
      <span style={{ fontSize: 12, color: color.muted, fontWeight: 600 }}>{label}</span>
      <input
        style={{
          font: 'inherit',
          fontSize: 14,
          width: '100%',
          color: color.paper,
          background: 'rgba(0,0,0,0.25)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 12,
          padding: '9px 11px',
          colorScheme: 'dark',
        }}
        {...rest}
      />
    </label>
  )
}
