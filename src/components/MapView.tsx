import { Suspense, lazy } from 'react'
import { useTripStore } from '../lib/useTripStore'
import { useVisitedStore } from '../lib/useVisitedStore'
import { classifyCountries } from '../lib/visited'
import { todayISO } from '../lib/dateUtils'
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
  const { codes, toggleVisited } = useVisitedStore()
  const { visited, upcoming } = classifyCountries(trips, codes, todayISO())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontFamily: type.display, fontSize: 20, margin: 0, color: color.paper }}>
          Countries visited
        </h2>
        <p style={{ margin: '2px 0 0', color: color.muted, fontSize: 14 }}>
          {visited.size} {visited.size === 1 ? 'country' : 'countries'} so far
          {upcoming.size > 0 ? ` · ${upcoming.size} upcoming` : ''} · scroll to zoom, tap a country to toggle
        </p>
      </div>

      <div style={{ display: 'flex', gap: 18, padding: '0 4px', flexWrap: 'wrap' }}>
        <LegendSwatch fill={mapColors.visited} label="Visited" />
        <LegendSwatch fill={mapColors.upcoming} label="Upcoming trip" />
        <LegendSwatch fill={mapColors.land} label="Not visited" />
      </div>

      <Suspense
        fallback={
          <p style={{ color: color.muted, fontSize: 14, padding: '24px 4px' }}>Loading map…</p>
        }
      >
        <WorldMap visited={visited} upcoming={upcoming} onToggle={(a2) => void toggleVisited(a2)} />
      </Suspense>
    </div>
  )
}
