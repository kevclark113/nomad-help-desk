import { Suspense, lazy } from 'react'
import { useTripStore } from '../lib/useTripStore'
import { useVisitedStore } from '../lib/useVisitedStore'
import { visitedCodes } from '../lib/visited'
import { color, type } from '../theme/tokens'

// Lazy so the map libs + atlas only load when the Map tab is opened.
const WorldMap = lazy(() => import('./WorldMap'))

export function MapView() {
  const { trips } = useTripStore()
  const { codes } = useVisitedStore()
  const visited = visitedCodes(trips, codes)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ padding: '0 4px' }}>
        <h2 style={{ fontFamily: type.display, fontSize: 20, margin: 0, color: color.paper }}>
          Countries visited
        </h2>
        <p style={{ margin: '2px 0 0', color: color.muted, fontSize: 14 }}>
          {visited.size} {visited.size === 1 ? 'country' : 'countries'} so far
        </p>
      </div>
      <Suspense
        fallback={
          <p style={{ color: color.muted, fontSize: 14, padding: '24px 4px' }}>Loading map…</p>
        }
      >
        <WorldMap visited={visited} />
      </Suspense>
    </div>
  )
}
