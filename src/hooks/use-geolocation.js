import * as React from 'react'

/**
 * The browser's own position, asked for once on mount.
 *
 * Same shape as `useQuery` — data, an error, a loading flag and a retry — so a
 * page reads a position the way it reads a table. The differences are the two
 * things `useQuery` never has to deal with:
 *
 *   - the answer can be *refused*, permanently, and re-asking will not help
 *     until the user changes a browser setting. `status === 'denied'` is what
 *     the UI should explain rather than retry.
 *   - the API is callback-based and has no cancellation, so a fix that lands
 *     after unmount is dropped by the usual `active` flag.
 *
 * Geolocation needs a secure context: it works on localhost and over HTTPS, and
 * is absent over plain HTTP on a LAN address. That shows up as `unsupported`.
 */

const SUPPORTED =
  typeof navigator !== 'undefined' && typeof navigator.geolocation?.getCurrentPosition === 'function'

const UNSUPPORTED = {
  status: 'unsupported',
  message:
    'This browser cannot share your location. It needs a secure connection — https, or localhost during development.',
}

/** `GeolocationPositionError` codes, turned into something worth showing. */
function describe(err) {
  switch (err?.code) {
    case 1: // PERMISSION_DENIED
      return {
        status: 'denied',
        message:
          'Location permission was refused. Allow it for this site in your browser settings to see how far away each station is.',
      }
    case 2: // POSITION_UNAVAILABLE
      return {
        status: 'unavailable',
        message: 'Your device could not get a position fix. Check that location services are on.',
      }
    case 3: // TIMEOUT
      return { status: 'timeout', message: 'Finding your location took too long.' }
    default:
      return { status: 'error', message: err?.message || 'Could not read your location.' }
  }
}

/**
 * @param {{enabled?: boolean, enableHighAccuracy?: boolean, timeout?: number, maximumAge?: number}} options
 * @returns {{coords: {latitude: number, longitude: number, accuracy: number}|null,
 *            error: {status: string, message: string}|null,
 *            loading: boolean, supported: boolean,
 *            status: 'idle'|'locating'|'ready'|'unsupported'|'denied'|'unavailable'|'timeout'|'error',
 *            request: () => void}}
 */
export function useGeolocation(options = {}) {
  const {
    enabled = true,
    enableHighAccuracy = true,
    timeout = 10000,
    // A fix from the last minute is close enough, and reusing it skips a second
    // permission prompt when the driver moves between pages.
    maximumAge = 60000,
  } = options

  const [coords, setCoords] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(enabled && SUPPORTED)

  // Bumped by request() to re-run the effect, the same trick useQuery uses.
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    if (!SUPPORTED) {
      setError(UNSUPPORTED)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setError(null)
        setLoading(false)
      },
      (err) => {
        if (!active) return
        setError(describe(err))
        setLoading(false)
      },
      { enableHighAccuracy, timeout, maximumAge }
    )

    return () => {
      active = false
    }
  }, [enabled, attempt, enableHighAccuracy, timeout, maximumAge])

  const request = React.useCallback(() => setAttempt((a) => a + 1), [])

  const status = !SUPPORTED
    ? 'unsupported'
    : !enabled
      ? 'idle'
      : loading
        ? 'locating'
        : error
          ? error.status
          : coords
            ? 'ready'
            : 'idle'

  return { coords, error, loading, supported: SUPPORTED, status, request }
}
