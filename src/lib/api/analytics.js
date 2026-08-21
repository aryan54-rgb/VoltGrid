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
export const fetchRevenueByDay = asChart('revenue_by_day', 'day')
export const fetchRevenueByStation = asChart('revenue_by_station', 'station')
export const fetchSessionsByHour = asChart('sessions_by_hour', 'hour')

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
