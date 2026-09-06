import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { Maximize2, Minimize2 } from 'lucide-react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'
import { toPoint } from '@/lib/geo'

const PUNE = [18.5204, 73.8567]

const STATUS_DETAILS = {
  online: { label: 'Online', color: '#10b981', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  available: { label: 'Online', color: '#10b981', badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
  'in-use': { label: 'In use', color: '#f59e0b', badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  maintenance: { label: 'Maintenance', color: '#f97316', badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  offline: { label: 'Offline', color: '#f97316', badge: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
}

function stationIcon(status, selected) {
  const { color } = STATUS_DETAILS[status] ?? STATUS_DETAILS.online
  const ring = selected ? '#ffffff' : 'rgba(255,255,255,.72)'
  return L.divIcon({
    className: 'station-map-marker',
    html: `<svg width="38" height="46" viewBox="0 0 38 46" aria-hidden="true" focusable="false">
      <path d="M19 1.5C9.9 1.5 2.5 8.9 2.5 18c0 12.4 16.5 26.5 16.5 26.5S35.5 30.4 35.5 18C35.5 8.9 28.1 1.5 19 1.5Z" fill="${color}" stroke="${ring}" stroke-width="2" />
      <path d="M21.1 8.5 12.8 20h5.6l-1.5 9.2L25.3 17h-5.6l1.4-8.5Z" fill="white" />
    </svg>`,
    iconSize: [38, 46],
    iconAnchor: [19, 46],
    popupAnchor: [0, -42],
  })
}

function connectorCount(station) {
  return (station.connectors ?? []).reduce((total, connector) => total + (Number(connector.total) || 0), 0)
}

function ResizeMapOnFullscreen({ isFullscreen }) {
  const map = useMap()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(frame)
  }, [isFullscreen, map])

  return null
}

/** Interactive OSM map for station records that carry valid coordinates. */
export function StationMap({ stations = [], selectedId, onSelect, className, height = 380 }) {
  const mapContainerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const locatedStations = stations
    .map((station) => ({ station, point: toPoint(station) }))
    .filter(({ point }) => point !== null)
  const firstPoint = locatedStations[0]?.point
  const center = firstPoint ? [firstPoint.latitude, firstPoint.longitude] : PUNE

  useEffect(() => {
    const syncFullscreenState = () => setIsFullscreen(document.fullscreenElement === mapContainerRef.current)
    document.addEventListener('fullscreenchange', syncFullscreenState)
    return () => document.removeEventListener('fullscreenchange', syncFullscreenState)
  }, [])

  const toggleFullscreen = () => {
    if (document.fullscreenElement === mapContainerRef.current) {
      document.exitFullscreen?.()
      return
    }
    mapContainerRef.current?.requestFullscreen?.().catch(() => {})
  }

  return (
    <div ref={mapContainerRef} className={cn('station-map relative w-full overflow-hidden rounded-xl border bg-card', className)} style={{ height }}>
      <MapContainer center={center} zoom={firstPoint ? 13 : 12} className="h-full w-full" scrollWheelZoom>
        <ResizeMapOnFullscreen isFullscreen={isFullscreen} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
          className="map-tiles-dark"
        />
        {locatedStations.map(({ station, point }) => {
          const details = STATUS_DETAILS[station.status] ?? STATUS_DETAILS.online
          return (
            <Marker
              key={station.id}
              position={[point.latitude, point.longitude]}
              icon={stationIcon(station.status, station.id === selectedId)}
              eventHandlers={{ click: () => onSelect?.(station) }}
            >
              <Popup className="station-map-popup">
                <div className="min-w-48 space-y-2">
                  <div>
                    <p className="font-semibold text-foreground">{station.name}</p>
                    <p className="text-xs text-muted-foreground">{station.address}{station.city ? `, ${station.city}` : ''}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', details.badge)}>{details.label}</span>
                    <span className="text-xs text-muted-foreground">{connectorCount(station)} connectors</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    onClick={() => onSelect?.(station)}
                  >
                    Highlight station
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="absolute right-3 top-3 z-[1100] inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background/90 px-2 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-accent"
        aria-label={isFullscreen ? 'Exit fullscreen map' : 'View map fullscreen'}
        title={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      </button>
      {locatedStations.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[500] mx-auto w-fit rounded-md bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
          No station coordinates yet — centred on Pune.
        </div>
      )}
    </div>
  )
}
