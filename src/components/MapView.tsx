import { Suspense, lazy, useState } from 'react'
import { useTripStore } from '../lib/useTripStore'
import { useVisitedStore } from '../lib/useVisitedStore'
import { classifyCountries } from '../lib/visited'
import { todayISO } from '../lib/dateUtils'
import type { MarkStatus } from '../lib/types'
import { color, map as mapColors, type } from '../theme/tokens'

// Lazy so the map libs + atlas only load when the Map tab is opened.
const WorldMap = lazy(() => import('./WorldMap'))

function LegendSwatch({ fill, label }: { fill: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      <span
        aria-hidden="true"
        style={{ width: 14, height: 14, borderRadius: 4, background: fill, flex: '0 0 auto' }}
      />
      <span style={{ color: color.muted, fontSize: 13 }}>{label}</span>
    </span>
  )
}

export function MapView() {
  const { trips } = useTripStore()
  const { marks, toggleMark } = useVisitedStore()
  const { visited, upcoming, bucket } = classifyCountries(trips, marks, todayISO())
  const [mode, setMode] = useState<MarkStatus>('visited')

  const modeButton = (m: MarkStatus, label: string, activeColor: string) => {
    const active = mode === m
    return (
      <button
        onClick={() => setMode(m)}
        aria-pressed={active}
        style={{
          font: 'inherit',
          fontSize: 13,
          fontWeight: 700,
          padding: '7px 14px',
          borderRadius: 999,
          cursor: 'pointer',
          border: `1px solid ${active ? activeColor : 'rgba(255,255,255,0.14)'}`,
          background: active ? activeColor : 'transparent',
          color: active ? '#10203a' : color.muted,
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontFamily: type.display, fontSize: 20, margin: 0, color: color.paper }}>
          Countries visited
        </h2>
        <p style={{ margin: '2px 0 0', color: color.muted, fontSize: 14 }}>
          {visited.size} visited
          {upcoming.size > 0 ? ` · ${upcoming.size} upcoming` : ''}
          {bucket.size > 0 ? ` · ${bucket.size} bucket list` : ''} · scroll to zoom
        </p>
      </div>

      {/* Marking mode: what a country click applies. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px', flexWrap: 'wrap' }}>
        <span style={{ color: color.muted, fontSize: 13, fontWeight: 600 }}>Tap to mark:</span>
        {modeButton('visited', 'Visited', mapColors.visited)}
        {modeButton('bucket', 'Bucket list', mapColors.bucket)}
      </div>

      <div style={{ display: 'flex', gap: 16, padding: '0 4px', flexWrap: 'wrap' }}>
        <LegendSwatch fill={mapColors.visited} label="Visited" />
        <LegendSwatch fill={mapColors.upcoming} label="Upcoming trip" />
        <LegendSwatch fill={mapColors.bucket} label="Bucket list" />
        <LegendSwatch fill={mapColors.land} label="Not visited" />
      </div>

      <Suspense
        fallback={
          <p style={{ color: color.muted, fontSize: 14, padding: '24px 4px' }}>Loading map…</p>
        }
      >
        <WorldMap
          visited={visited}
          upcoming={upcoming}
          bucket={bucket}
          onToggle={(a2) => void toggleMark(a2, mode)}
        />
      </Suspense>
    </div>
  )
}
