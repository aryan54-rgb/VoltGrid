import { supabase } from '@/lib/supabase'
import { unwrap, formatTime } from './helpers'

/**
 * Reservations, the virtual waitlist, and the booking grid.
 *
 * Slot availability is not a stored column: `booking_slots` is the canonical
 * half-hour grid and a slot counts as taken when a live reservation at that
 * station covers it. That way two drivers cannot both be shown the same free
 * bay just because a cached flag went stale.
 */

const SELECT = '*, stations(name, city, price_per_kwh), connectors(label, type, power_kw)'

/** Statuses that still hold a bay. EXPIRED and CANCELLED release it. */
const LIVE_STATUSES = ['RESERVED', 'PENDING', 'ACTIVE']

/**
 * @param {object} row
 * @param {Map<string, string>} [names]  customer id -> display name. The board
 *   cannot get this from a `profiles(name)` embed: `profiles` is readable only
 *   by its owner and by admins, so an operator's embed comes back empty. See
 *   migration 20260821170000.
 */
export function mapReservation(row, names) {
  return {
    id: row.id,
    userId: row.user_id,
    customer: names?.get(row.user_id) ?? '—',
    stationId: row.station_id,
    station: row.stations?.name ?? '—',
    stationName: row.stations?.name ?? '—',
    connectorId: row.connector_id,
    connectorLabel: row.connectors?.label ?? '—',
    charger: row.connectors
      ? `${row.connectors.label} · ${row.connectors.type} ${row.connectors.power_kw} kW`
      : '—',
    date: row.date,
    time: formatTime(row.start_time),
    startTime: formatTime(row.start_time),
    endTime: formatTime(row.end_time),
    status: row.status,
  }
}

export function mapWaitlistEntry(row) {
  return {
    id: row.id,
    userId: row.user_id,
    stationId: row.station_id,
    stationName: row.stations?.name ?? '—',
    date: row.date,
    window: row.time_window,
    position: row.position,
    aheadOf: row.ahead_of,
    notifyOnFree: row.notify_on_free,
  }
}

/** Everything RLS lets the caller see, newest booking first. */
export async function fetchReservations() {
  const [rows, directory] = await Promise.all([
    supabase
      .from('reservations')
      .select(SELECT)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .then(unwrap),
    supabase.from('customer_directory').select('id, name').then(unwrap),
  ])
  const names = new Map(directory.map((d) => [d.id, d.name]))
  return rows.map((row) => mapReservation(row, names))
}

export async function fetchWaitlist() {
  const rows = await supabase
    .from('waitlists')
    .select('*, stations(name)')
    .order('date')
    .order('position')
    .then(unwrap)
  return rows.map(mapWaitlistEntry)
}

export async function fetchBookingSlots() {
  return supabase.from('booking_slots').select('*').order('sort_order').then(unwrap)
}

/**
 * The booking grid for one station on one day: every slot, marked taken when a
 * live reservation covers it.
 *
 * @returns {{id: string, time: string, available: boolean}[]}
 */
export async function fetchSlotAvailability(stationId, date) {
  const [slots, taken] = await Promise.all([
    fetchBookingSlots(),
    supabase
      .from('reservations')
      .select('start_time')
      .eq('station_id', stationId)
      .eq('date', date)
      .in('status', LIVE_STATUSES)
      .then(unwrap),
  ])

  const busy = new Set(taken.map((r) => r.start_time))
  return slots.map((s) => ({
    id: s.id,
    time: s.label,
    startTime: s.start_time,
    endTime: s.end_time,
    available: !busy.has(s.start_time),
  }))
}

/**
 * Request a bay. The booking is not confirmed by making it.
 *
 * The row lands as PENDING and an operator turns it into RESERVED from
 * /operator/reservations. PENDING is already in `LIVE_STATUSES`, so the slot
 * stops being offered to anyone else the moment it is requested -- a request
 * nobody has approved still holds the grid position.
 *
 * The operators' notification is NOT sent from here. `notifications` is
 * deliberately not client-writable (no INSERT grant, no INSERT policy), because
 * a client that can write one can address any role with any wording. Migration
 * 20260821220000 puts an AFTER INSERT trigger on this table instead, so the
 * broadcast is written in the same transaction as the row it describes: by the
 * time this function returns, the notification already exists, and if it could
 * not be written the booking was rolled back rather than silently unannounced.
 */
export async function createReservation({ userId, stationId, connectorId, date, startTime, endTime }) {
  const row = await supabase
    .from('reservations')
    .insert({
      id: `RS-${Date.now().toString(36).toUpperCase()}`,
      user_id: userId,
      station_id: stationId,
      connector_id: connectorId,
      date,
      start_time: startTime,
      end_time: endTime,
      status: 'PENDING',
    })
    .select(SELECT)
    .single()
    .then(unwrap)
  return mapReservation(row)
}

/** Move a booking to another slot. Times are 24h `HH:MM` strings. */
export async function updateReservation(id, { date, startTime, endTime }) {
  const row = await supabase
    .from('reservations')
    .update({ date, start_time: startTime, end_time: endTime })
    .eq('id', id)
    .select(SELECT)
    .single()
    .then(unwrap)
  return mapReservation(row)
}

export async function cancelReservation(id) {
  const row = await supabase
    .from('reservations')
    .update({ status: 'CANCELLED' })
    .eq('id', id)
    .select(SELECT)
    .single()
    .then(unwrap)
  return mapReservation(row)
}

/** Operator action: confirm a PENDING request, or release the bay. */
export async function setReservationStatus(id, status) {
  const row = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select(SELECT)
    .single()
    .then(unwrap)
  return mapReservation(row)
}

export async function setWaitlistNotify(id, notifyOnFree) {
  const row = await supabase
    .from('waitlists')
    .update({ notify_on_free: notifyOnFree })
    .eq('id', id)
    .select('*, stations(name)')
    .single()
    .then(unwrap)
  return mapWaitlistEntry(row)
}

export async function leaveWaitlist(id) {
  const { error } = await supabase.from('waitlists').delete().eq('id', id)
  if (error) throw error
}

/** Join the virtual queue when every window at a station is already booked. */
export async function joinWaitlist({ userId, stationId, date, window, notifyOnFree = true }) {
  const ahead = await supabase
    .from('waitlists')
    .select('id', { count: 'exact', head: true })
    .eq('station_id', stationId)
    .eq('date', date)
    .eq('time_window', window)
    .then(({ count, error }) => {
      if (error) throw error
      return count ?? 0
    })

  const row = await supabase
    .from('waitlists')
    .insert({
      id: `WL-${Date.now().toString(36).toUpperCase()}`,
      user_id: userId,
      station_id: stationId,
      date,
      time_window: window,
      position: ahead + 1,
      ahead_of: ahead,
      notify_on_free: notifyOnFree,
    })
    .select('*, stations(name)')
    .single()
    .then(unwrap)
  return mapWaitlistEntry(row)
}
