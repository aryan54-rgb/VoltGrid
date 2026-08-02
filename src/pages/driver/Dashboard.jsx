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
import { activeSession, chargingHistory, monthlyUsage, driverBookings } from '@/data/sessions'
import { wallet } from '@/data/wallet'
import { stations } from '@/data/stations'
import { currentUsers } from '@/data/users'

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

  const driver = currentUsers.driver

  const sessionsThisMonth = chargingHistory.filter((s) => s.date.startsWith('2026-07')).length

  const nextBooking = driverBookings[0]

  const nearby = React.useMemo(
    () => [...stations].sort((a, b) => a.distance - b.distance).slice(0, 4),
    []
  )

  const markers = React.useMemo(
    () => stations.map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y, status: s.status })),
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${driver.name.split(' ')[0]}`}
        description={`${driver.vehicle} · charging now at ${activeSession.stationName}`}
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
          value={`${activeSession.currentSoc}%`}
          icon={BatteryCharging}
        />
        <StatCard
          index={1}
          label="Wallet balance"
          value={formatCurrency(wallet.balance, wallet.currency)}
          icon={WalletIcon}
        />
        <StatCard index={2} label="Sessions this month" value={sessionsThisMonth} icon={Zap} />
        <StatCard index={3} label="Reward points" value={formatNumber(driver.points)} icon={Award} />
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
              <StatusBadge status="charging" />
            </CardHeader>
            <CardContent className="space-y-3">
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
              <Row label="Power" value={`${activeSession.powerKw} kW`} />
              <Row label="Cost so far" value={formatCurrency(activeSession.costSoFar)} />
              <Button asChild className="w-full">
                <Link to="/driver/session">View live session</Link>
              </Button>
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
          <h2 className="text-base font-semibold tracking-tight">Nearby stations</h2>
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
                          <span>{s.distance} mi</span>
                          <span>·</span>
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
