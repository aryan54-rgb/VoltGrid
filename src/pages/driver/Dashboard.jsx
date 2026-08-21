import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import {
  BatteryCharging,
  Wallet as WalletIcon,
  Zap,
  Award,
  ChevronRight,
  MapPin,
  CalendarClock,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
import { StatusBadge } from '@/components/shared/status-badge'
import { MapPlaceholder } from '@/components/shared/map-placeholder'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { useGeolocation } from '@/hooks/use-geolocation'
import { byDistance, toMarkers, withDistance } from '@/lib/geo'
import { useAuth } from '@/context/auth'
import { fetchActiveSession, fetchChargingHistory } from '@/lib/api/sessions'
import { fetchMonthlyUsage } from '@/lib/api/analytics'
import { fetchReservations } from '@/lib/api/reservations'
import { fetchWallet } from '@/lib/api/wallet'
import { fetchStations } from '@/lib/api/stations'

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/** Total available / total bays across a station's connector groups. */
function availabilityOf(station) {
  return station.connectors.reduce(
    (acc, c) => ({ available: acc.available + c.available, total: acc.total + c.total }),
    { available: 0, total: 0 }
  )
}

export default function Dashboard() {
  const [selectedStationId, setSelectedStationId] = React.useState(null)
  const { profile } = useAuth()

  const query = useQueries({
    activeSession: fetchActiveSession,
    history: () => fetchChargingHistory({ limit: 100 }),
    usage: fetchMonthlyUsage,
    reservations: fetchReservations,
    wallet: fetchWallet,
    stations: fetchStations,
  })

  const activeSession = query.data?.activeSession ?? null
  const history = React.useMemo(() => query.data?.history ?? [], [query.data])
  const monthlyUsage = query.data?.usage ?? []
  const wallet = query.data?.wallet
  // Distances are measured here, from the browser's own position, rather than
  // read off the row -- see `src/lib/geo.js`. No fix yet (or refused) just means
  // `distanceLabel` is null and the tile shows the price instead.
  const location = useGeolocation()
  const stations = React.useMemo(
    () => withDistance(query.data?.stations ?? [], location.coords),
    [query.data, location.coords]
  )

  // "This month" means the calendar month of the most recent session, not the
  // wall clock - otherwise the tile reads 0 for anyone between charges.
  const sessionsThisMonth = React.useMemo(() => {
    const latest = history[0]?.date
    if (!latest) return 0
    const month = latest.slice(0, 7)
    return history.filter((s) => (s.date ?? '').startsWith(month)).length
  }, [history])

  const nextBooking = React.useMemo(() => {
    const upcoming = (query.data?.reservations ?? []).filter((r) =>
      ['RESERVED', 'PENDING', 'ACTIVE'].includes(r.status)
    )
    return (
      [...upcoming].sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      )[0] ?? null
    )
  }, [query.data])

  // Without a position every distance is null, `byDistance` keeps the order it
  // was given, and this degrades to "the first four stations".
  const nearby = React.useMemo(() => [...stations].sort(byDistance).slice(0, 4), [stations])

  const markers = React.useMemo(() => toMarkers(stations), [stations])

  const driverName = profile?.name ?? 'driver'
  const vehicle = profile?.vehicle ?? 'Your vehicle'

  if (query.loading && !query.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={6} />
      </div>
    )
  }
  if (query.error) {
    return (
      <ErrorState error={query.error} onRetry={query.refetch} title="Could not load your dashboard" />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${driverName.split(' ')[0]}`}
        description={
          activeSession
            ? `${vehicle} · charging now at ${activeSession.stationName}`
            : `${vehicle} · no session running right now`
        }
        actions={
          <Button asChild>
            <Link to="/driver/stations">
              <MapPin /> Find a station
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Battery level"
          value={activeSession?.currentSoc != null ? `${activeSession.currentSoc}%` : '—'}
          icon={BatteryCharging}
        />
        <StatCard
          index={1}
          label="Wallet balance"
          value={wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}
          icon={WalletIcon}
        />
        <StatCard index={2} label="Sessions this month" value={sessionsThisMonth} icon={Zap} />
        <StatCard index={3} label="Reward points" value={formatNumber(profile?.points ?? 0)} icon={Award} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Energy usage"
          description="Energy charged per month across all your sessions"
          className="lg:col-span-2"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyUsage}>
              <defs>
                <linearGradient id="driverEnergyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${v} kWh`} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Area
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill="url(#driverEnergyFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Active session</CardTitle>
              {activeSession && <StatusBadge status="charging" />}
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSession ? (
                <>
                  <div>
                    <p className="text-sm font-medium">{activeSession.stationName}</p>
                    <p className="text-xs text-muted-foreground">{activeSession.charger}</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">State of charge</span>
                      <span className="font-medium tabular-nums">
                        {activeSession.currentSoc}% → {activeSession.targetSoc}%
                      </span>
                    </div>
                    <Progress value={activeSession.currentSoc} />
                  </div>
                  <Separator />
                  <Row label="Power" value={`${activeSession.powerKw ?? 0} kW`} />
                  <Row label="Cost so far" value={formatCurrency(activeSession.costSoFar)} />
                  <Button asChild className="w-full">
                    <Link to="/driver/session">View live session</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing charging right now. Start a session at any station.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
              <CardTitle className="text-base">Upcoming booking</CardTitle>
              {nextBooking && <StatusBadge status={nextBooking.status} />}
            </CardHeader>
            <CardContent className="space-y-3">
              {nextBooking ? (
                <>
                  <div>
                    <p className="text-sm font-medium">{nextBooking.station}</p>
                    <p className="text-xs text-muted-foreground">{nextBooking.charger}</p>
                  </div>
                  <p className="flex items-center gap-1.5 text-sm">
                    <CalendarClock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {formatDate(nextBooking.date)} · {nextBooking.time}
                  </p>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/driver/history">Manage bookings</Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">
            {location.status === 'ready' ? 'Nearby stations' : 'Stations'}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/driver/stations">
              View all <ChevronRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <MapPlaceholder
              height={340}
              markers={markers}
              selectedId={selectedStationId}
              onSelect={(m) => setSelectedStationId(m.id)}
            />
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {nearby.map((s, i) => {
                const { available, total } = availabilityOf(s)
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.05 }}
                  >
                    <Link
                      to={`/driver/stations/${s.id}`}
                      onMouseEnter={() => setSelectedStationId(s.id)}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.name}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                          {s.distanceLabel && (
                            <>
                              <span>{s.distanceLabel}</span>
                              <span>·</span>
                            </>
                          )}
                          <span>{formatCurrency(s.pricePerKwh)}/kWh</span>
                          <span>·</span>
                          <span>
                            {available}/{total} free
                          </span>
                        </p>
                        <span className="mt-1.5 inline-flex">
                          <StatusBadge status={s.status} />
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
