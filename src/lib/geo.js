/**
 * Geography helpers.
 *
 * Stations store a fixed `latitude`/`longitude` pair; everything spatial the UI
 * shows is derived from that pair at render time, because it depends on who is
 * looking:
 *
 *   distanceKm()  how far a station is from *this* driver, right now
 *   toMarkers()   where the pins sit on `MapPlaceholder`, which wants 0-100
 *                 percentages rather than degrees
 *
 * No dependency: the haversine is six lines, and `geolib` would be a package to
 * audit for one of them.
 */

const EARTH_RADIUS_KM = 6371

const toRadians = (deg) => (deg * Math.PI) / 180

/** A finite number inside `[-limit, limit]`, or null. Strings from `<input>` count. */
function coordinate(value, limit) {
  // `Number('')` is 0, which would silently drop a station on the equator every
  // time an operator cleared the field.
  if (typeof value === 'string' && value.trim() === '') return null
  const n = typeof value === 'string' ? Number(value.trim()) : value
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  return Math.abs(n) <= limit ? n : null
}

export const parseLatitude = (value) => coordinate(value, 90)
export const parseLongitude = (value) => coordinate(value, 180)

/**
 * Normalise anything carrying a position into `{ latitude, longitude }`, or
 * null. Takes a station row, a `GeolocationCoordinates`, or a bare pair.
 */
export function toPoint(source) {
  if (!source) return null
  const latitude = parseLatitude(source.latitude ?? source.lat)
  const longitude = parseLongitude(source.longitude ?? source.lng ?? source.lon)
  if (latitude === null || longitude === null) return null
  return { latitude, longitude }
}

/** True when this station has been surveyed and can be measured against. */
export const hasCoordinates = (station) => toPoint(station) !== null

/**
 * Great-circle distance in kilometres, or null if either end is unlocated.
 *
 * Haversine over a spherical earth: within ~0.5% of the true ellipsoid figure,
 * which is far inside the error of a browser's own position fix.
 */
export function distanceKm(from, to) {
  const a = toPoint(from)
  const b = toPoint(to)
  if (!a || !b) return null

  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * "850 m", "1.2 km", "14 km" — the precision shrinks as the number grows,
 * because a tenth of a kilometre stops meaning anything past ten of them.
 */
export function formatDistance(km) {
  if (km === null || km === undefined || !Number.isFinite(km)) return null
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

/** Sort comparator putting the closest first and the unlocated last. */
export function byDistance(a, b) {
  const x = a.distanceKm
  const y = b.distanceKm
  if (x === null || x === undefined) return y === null || y === undefined ? 0 : 1
  if (y === null || y === undefined) return -1
  return x - y
}

/**
 * Attach `distanceKm` (and its formatted twin) to each station, measured from
 * `origin`. Both are null when the driver's position is unknown or the station
 * has not been surveyed, so callers never have to branch on which it was.
 */
export function withDistance(stations, origin) {
  const from = toPoint(origin)
  return stations.map((s) => {
    const km = from ? distanceKm(from, s) : null
    return { ...s, distanceKm: km, distanceLabel: formatDistance(km) }
  })
}

// How much of the map is kept clear at each edge, so an extreme pin still has
// room for its head and its label.
const MAP_INSET = 12

/**
 * Project stations into the 0-100 percentage space `MapPlaceholder` draws in.
 *
 * The frame is the bounding box of whatever is being shown, stretched to fill —
 * so eight sites across a city and two sites a kilometre apart both spread out
 * legibly. It is a relative sketch, not a projection: there is no scale bar and
 * north is only approximately up. Unsurveyed stations get no pin.
 */
export function toMarkers(stations = []) {
  const located = stations.filter(hasCoordinates)
  if (located.length === 0) return []

  const lats = located.map((s) => Number(s.latitude))
  const lngs = located.map((s) => Number(s.longitude))
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  // A single station — or a column of them — has no span on one axis; centre it
  // rather than dividing by zero.
  const ratio = (value, min, max) => (max - min === 0 ? 0.5 : (value - min) / (max - min))
  const place = (r) => MAP_INSET + r * (100 - 2 * MAP_INSET)

  return located.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    x: place(ratio(Number(s.longitude), minLng, maxLng)),
    // Latitude climbs northward, the map's y climbs downward.
    y: place(1 - ratio(Number(s.latitude), minLat, maxLat)),
  }))
}
