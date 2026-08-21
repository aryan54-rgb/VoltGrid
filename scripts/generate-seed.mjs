// Emits supabase/migrations/20260821210000_seed.sql from src/data/*.js so the
// seed cannot drift from the shapes the UI was built against.
//
// It used to overwrite 20260821160000_phase2_seed.sql in place. It cannot any
// more: 20260821200000_station_coordinates.sql replaced stations.x/y/distance
// with latitude/longitude, and a seed written against today's columns is not
// replayable at a point in history where those columns did not exist yet. The
// output therefore lands *after* every schema migration. The original
// phase2_seed file stays exactly as it ran, and is left alone.
import { stations, connectors, timeSlots } from '../src/data/stations.js'
import { adminUsers, currentUsers } from '../src/data/users.js'
import { activeSession, chargingHistory, monthlyUsage } from '../src/data/sessions.js'
import { reservations, waitlistEntries } from '../src/data/reservations.js'
import { reviews } from '../src/data/reviews.js'
import { tickets, faultCategories, SLA_HOURS } from '../src/data/tickets.js'
import { notifications } from '../src/data/notifications.js'
import { wallet, transactions } from '../src/data/wallet.js'
import { products, categories } from '../src/data/marketplace.js'
import { posts, leaderboard } from '../src/data/community.js'
import {
  fleetVehicles, fleetDrivers, invoices, chargingSchedule, depotPowerLimitKw,
  fleetEnergyByWeek, fleetCostPerVehicle, fleetUtilization, costBreakdown,
} from '../src/data/fleet.js'
import {
  revenueByDay, revenueByStation, sessionsByHour, reservationsList,
  platformGrowth, revenueBySegment, energyMix, regionPerformance,
} from '../src/data/analytics.js'
import fs from 'node:fs'

const COMPANY = 'Swift Logistics'
const out = []
const w = (s) => out.push(s)

// ---- SQL literal helpers ---------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v === null || v === undefined ? 'NULL' : String(v))
const b = (v) => (v ? 'true' : 'false')
const arr = (xs) => (xs && xs.length ? `ARRAY[${xs.map(q).join(',')}]` : `'{}'`)
const roleArr = (xs) => `ARRAY[${xs.map((r) => `'${r}'`).join(',')}]::user_role[]`
const json = (v) => `${q(JSON.stringify(v))}::jsonb`
const rows = (xs) => xs.join(',\n  ')

function insert(table, cols, values, conflict) {
  if (!values.length) return
  w(`INSERT INTO public.${table} (${cols.join(', ')}) VALUES\n  ${rows(values)}\n${conflict};\n`)
}

// ---- identity map ----------------------------------------------------------
// Demo profiles get a deterministic UUID derived from their mock id, so the
// seed can be re-run without orphaning anything that references them.
const uuidFor = (mockId) => `00000000-0000-4000-8000-${mockId.replace('u-', '').padStart(12, '0')}`
const byName = new Map()
const personaFor = { driver: 'u-1001', fleet: 'u-1003', operator: 'u-1004', admin: 'u-1000' }

const extraFromCurrent = Object.values(currentUsers).reduce((acc, u) => ((acc[u.id] = u), acc), {})
const points = Object.fromEntries(leaderboard.map((l) => [l.name === 'You' ? 'Jordan Lee' : l.name, l.points]))
const handles = Object.fromEntries(posts.map((p) => [p.author, { handle: p.handle, color: p.avatarColor }]))

const profileRows = [
  ...adminUsers,
  { id: 'u-1000', name: 'Ravi Patel', email: 'ravi@voltgrid.com', role: 'admin', status: 'active', sessions: 0, joined: '2021-06-01', spend: 0 },
].map((u) => {
  const extra = extraFromCurrent[u.id] ?? {}
  byName.set(u.name, uuidFor(u.id))
  return {
    ...u,
    uuid: uuidFor(u.id),
    company: extra.company ?? (u.role === 'fleet' ? 'Swift Logistics' : null),
    vehicle: extra.vehicle ?? null,
    plan: extra.plan ?? null,
    points: u.role === 'driver' ? (extra.points ?? points[u.name] ?? Math.round((u.spend ?? 0) * 1.7)) : 0,
    handle: handles[u.name]?.handle ?? null,
    color: handles[u.name]?.color ?? null,
    persona: Object.values(personaFor).includes(u.id),
  }
})
const uid = (mockId) => q(uuidFor(mockId))
const uidByName = (name) => (byName.has(name) ? q(byName.get(name)) : 'NULL')
const DRIVER = uid('u-1001')

// station + connector lookups -------------------------------------------------
const stationByName = new Map(stations.map((s) => [s.name, s.id]))
const connectorAt = (stationId, label) =>
  connectors.find((c) => c.stationId === stationId && c.label === label)?.id ?? null
const connectorBySpec = (stationId, type, powerKw) =>
  connectors.find((c) => c.stationId === stationId && c.type === type && c.powerKw === powerKw)?.id ??
  connectors.find((c) => c.stationId === stationId)?.id ??
  null

// time helpers ----------------------------------------------------------------
function to24h(label) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(label.trim())
  if (!m) return label
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return `${String(h).padStart(2, '0')}:${m[2]}`
}
const plusMinutes = (hhmm, mins) => {
  const [h, m] = hhmm.split(':').map(Number)
  const t = (h * 60 + m + mins) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
function durationToInterval(text) {
  const h = /(\d+)\s*h/.exec(text)
  const min = /(\d+)\s*min/.exec(text)
  return `${h ? Number(h[1]) : 0} hours ${min ? Number(min[1]) : 0} minutes`
}
function durationMinutes(text) {
  const h = /(\d+)\s*h/.exec(text)
  const min = /(\d+)\s*min/.exec(text)
  return (h ? Number(h[1]) : 0) * 60 + (min ? Number(min[1]) : 0)
}
// The mock timestamps are naive local times; keep them that way so the seed
// does not silently shift by the generating machine's UTC offset.
function addMinutesLocal(iso, mins) {
  const d = new Date(new Date(iso).getTime() + mins * 60000)
  const pad = (x) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ---- header ----------------------------------------------------------------
w(`-- ============================================================================
-- Phase 2 (part 2 of 2): seed data
--
-- GENERATED from src/data/*.js -- do not hand-edit. Regenerate with the script
-- described in SUPABASE_HANDOVER.md if the demo dataset ever changes.
--
-- Every insert is idempotent, so this file can be replayed safely.
--
-- The 14 profiles below have no rows in auth.users: they are the demo cast the
-- UI was designed around. One per role is flagged is_demo_persona, and
-- public.demo_persona_id() hands a signed-in user that persona's data on top of
-- their own -- which is why a brand-new account still sees a populated app.
-- ============================================================================
`)

// ---- profiles --------------------------------------------------------------
insert(
  'profiles',
  ['id', 'name', 'email', 'role', 'status', 'sessions', 'joined', 'spend', 'company', 'vehicle', 'plan', 'points', 'handle', 'avatar_color', 'is_demo', 'is_demo_persona'],
  profileRows.map((p) =>
    `(${q(p.uuid)}, ${q(p.name)}, ${q(p.email)}, ${q(p.role)}, ${q(p.status)}, ${n(p.sessions)}, ${q(p.joined)}, ${n(p.spend)}, ${q(p.company)}, ${q(p.vehicle)}, ${q(p.plan)}, ${n(p.points)}, ${q(p.handle)}, ${q(p.color)}, true, ${b(p.persona)})`
  ),
  `ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role,
    status = EXCLUDED.status, sessions = EXCLUDED.sessions, joined = EXCLUDED.joined,
    spend = EXCLUDED.spend, company = EXCLUDED.company, vehicle = EXCLUDED.vehicle,
    plan = EXCLUDED.plan, points = EXCLUDED.points, handle = EXCLUDED.handle,
    avatar_color = EXCLUDED.avatar_color, is_demo = true, is_demo_persona = EXCLUDED.is_demo_persona`
)

// ---- stations + connectors -------------------------------------------------
insert(
  'stations',
  ['id', 'name', 'address', 'city', 'latitude', 'longitude', 'rating', 'reviews', 'price_per_kwh', 'status', 'amenities', 'hours', 'operator', 'utilization'],
  stations.map((s) =>
    `(${q(s.id)}, ${q(s.name)}, ${q(s.address)}, ${q(s.city)}, ${n(s.latitude)}, ${n(s.longitude)}, ${n(s.rating)}, ${n(s.reviews)}, ${n(s.pricePerKwh)}, ${q(s.status)}, ${arr(s.amenities)}, ${q(s.hours)}, ${q(s.operator)}, ${n(s.utilization)})`
  ),
  `ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, address = EXCLUDED.address, city = EXCLUDED.city,
    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
    rating = EXCLUDED.rating, reviews = EXCLUDED.reviews,
    price_per_kwh = EXCLUDED.price_per_kwh, status = EXCLUDED.status,
    amenities = EXCLUDED.amenities, hours = EXCLUDED.hours,
    operator = EXCLUDED.operator, utilization = EXCLUDED.utilization`
)

insert(
  'connectors',
  ['id', 'station_id', 'label', 'type', 'power_kw', 'status', 'energy_today_kwh', 'uptime_pct', 'last_serviced'],
  connectors.map((c) =>
    `(${q(c.id)}, ${q(c.stationId)}, ${q(c.label)}, ${q(c.type)}, ${n(c.powerKw)}, ${q(c.status)}, ${n(c.energyTodayKwh)}, ${n(c.uptimePct)}, ${q(c.lastServiced)})`
  ),
  `ON CONFLICT (id) DO UPDATE SET
    station_id = EXCLUDED.station_id, label = EXCLUDED.label, type = EXCLUDED.type,
    power_kw = EXCLUDED.power_kw, status = EXCLUDED.status,
    energy_today_kwh = EXCLUDED.energy_today_kwh, uptime_pct = EXCLUDED.uptime_pct,
    last_serviced = EXCLUDED.last_serviced`
)

// ---- booking slots ---------------------------------------------------------
w(`-- Availability is not stored: booking_slots is the grid, and a slot counts as
-- taken when a reservation covers it. Only the grid is seeded.`)
insert(
  'booking_slots',
  ['id', 'label', 'start_time', 'end_time', 'sort_order'],
  timeSlots.map((t, i) => {
    const start = to24h(t.time)
    return `(${q(t.id)}, ${q(t.time)}, ${q(start)}, ${q(plusMinutes(start, 30))}, ${i})`
  }),
  'ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, sort_order = EXCLUDED.sort_order'
)

// ---- sessions --------------------------------------------------------------
const activeConnector = connectorAt('st-01', activeSession.charger.split(' ')[0])
const sessionRows = [
  `(${q(activeSession.id)}, ${DRIVER}, ${q(activeSession.stationId)}, ${q(activeConnector)}, 'active', ${q(activeSession.startedAt)}, NULL, NULL, ${n(activeSession.energyKwh)}, ${n(activeSession.costSoFar)}, ${n(activeSession.startSoc)}, ${n(activeSession.targetSoc)}, ${n(activeSession.currentSoc)}, ${n(activeSession.powerKw)}, ${q(activeSession.vehicle)}, ${json(activeSession.powerCurve)})`,
  ...chargingHistory.map((h) => {
    const stationId = stationByName.get(h.station)
    const [type, power] = [h.connector.replace(/\s+\d+\s*kW$/, ''), Number(/(\d+)\s*kW/.exec(h.connector)[1])]
    const mins = durationMinutes(h.duration)
    return `(${q(h.id)}, ${DRIVER}, ${q(stationId)}, ${q(connectorBySpec(stationId, type, power))}, ${q(h.status)}, ${q(h.date)}, ${q(addMinutesLocal(h.date, mins))}, ${q(durationToInterval(h.duration))}, ${n(h.energy)}, ${n(h.cost)}, NULL, NULL, NULL, NULL, ${q(currentUsers.driver.vehicle)}, NULL)`
  }),
]
insert(
  'sessions',
  ['id', 'user_id', 'station_id', 'connector_id', 'status', 'started_at', 'ended_at', 'duration', 'energy_kwh', 'cost', 'start_soc', 'target_soc', 'current_soc', 'power_kw', 'vehicle', 'power_curve'],
  sessionRows,
  'ON CONFLICT (id) DO NOTHING'
)

// ---- reservations ----------------------------------------------------------
const reservationRows = reservations.map((r) => {
  const start = to24h(r.startTime)
  return `(${q(r.id)}, ${uid(r.userId)}, ${q(r.stationId)}, ${q(r.connectorId)}, ${q(r.date)}, ${q(start)}, ${q(to24h(r.endTime))}, ${q(r.status)})`
})
// The operator reservation book from analytics.js, folded into the same table.
const STATUS_MAP = { confirmed: 'RESERVED', pending: 'PENDING', cancelled: 'CANCELLED' }
for (const r of reservationsList) {
  const stationId = stationByName.get(r.station)
  const label = r.charger.split(/[–-]/)[0].trim()
  const start = to24h(r.time)
  const owner = r.customer.includes('fleet') ? uidByName('Sofia Marino') : uidByName(r.customer)
  if (owner === 'NULL' || !stationId) continue
  reservationRows.push(
    `(${q(r.id)}, ${owner}, ${q(stationId)}, ${q(connectorAt(stationId, label))}, ${q(r.date)}, ${q(start)}, ${q(plusMinutes(start, 30))}, ${q(STATUS_MAP[r.status])})`
  )
}
insert(
  'reservations',
  ['id', 'user_id', 'station_id', 'connector_id', 'date', 'start_time', 'end_time', 'status'],
  reservationRows,
  'ON CONFLICT (id) DO NOTHING'
)

insert(
  'waitlists',
  ['id', 'user_id', 'station_id', 'date', 'time_window', 'position', 'ahead_of', 'notify_on_free'],
  waitlistEntries.map((wl) =>
    `(${q(wl.id)}, ${uid(wl.userId)}, ${q(wl.stationId)}, ${q(wl.date)}, ${q(wl.window)}, ${n(wl.position)}, ${n(wl.aheadOf)}, ${b(wl.notifyOnFree)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)

// ---- reviews ---------------------------------------------------------------
insert(
  'reviews',
  ['id', 'station_id', 'author_id', 'author_name', 'rating', 'reviewed_on', 'title', 'body', 'seed_helpful', 'verified_session'],
  reviews.map((r) =>
    `(${q(r.id)}, ${q(r.stationId)}, ${uidByName(r.author)}, ${q(r.author)}, ${n(r.rating)}, ${q(r.date)}, ${q(r.title)}, ${q(r.body)}, ${n(r.helpful)}, ${b(r.verifiedSession)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)

// ---- community -------------------------------------------------------------
insert(
  'posts',
  ['id', 'author_id', 'author_name', 'handle', 'avatar_color', 'created_at', 'tag', 'title', 'body', 'seed_likes', 'comments', 'shares'],
  posts.map((p) =>
    `(${q(p.id)}, ${uidByName(p.author)}, ${q(p.author)}, ${q(p.handle)}, ${q(p.avatarColor)}, ${q(p.time)}, ${q(p.tag)}, ${q(p.title)}, ${q(p.body)}, ${n(p.likes)}, ${n(p.comments)}, ${n(p.shares)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)

// ---- tickets ---------------------------------------------------------------
insert(
  'sla_policies',
  ['priority', 'response_hours'],
  Object.entries(SLA_HOURS).map(([p, h]) => `(${q(p)}, ${n(h)})`),
  'ON CONFLICT (priority) DO UPDATE SET response_hours = EXCLUDED.response_hours'
)
insert(
  'fault_categories',
  ['name', 'sort_order'],
  faultCategories.map((c, i) => `(${q(c)}, ${i})`),
  'ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order'
)
insert(
  'tickets',
  ['id', 'title', 'station_id', 'connector_id', 'connector_label', 'fault_code', 'priority', 'status', 'source', 'reporter', 'reporter_id', 'assigned_to', 'reported_at', 'sla_due_at', 'resolved_at', 'description', 'parts'],
  tickets.map((t) =>
    `(${q(t.id)}, ${q(t.title)}, ${q(t.stationId)}, ${q(t.connectorId)}, ${q(t.connectorLabel)}, ${q(t.faultCode)}, ${q(t.priority)}, ${q(t.status)}, ${q(t.source)}, ${q(t.reporter)}, ${t.reporter.startsWith('Jordan Lee') ? DRIVER : 'NULL'}, ${q(t.assignedTo)}, ${q(t.reportedAt)}, ${q(t.slaDueAt)}, ${q(t.resolvedAt ?? null)}, ${q(t.description)}, ${arr(t.parts)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)
const events = tickets.flatMap((t) => t.activity.map((a) => ({ ...a, ticket: t.id })))
insert(
  'ticket_events',
  ['ticket_id', 'at', 'who', 'what'],
  events.map((e) => `(${q(e.ticket)}, ${q(e.at)}, ${q(e.who)}, ${q(e.what)})`),
  'ON CONFLICT DO NOTHING'
)

// ---- notifications ---------------------------------------------------------
w(`-- Broadcasts: user_id stays null and \`roles\` decides who sees the row. A
-- reader marks one read by inserting into notification_reads.`)
insert(
  'notifications',
  ['id', 'user_id', 'roles', 'type', 'title', 'body', 'created_at', 'seed_read'],
  notifications.map((nt) =>
    `(${q(nt.id)}, NULL, ${roleArr(nt.roles)}, ${q(nt.type)}, ${q(nt.title)}, ${q(nt.body)}, ${q(nt.time)}, ${b(nt.read)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)

// ---- wallet ----------------------------------------------------------------
insert(
  'wallet_accounts',
  ['user_id', 'balance', 'currency', 'auto_top_up', 'auto_top_up_threshold', 'auto_top_up_amount'],
  [`(${DRIVER}, ${n(wallet.balance)}, ${q(wallet.currency)}, ${b(wallet.autoTopUp)}, ${n(wallet.autoTopUpThreshold)}, ${n(wallet.autoTopUpAmount)})`],
  `ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, auto_top_up = EXCLUDED.auto_top_up,
    auto_top_up_threshold = EXCLUDED.auto_top_up_threshold, auto_top_up_amount = EXCLUDED.auto_top_up_amount`
)
insert(
  'payment_cards',
  ['id', 'user_id', 'brand', 'last4', 'expiry', 'is_primary'],
  wallet.cards.map((c) => `(${q(c.id)}, ${DRIVER}, ${q(c.brand)}, ${q(c.last4)}, ${q(c.expiry)}, ${b(c.primary)})`),
  'ON CONFLICT (id) DO NOTHING'
)
insert(
  'transactions',
  ['id', 'user_id', 'type', 'description', 'occurred_at', 'amount', 'status', 'method'],
  transactions.map((t) =>
    `(${q(t.id)}, ${DRIVER}, ${q(t.type)}, ${q(t.description)}, ${q(t.date)}, ${n(t.amount)}, ${q(t.status)}, ${q(t.method)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)

// ---- marketplace -----------------------------------------------------------
insert(
  'product_categories',
  ['name', 'sort_order'],
  categories.filter((c) => c !== 'All').map((c, i) => `(${q(c)}, ${i})`),
  'ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order'
)
// Seller submissions waiting on a reviewer. These used to be a constant in
// src/pages/admin/Marketplace.jsx, which meant approving one changed nothing.
const pendingListings = [
  {
    id: 'mp-pending-1',
    name: 'DualPort 22kW Wallbox',
    seller: 'NordVolt',
    category: 'Home charging',
    price: 899,
    submitted: '2026-07-29',
    description:
      'Two-socket 22kW wallbox with dynamic load balancing across both ports and a built-in energy meter.',
  },
  {
    id: 'mp-pending-2',
    name: 'Coiled Type 2 Cable · 5m',
    seller: 'AutoNiche',
    category: 'Cables',
    price: 89,
    submitted: '2026-07-27',
    description:
      'Coiled 5m 16A Type 2 cable that retracts off the ground, with a moulded grip and storage strap.',
  },
]

insert(
  'products',
  ['id', 'name', 'category', 'price', 'per', 'rating', 'reviews', 'badge', 'seller', 'stock', 'gradient', 'description', 'listing_status', 'submitted_on'],
  [
    ...products.map((p) =>
      `(${q(p.id)}, ${q(p.name)}, ${q(p.category)}, ${n(p.price)}, ${q(p.per ?? null)}, ${n(p.rating)}, ${n(p.reviews)}, ${q(p.badge)}, ${q(p.seller)}, ${n(p.stock)}, ${q(p.gradient)}, ${q(p.description)}, 'live', NULL)`
    ),
    ...pendingListings.map((p) =>
      `(${q(p.id)}, ${q(p.name)}, ${q(p.category)}, ${n(p.price)}, NULL, 0, 0, NULL, ${q(p.seller)}, NULL, 'from-slate-400 to-slate-600', ${q(p.description)}, 'pending', ${q(p.submitted)})`
    ),
  ],
  'ON CONFLICT (id) DO NOTHING'
)

// ---- fleet -----------------------------------------------------------------
insert(
  'fleet_settings',
  ['company', 'depot_power_limit_kw'],
  [`(${q(COMPANY)}, ${n(depotPowerLimitKw)})`],
  'ON CONFLICT (company) DO UPDATE SET depot_power_limit_kw = EXCLUDED.depot_power_limit_kw'
)
insert(
  'fleet_drivers',
  ['id', 'company', 'name', 'email', 'licence', 'assigned_vehicle', 'shift', 'status', 'sessions_this_month', 'energy_kwh', 'safety_score'],
  fleetDrivers.map((d) =>
    `(${q(d.id)}, ${q(COMPANY)}, ${q(d.name)}, ${q(d.email)}, ${q(d.licence)}, ${q(d.assignedVehicle)}, ${q(d.shift)}, ${q(d.status)}, ${n(d.sessionsThisMonth)}, ${n(d.energyKwh)}, ${n(d.safetyScore)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)
insert(
  'fleet_vehicles',
  ['id', 'company', 'driver_id', 'model', 'driver_name', 'soc', 'range_km', 'status', 'location', 'odometer', 'health', 'next_service'],
  fleetVehicles.map((v) =>
    `(${q(v.id)}, ${q(COMPANY)}, ${q(v.driverId)}, ${q(v.model)}, ${q(v.driver)}, ${n(v.soc)}, ${n(v.rangeKm)}, ${q(v.status)}, ${q(v.location)}, ${n(v.odometer)}, ${n(v.health)}, ${q(v.nextService)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)
insert(
  'invoices',
  ['id', 'company', 'period', 'amount', 'sessions', 'energy', 'status', 'due'],
  invoices.map((i) =>
    `(${q(i.id)}, ${q(COMPANY)}, ${q(i.period)}, ${n(i.amount)}, ${n(i.sessions)}, ${n(i.energy)}, ${q(i.status)}, ${q(i.due)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)
insert(
  'charging_schedule',
  ['id', 'company', 'vehicle_id', 'connector_label', 'start_time', 'end_time', 'target_soc_pct', 'status', 'night'],
  chargingSchedule.map((s) =>
    `(${q(s.id)}, ${q(COMPANY)}, ${q(s.vehicleId)}, ${q(s.connectorLabel)}, ${q(s.start)}, ${q(s.end)}, ${n(s.targetSocPct)}, ${q(s.status)}, ${q(s.night)})`
  ),
  'ON CONFLICT (id) DO NOTHING'
)

// ---- reporting snapshots ---------------------------------------------------
w(`-- Reporting snapshots. Each row is one point on one chart. These are the
-- figures whose source events the platform does not record yet; swap a series
-- for a view over \`sessions\` once there is real volume behind it.`)
const series = []
const addSeries = (name, items, bucketOf, metricsOf) =>
  items.forEach((item, i) => series.push(`(${q(name)}, ${q(bucketOf(item))}, ${i}, ${json(metricsOf(item))})`))

addSeries('revenue_by_day', revenueByDay, (d) => d.day, (d) => ({ revenue: d.revenue, energy: d.energy, sessions: d.sessions }))
addSeries('revenue_by_station', revenueByStation, (d) => d.station, (d) => ({ revenue: d.revenue }))
addSeries('sessions_by_hour', sessionsByHour, (d) => d.hour, (d) => ({ sessions: d.sessions }))
addSeries('platform_growth', platformGrowth, (d) => d.month, (d) => ({ users: d.users, sessions: d.sessions }))
addSeries('revenue_by_segment', revenueBySegment, (d) => d.month, (d) => ({ drivers: d.drivers, fleet: d.fleet, marketplace: d.marketplace }))
addSeries('energy_mix', energyMix, (d) => d.name, (d) => ({ value: d.value }))
addSeries('region_performance', regionPerformance, (d) => d.region, (d) => ({ stations: d.stations, uptime: d.uptime, revenue: d.revenue, growth: d.growth }))
addSeries('fleet_energy_by_week', fleetEnergyByWeek, (d) => d.week, (d) => ({ depot: d.depot, public: d.public }))
addSeries('fleet_cost_per_vehicle', fleetCostPerVehicle, (d) => d.id, (d) => ({ cost: d.cost }))
addSeries('fleet_utilization', fleetUtilization, (d) => d.month, (d) => ({ utilization: d.utilization, downtime: d.downtime }))
addSeries('fleet_cost_breakdown', costBreakdown, (d) => d.name, (d) => ({ value: d.value }))
addSeries('driver_monthly_usage', monthlyUsage, (d) => d.month, (d) => ({ energy: d.energy, cost: d.cost }))

insert(
  'analytics_series',
  ['series', 'bucket', 'ord', 'metrics'],
  series,
  'ON CONFLICT (series, bucket) DO UPDATE SET ord = EXCLUDED.ord, metrics = EXCLUDED.metrics'
)

fs.writeFileSync(
  new URL('../supabase/migrations/20260821210000_seed.sql', import.meta.url),
  out.join('\n'),
  'utf8'
)
console.log('rows:', {
  profiles: profileRows.length,
  stations: stations.length,
  connectors: connectors.length,
  sessions: sessionRows.length,
  reservations: reservationRows.length,
  reviews: reviews.length,
  tickets: tickets.length,
  ticketEvents: events.length,
  posts: posts.length,
  transactions: transactions.length,
  products: products.length,
  vehicles: fleetVehicles.length,
  series: series.length,
})
