import { supabase } from '@/lib/supabase'

/**
 * Turn a PostgREST result into a value or a throw.
 *
 * supabase-js resolves rather than rejects on a failed query, which is easy to
 * miss — every call in `src/lib/api` funnels through here so a permission or
 * network failure reliably reaches the `error` branch of `useQuery` instead of
 * silently rendering an empty table.
 */
export function unwrap({ data, error }) {
  if (error) throw error
  return data
}

/** The signed-in user's id, or null when the session has gone. */
export async function currentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id ?? null
}

/** `'09:00:00'` → `'09:00 AM'`, matching the labels the booking UI renders. */
export function formatTime(value) {
  if (!value) return ''
  const [h, m] = value.split(':')
  const hour = Number(h)
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${String(twelve).padStart(2, '0')}:${m} ${suffix}`
}

/** Postgres `interval` → the `42 min` / `2 h 10 min` strings the tables show. */
export function formatInterval(value) {
  if (!value) return '—'
  // PostgREST renders intervals as either '00:42:00' or '2 days 01:00:00'.
  const time = /(\d+):(\d{2}):(\d{2})/.exec(value)
  if (!time) return value
  const hours = Number(time[1])
  const minutes = Number(time[2])
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

/**
 * Reshape `analytics_series` rows into the flat `{bucket, ...metrics}` objects
 * the Recharts components take.
 *
 * @param {{bucket: string, metrics: object}[]} rows
 * @param {string} bucketKey  the property name the chart reads for its axis
 */
export function toChartData(rows, bucketKey) {
  return rows.map((r) => ({ [bucketKey]: r.bucket, ...r.metrics }))
}
