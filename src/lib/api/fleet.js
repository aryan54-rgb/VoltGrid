import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Fleet operations: vehicles, drivers, invoices and the overnight depot
 * schedule. Visible to the `fleet` and `admin` roles; RLS enforces that.
 */

export function mapVehicle(row) {
  return {
    id: row.id,
    driverId: row.driver_id,
    model: row.model,
    driver: row.driver_name,
    soc: row.soc,
    rangeKm: row.range_km,
    status: row.status,
    location: row.location,
    odometer: row.odometer,
    health: row.health,
    nextService: row.next_service,
  }
}

export function mapFleetDriver(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    licence: row.licence,
    assignedVehicle: row.assigned_vehicle,
    shift: row.shift,
    status: row.status,
    sessionsThisMonth: row.sessions_this_month,
    energyKwh: Number(row.energy_kwh ?? 0),
    safetyScore: row.safety_score,
  }
}

export function mapInvoice(row) {
  return {
    id: row.id,
    period: row.period,
    amount: Number(row.amount),
    sessions: row.sessions,
    energy: Number(row.energy ?? 0),
    status: row.status,
    due: row.due,
  }
}

export function mapScheduleEntry(row) {
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    connectorLabel: row.connector_label,
    // The board renders 24h times; trim the seconds Postgres sends back.
    start: (row.start_time ?? '').slice(0, 5),
    end: (row.end_time ?? '').slice(0, 5),
    targetSocPct: row.target_soc_pct,
    status: row.status,
    night: row.night,
  }
}

export async function fetchVehicles() {
  const rows = await supabase.from('fleet_vehicles').select('*').order('id').then(unwrap)
  return rows.map(mapVehicle)
}

export async function fetchFleetDrivers() {
  const rows = await supabase.from('fleet_drivers').select('*').order('id').then(unwrap)
  return rows.map(mapFleetDriver)
}

export async function fetchInvoices() {
  const rows = await supabase.from('invoices').select('*').order('due', { ascending: false }).then(unwrap)
  return rows.map(mapInvoice)
}

export async function fetchChargingSchedule() {
  const rows = await supabase
    .from('charging_schedule')
    .select('*')
    .order('night')
    .order('start_time')
    .then(unwrap)
  return rows.map(mapScheduleEntry)
}

/** Site power ceiling the depot must stay under while charging overnight. */
export async function fetchDepotPowerLimit() {
  const rows = await supabase.from('fleet_settings').select('depot_power_limit_kw').limit(1).then(unwrap)
  return rows[0]?.depot_power_limit_kw ?? 300
}

/** Commission a van. `id` is the plate/asset number the operator types in. */
export async function createVehicle({ company, id, model, driverName }) {
  const row = await supabase
    .from('fleet_vehicles')
    .insert({
      id,
      company,
      model,
      driver_name: driverName || '—',
      soc: 100,
      range_km: 300,
      status: 'idle',
      location: 'Depot · Lot A',
      odometer: 0,
      health: 100,
      next_service: null,
    })
    .select('*')
    .single()
    .then(unwrap)
  return mapVehicle(row)
}

export async function removeVehicle(id) {
  const { error } = await supabase.from('fleet_vehicles').delete().eq('id', id)
  if (error) throw error
}

export async function createFleetDriver({ company, name, email, licence, shift }) {
  // Ids are sequential within the company, matching the seeded fd-01 series.
  const existing = await supabase.from('fleet_drivers').select('id').then(unwrap)
  const row = await supabase
    .from('fleet_drivers')
    .insert({
      id: `fd-${String(existing.length + 1).padStart(2, '0')}`,
      company,
      name,
      email,
      licence: licence || '—',
      shift,
      status: 'OFF_DUTY',
      sessions_this_month: 0,
      energy_kwh: 0,
      safety_score: 100,
    })
    .select('*')
    .single()
    .then(unwrap)
  return mapFleetDriver(row)
}

/**
 * Attach a driver to a van.
 *
 * Both sides are written: `fleet_drivers.assigned_vehicle` and the vehicle's
 * `driver_id` / `driver_name`, so neither screen can disagree about who is in
 * which van.
 */
export async function assignVehicle(driverId, driverName, vehicleId) {
  const row = await supabase
    .from('fleet_drivers')
    .update({ assigned_vehicle: vehicleId })
    .eq('id', driverId)
    .select('*')
    .single()
    .then(unwrap)

  const { error } = await supabase
    .from('fleet_vehicles')
    .update({ driver_id: driverId, driver_name: driverName })
    .eq('id', vehicleId)
  if (error) throw error

  return mapFleetDriver(row)
}

export async function updateFleetDriver(driverId, { shift, status }) {
  const row = await supabase
    .from('fleet_drivers')
    .update({
      ...(shift === undefined ? {} : { shift }),
      ...(status === undefined ? {} : { status }),
    })
    .eq('id', driverId)
    .select('*')
    .single()
    .then(unwrap)
  return mapFleetDriver(row)
}

/** Book a batch of overnight depot windows in one round-trip. */
export async function createScheduleEntries(entries) {
  const rows = await supabase
    .from('charging_schedule')
    .insert(
      entries.map((e) => ({
        id: e.id,
        company: e.company,
        vehicle_id: e.vehicleId,
        connector_label: e.connectorLabel,
        start_time: e.start,
        end_time: e.end,
        target_soc_pct: e.targetSocPct,
        status: 'SCHEDULED',
        night: e.night,
      }))
    )
    .select('*')
    .then(unwrap)
  return rows.map(mapScheduleEntry)
}

export async function updateScheduleEntry(id, { start, end, targetSocPct }) {
  const row = await supabase
    .from('charging_schedule')
    .update({ start_time: start, end_time: end, target_soc_pct: targetSocPct })
    .eq('id', id)
    .select('*')
    .single()
    .then(unwrap)
  return mapScheduleEntry(row)
}

/** Settle a consolidated monthly invoice. */
export async function payInvoice(id) {
  const row = await supabase
    .from('invoices')
    .update({ status: 'paid' })
    .eq('id', id)
    .select('*')
    .single()
    .then(unwrap)
  return mapInvoice(row)
}

export async function updateScheduleStatus(id, status) {
  const row = await supabase
    .from('charging_schedule')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single()
    .then(unwrap)
  return mapScheduleEntry(row)
}
