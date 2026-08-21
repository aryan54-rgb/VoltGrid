import { supabase } from '@/lib/supabase'
import { parseLatitude, parseLongitude } from '@/lib/geo'
import { unwrap } from './helpers'

/**
 * Stations and connectors.
 *
 * The station cards want connector *groups* ("6 × CCS2 150 kW, 2 free"), which
 * are not stored — `station_connector_groups` derives them from the individual
 * connector rows so a bay going offline moves the count everywhere at once.
 */

export function mapStation(row, groups = []) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    // Where the site actually is. How far away it is depends on who is asking,
    // so it is measured on the client (`@/lib/geo`) rather than stored.
    // Postgres hands DECIMAL back as a string; the maths wants numbers.
    latitude: parseLatitude(row.latitude),
    longitude: parseLongitude(row.longitude),
    rating: row.rating == null ? null : Number(row.rating),
    reviews: row.reviews ?? 0,
    pricePerKwh: Number(row.price_per_kwh),
    status: row.status,
    amenities: row.amenities ?? [],
    hours: row.hours,
    operator: row.operator,
    utilization: row.utilization ?? 0,
    connectors: groups
      .filter((g) => g.station_id === row.id)
      .map((g) => ({ type: g.type, power: g.power_kw, total: g.total, available: g.available }))
      .sort((a, b) => b.power - a.power),
  }
}

export function mapConnector(row, stationName) {
  return {
    id: row.id,
    stationId: row.station_id,
    stationName: stationName ?? row.stations?.name ?? '',
    label: row.label,
    type: row.type,
    powerKw: row.power_kw,
    // The operator charger board speaks the older lower-case vocabulary; the
    // SRS connector state machine is upper case. Keep both on the object.
    power: row.power_kw,
    status: row.status,
    energyTodayKwh: Number(row.energy_today_kwh ?? 0),
    energyToday: Number(row.energy_today_kwh ?? 0),
    uptimePct: Number(row.uptime_pct ?? 0),
    uptime: Number(row.uptime_pct ?? 0),
    lastServiced: row.last_serviced,
    lastService: row.last_serviced,
  }
}

export async function fetchStations() {
  const [stations, groups] = await Promise.all([
    supabase.from('stations').select('*').order('id').then(unwrap),
    supabase.from('station_connector_groups').select('*').then(unwrap),
  ])
  return stations.map((s) => mapStation(s, groups))
}

export async function fetchStation(id) {
  const [station, groups] = await Promise.all([
    supabase.from('stations').select('*').eq('id', id).maybeSingle().then(unwrap),
    supabase.from('station_connector_groups').select('*').eq('station_id', id).then(unwrap),
  ])
  return station ? mapStation(station, groups) : null
}

/** Every individual bay, with its station's name attached for the tables. */
export async function fetchConnectors() {
  const rows = await supabase
    .from('connectors')
    .select('*, stations(name)')
    .order('station_id')
    .order('label')
    .then(unwrap)
  return rows.map((r) => mapConnector(r, r.stations?.name))
}

export async function fetchConnectorsFor(stationId) {
  const rows = await supabase
    .from('connectors')
    .select('*, stations(name)')
    .eq('station_id', stationId)
    .order('label')
    .then(unwrap)
  return rows.map((r) => mapConnector(r, r.stations?.name))
}

/**
 * Operator action: change what a station charges, take it offline, or correct
 * where it sits.
 *
 * Every field is optional and `undefined` means "leave it alone" — an explicit
 * `null` latitude/longitude is how a site goes back to unsurveyed.
 */
export async function updateStation(id, { pricePerKwh, status, latitude, longitude }) {
  const [row, groups] = await Promise.all([
    supabase
      .from('stations')
      .update({
        ...(pricePerKwh === undefined ? {} : { price_per_kwh: pricePerKwh }),
        ...(status === undefined ? {} : { status }),
        ...(latitude === undefined ? {} : { latitude: parseLatitude(latitude) }),
        ...(longitude === undefined ? {} : { longitude: parseLongitude(longitude) }),
      })
      .eq('id', id)
      .select('*')
      .single()
      .then(unwrap),
    supabase.from('station_connector_groups').select('*').eq('station_id', id).then(unwrap),
  ])
  return mapStation(row, groups)
}

/**
 * Commission a new site.
 *
 * The bays are inserted alongside it, because a station with no connectors is
 * invisible everywhere the UI counts availability.
 */
export async function createStation({
  name,
  address,
  city,
  operator,
  connectorCount,
  latitude,
  longitude,
  type = 'CCS2',
  powerKw = 150,
}) {
  const existing = await supabase.from('stations').select('id').then(unwrap)
  const nextNumber = existing.length + 1
  const id = `st-${String(nextNumber).padStart(2, '0')}`

  const station = await supabase
    .from('stations')
    .insert({
      id,
      name,
      address: address || 'Address pending',
      city: city || 'San Francisco, CA',
      rating: 0,
      reviews: 0,
      price_per_kwh: 0.4,
      status: 'online',
      // Null until somebody surveys the site. The station still lists; it just
      // has no distance and no pin.
      latitude: parseLatitude(latitude),
      longitude: parseLongitude(longitude),
      amenities: [],
      hours: 'Open 24 hours',
      operator,
      utilization: 0,
    })
    .select('*')
    .single()
    .then(unwrap)

  const bays = Array.from({ length: Math.max(1, connectorCount) }, (_, i) => ({
    id: `${id}-c1${i + 1}`,
    station_id: id,
    label: `A${i + 1}`,
    type,
    power_kw: powerKw,
    status: 'AVAILABLE',
  }))
  const { error } = await supabase.from('connectors').insert(bays)
  if (error) throw error

  return mapStation(station, [
    { station_id: id, type, power_kw: powerKw, total: bays.length, available: bays.length },
  ])
}

/** Operator action: take a bay out of service or hand it back. */
export async function updateConnectorStatus(id, status) {
  const row = await supabase
    .from('connectors')
    .update({ status })
    .eq('id', id)
    .select('*, stations(name)')
    .single()
    .then(unwrap)
  return mapConnector(row, row.stations?.name)
}
