import { useEffect, useMemo, useRef, useState } from 'react'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import type { Topology, GeometryCollection } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import worldAtlas from 'world-atlas/countries-110m.json'
import { numericToAlpha2 } from '../lib/isoCountries'
import { map as mapColors, color } from '../theme/tokens'

/**
 * Choropleth world map (default export so it can be React.lazy'd — this pulls in
 * d3-geo/zoom, topojson, and the 110m atlas, all kept out of the main bundle).
 *
 * Scroll to zoom, drag to pan (via d3-zoom) so even small countries can be
 * clicked once zoomed in. Join is by NUMERIC ISO id (atlas) → alpha-2 (our data).
 */
const WIDTH = 800
const HEIGHT = 415
const MAX_ZOOM = 14

const topology = worldAtlas as unknown as Topology
const countries = feature(
  topology,
  topology.objects.countries as GeometryCollection,
) as FeatureCollection<Geometry>

export interface WorldMapProps {
  visited: Set<string>
  upcoming: Set<string>
  bucket: Set<string>
  /** Called with the clicked country's alpha-2 code. */
  onToggle?: (alpha2: string) => void
}

export default function WorldMap({ visited, upcoming, bucket, onToggle }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)

  const shapes = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], countries)
    const path = geoPath(projection)
    return countries.features.map((f: Feature<Geometry>, i) => {
      const a2 = f.id != null ? numericToAlpha2(String(f.id)) : undefined
      const state =
        a2 && visited.has(a2)
          ? 'visited'
          : a2 && upcoming.has(a2)
            ? 'upcoming'
            : a2 && bucket.has(a2)
              ? 'bucket'
              : 'none'
      return { key: String(f.id ?? i), d: path(f) ?? '', a2, state }
    })
  }, [visited, upcoming, bucket])

  useEffect(() => {
    if (!svgRef.current) return
    const svg = select(svgRef.current)
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, MAX_ZOOM])
      .translateExtent([
        [0, 0],
        [WIDTH, HEIGHT],
      ])
      .on('zoom', (e) => setTransform(e.transform))
    zoomRef.current = zoomBehavior
    svg.call(zoomBehavior)
    return () => {
      svg.on('.zoom', null)
    }
  }, [])

  const zoomBy = (k: number) => {
    if (svgRef.current && zoomRef.current) {
      zoomRef.current.scaleBy(select(svgRef.current), k)
    }
  }
  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      zoomRef.current.transform(select(svgRef.current), zoomIdentity)
    }
  }

  const fillFor = (state: string) =>
    state === 'visited'
      ? mapColors.visited
      : state === 'upcoming'
        ? mapColors.upcoming
        : state === 'bucket'
          ? mapColors.bucket
          : mapColors.land

  const btnStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.35)',
    color: color.paper,
    fontSize: 18,
    fontWeight: 700,
    cursor: 'pointer',
    lineHeight: 1,
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        role="img"
        aria-label="World map with visited countries highlighted"
        style={{ display: 'block', touchAction: 'none', cursor: 'grab' }}
      >
        <g transform={transform.toString()}>
          {shapes.map((s) => (
            <path
              key={s.key}
              d={s.d}
              fill={fillFor(s.state)}
              stroke={mapColors.landStroke}
              strokeWidth={0.4}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ cursor: s.a2 && onToggle ? 'pointer' : 'default' }}
              onClick={s.a2 && onToggle ? () => onToggle(s.a2!) : undefined}
            >
              {s.a2 && <title>{s.a2}</title>}
            </path>
          ))}
        </g>
      </svg>

      {/* Zoom controls */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <button style={btnStyle} onClick={() => zoomBy(1.6)} aria-label="Zoom in">
          +
        </button>
        <button style={btnStyle} onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">
          −
        </button>
        <button
          style={{ ...btnStyle, fontSize: 12 }}
          onClick={resetZoom}
          aria-label="Reset zoom"
        >
          ⤢
        </button>
      </div>
    </div>
  )
}
