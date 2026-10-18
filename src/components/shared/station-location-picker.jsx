import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { toPoint } from '@/lib/geo'

const PUNE = [18.5204, 73.8567]

const pinIcon = L.divIcon({
  className: 'station-location-picker-pin',
  html: '<svg width="32" height="42" viewBox="0 0 32 42" aria-hidden="true"><path d="M16 1C7.7 1 1 7.7 1 16c0 11.5 15 25 15 25s15-13.5 15-25C31 7.7 24.3 1 16 1Z" fill="#10b981" stroke="white" stroke-width="2"/><circle cx="16" cy="16" r="5" fill="white"/></svg>',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
})

function PickOnClick({ onPick }) {
  useMapEvents({ click: ({ latlng }) => onPick(latlng) })
  return null
}

function KeepMapInSync({ point }) {
  const map = useMap()

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(frame)
  }, [map])

  useEffect(() => {
    if (point) map.panTo([point.latitude, point.longitude])
  }, [map, point])

  return null
}

/** A map click or a dragged pin fills the same fields used by station creation. */
export function StationLocationPicker({ latitude, longitude, onChange }) {
  const point = useMemo(() => toPoint({ latitude, longitude }), [latitude, longitude])
  const pick = ({ lat, lng }) => onChange({
    latitude: lat.toFixed(7),
    longitude: lng.toFixed(7),
  })

  return (
    <div className="space-y-1.5">
      <div className="station-map relative h-64 overflow-hidden rounded-lg border bg-card">
        <MapContainer
          center={point ? [point.latitude, point.longitude] : PUNE}
          zoom={point ? 15 : 12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <KeepMapInSync point={point} />
          <PickOnClick onPick={pick} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
            className="map-tiles-dark"
          />
          {point && (
            <Marker
              position={[point.latitude, point.longitude]}
              icon={pinIcon}
              draggable
              eventHandlers={{ dragend: (event) => pick(event.target.getLatLng()) }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-muted-foreground">
        Click the station location, or drag the pin to adjust it. Zoom and pan to find the exact spot.
      </p>
    </div>
  )
}
