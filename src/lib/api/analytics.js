import { supabase } from '@/lib/supabase'
import { unwrap, toChartData } from './helpers'

/**
 * Reporting figures.
 *
 * `analytics_series` is one table holding every chart: a row is one point, keyed
 * by (series, bucket), with the numbers in a jsonb `metrics` column. These are
 * snapshots — the platform does not yet record the events behind platform
 * growth, energy mix or regional performance. Anything that *can* be derived
 * from live rows is, and lives elsewhere: connector groups come from
 * `station_connector_groups`, slot availability from `reservations`.
 *
 * To make a series real, replace its rows with a view over `sessions` and leave
 * these call sites alone.
 */

async function series(name) {
  return supabase
    .from('analytics_series')
    .select('bucket, metrics, ord')
    .eq('series', name)
    .order('ord')
    .then(unwrap)
}

const asChart = (name, key) => () => series(name).then((rows) => toChartData(rows, key))

// ---- operator --------------------------------------------------------------
// Session RLS limits operators to stations they own. Aggregate those live rows
// instead of displaying the shared analytics_series demo snapshots.
async function operatorSessions() {
  const rows = []
  const pageSize = 1000
  for (let offset = 0; ; offset += pageSize) {
    const page = await supabase.from('sessions')
      .select('station_id, started_at, cost, energy_kwh, stations(name)')
      .order('started_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize - 1)
      .then(unwrap)
    rows.push(...page)
    if (page.length < pageSize) return rows
  }
}

export async function fetchRevenueByDay() {
  const rows = await operatorSessions()
  const days = new Map()
  for (const row of rows) {
    const key = row.started_at?.slice(0, 10)
    if (!key) continue
    const day = days.get(key) ?? { day: key, revenue: 0, sessions: 0, energyKwh: 0 }
    day.revenue += Number(row.cost ?? 0)
    day.sessions += 1
    day.energyKwh += Number(row.energy_kwh ?? 0)
    days.set(key, day)
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day))
}

export async function fetchRevenueByStation() {
  const rows = await operatorSessions()
  const month = new Date().toISOString().slice(0, 7)
  const stations = new Map()
  for (const row of rows) {
    if (!row.started_at?.startsWith(month)) continue
    const station = stations.get(row.station_id) ?? { station: row.stations?.name ?? row.station_id, revenue: 0 }
    station.revenue += Number(row.cost ?? 0)
    stations.set(row.station_id, station)
  }
  return [...stations.values()].sort((a, b) => b.revenue - a.revenue)
}

export async function fetchSessionsByHour() {
  const rows = await operatorSessions()
  const today = new Date().toISOString().slice(0, 10)
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour: `${String(hour).padStart(2, '0')}:00`, sessions: 0 }))
  for (const row of rows) {
    if (row.started_at?.startsWith(today)) hours[Number(row.started_at.slice(11, 13))].sessions += 1
  }
  return hours
}

// ---- admin -----------------------------------------------------------------
export const fetchPlatformGrowth = asChart('platform_growth', 'month')
export const fetchRevenueBySegment = asChart('revenue_by_segment', 'month')
export const fetchEnergyMix = asChart('energy_mix', 'name')
export const fetchRegionPerformance = asChart('region_performance', 'region')

// ---- fleet -----------------------------------------------------------------
export const fetchFleetEnergyByWeek = asChart('fleet_energy_by_week', 'week')
export const fetchFleetCostPerVehicle = asChart('fleet_cost_per_vehicle', 'id')
export const fetchFleetUtilization = asChart('fleet_utilization', 'month')
export const fetchCostBreakdown = asChart('fleet_cost_breakdown', 'name')

// ---- driver ----------------------------------------------------------------
export const fetchMonthlyUsage = asChart('driver_monthly_usage', 'month')
