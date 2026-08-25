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

export interface WorldMapProps {
  visited: Set<string>
  upcoming: Set<string>
  /** Called with the clicked country's alpha-2 code to toggle it visited. */
  onToggle?: (alpha2: string) => void
}

export default function WorldMap({ visited, upcoming, onToggle }: WorldMapProps) {
  const shapes = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], countries)
    const path = geoPath(projection)
    return countries.features.map((f: Feature<Geometry>, i) => {
      const a2 = f.id != null ? numericToAlpha2(String(f.id)) : undefined
      const state = a2 && visited.has(a2) ? 'visited' : a2 && upcoming.has(a2) ? 'upcoming' : 'none'
      return { key: String(f.id ?? i), d: path(f) ?? '', a2, state }
    })
  }, [visited, upcoming])

  const fillFor = (state: string) =>
    state === 'visited' ? mapColors.visited : state === 'upcoming' ? mapColors.upcoming : mapColors.land

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
          fill={fillFor(s.state)}
          stroke={mapColors.landStroke}
          strokeWidth={0.4}
          strokeLinejoin="round"
          style={{ cursor: s.a2 && onToggle ? 'pointer' : 'default' }}
          onClick={s.a2 && onToggle ? () => onToggle(s.a2!) : undefined}
        >
          {s.a2 && <title>{s.a2}</title>}
        </path>
      ))}
    </svg>
  )
}
