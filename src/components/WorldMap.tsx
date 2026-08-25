import { useMemo } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import worldAtlas from 'world-atlas/countries-110m.json'
import { numericToAlpha2 } from '../lib/isoCountries'
import { map as mapColors } from '../theme/tokens'

/**
 * Choropleth world map (default export so it can be React.lazy'd — this pulls in
 * d3-geo, topojson-client, and the 110m atlas, all kept out of the main bundle).
 *
 * Visited countries are filled; the rest are muted land. Join is by NUMERIC ISO
 * id (atlas) → alpha-2 (our data), never by name.
 */
const WIDTH = 800
const HEIGHT = 415

const topology = worldAtlas as unknown as Topology
const countries = feature(
  topology,
  topology.objects.countries as GeometryCollection,
) as FeatureCollection<Geometry>

export default function WorldMap({ visited }: { visited: Set<string> }) {
  const shapes = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], countries)
    const path = geoPath(projection)
    return countries.features.map((f: Feature<Geometry>, i) => {
      const a2 = f.id != null ? numericToAlpha2(String(f.id)) : undefined
      const isVisited = a2 ? visited.has(a2) : false
      return { key: String(f.id ?? i), d: path(f) ?? '', isVisited }
    })
  }, [visited])

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      role="img"
      aria-label="World map with visited countries highlighted"
      style={{ display: 'block' }}
    >
      {shapes.map((s) => (
        <path
          key={s.key}
          d={s.d}
          fill={s.isVisited ? mapColors.visited : mapColors.land}
          stroke={mapColors.landStroke}
          strokeWidth={0.4}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
