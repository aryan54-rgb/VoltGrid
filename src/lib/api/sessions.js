import { supabase } from '@/lib/supabase'
import { unwrap, formatInterval } from './helpers'

/**
 * Charging sessions.
 *
 * RLS decides whose rows come back: your own, plus the demo persona for your
 * role (see `public.demo_persona_id()`), plus everything if you are an operator
 * or an admin. The client never filters by user id itself.
 */

const SELECT = '*, stations(name, price_per_kwh), connectors(label, type, power_kw)'

function connectorLabel(row) {
  const c = row.connectors
  if (!c) return '—'
  return `${c.type} ${c.power_kw} kW`
}

export function mapSession(row) {
  return {
    id: row.id,
    userId: row.user_id,
    reservationId: row.reservation_id,
    stationId: row.station_id,
    station: row.stations?.name ?? '—',
    stationName: row.stations?.name ?? '—',
    connectorId: row.connector_id,
    connector: connectorLabel(row),
    charger: row.connectors ? `${row.connectors.label} · ${connectorLabel(row)}` : '—',
    vehicle: row.vehicle,
    status: row.status,
    date: row.started_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    duration: formatInterval(row.duration),
    energy: Number(row.energy_kwh ?? 0),
    energyKwh: Number(row.energy_kwh ?? 0),
    cost: Number(row.cost ?? 0),
    costSoFar: Number(row.cost ?? 0),
    startSoc: row.start_soc,
    currentSoc: row.current_soc,
    targetSoc: row.target_soc,
    powerKw: row.power_kw == null ? null : Number(row.power_kw),
    pricePerKwh: Number(row.price_per_kwh ?? row.stations?.price_per_kwh ?? 0),
    powerCurve: row.power_curve ?? [],
    paymentStatus: row.payment_status ?? 'unpaid',
  }
}

/**
 * The session currently running, or null. Enriched with the derived figures the
 * live screen shows but the row does not store.
 */
export async function fetchActiveSession() {
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user?.id) return null
  const row = await supabase
    .from('sessions')
    .select(SELECT)
    .eq('status', 'active')
    .eq('user_id', auth.user.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .then(unwrap)
  if (!row) {
    const recent = await supabase.from('sessions').select(SELECT)
      .eq('user_id', auth.user.id).eq('status', 'completed')
      .gte('ended_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('ended_at', { ascending: false }).limit(1).maybeSingle().then(unwrap)
    return recent ? mapSession(recent) : null
  }

  const session = mapSession(row)
  const socGap = Math.max(0, (session.targetSoc ?? 0) - (session.currentSoc ?? 0))
  return {
    ...session,
    // Rough time-to-target from the current draw; the curve tapers, so this is
    // the same optimistic estimate the kiosk shows.
    estMinutesRemaining:
      session.powerKw > 0 ? Math.round((socGap / 100) * 75 * (60 / session.powerKw)) : 0,
  }
}

export async function payChargingSession(sessionId) {
  const { data, error } = await supabase.rpc('pay_charging_session', { p_session_id: sessionId })
  if (error) throw error
  return data
}

/** Completed, cancelled and failed sessions, newest first. */
export async function fetchChargingHistory({ limit = 50 } = {}) {
  const rows = await supabase
    .from('sessions')
    .select(SELECT)
    .neq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(limit)
    .then(unwrap)
  return rows.map(mapSession)
}

/** Every session at a station — the operator revenue and charger screens. */
export async function fetchSessionsForStation(stationId) {
  const rows = await supabase
    .from('sessions')
    .select(SELECT)
    .eq('station_id', stationId)
    .order('started_at', { ascending: false })
    .then(unwrap)
  return rows.map(mapSession)
}

/** Start a session against a bay the driver is standing at. */
export async function startSession({ userId, stationId, connectorId, vehicle, startSoc, targetSoc }) {
  const row = await supabase
    .from('sessions')
    .insert({
      id: `cs-${Date.now().toString(36)}`,
      user_id: userId,
      station_id: stationId,
      connector_id: connectorId,
      vehicle,
      status: 'active',
      start_soc: startSoc,
      current_soc: startSoc,
      target_soc: targetSoc,
    })
    .select(SELECT)
    .single()
    .then(unwrap)
  return mapSession(row)
}

export async function stopSession(id) {
  const row = await supabase
    .from('sessions')
    .update({ status: 'completed', ended_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT)
    .single()
    .then(unwrap)
  return mapSession(row)
}
