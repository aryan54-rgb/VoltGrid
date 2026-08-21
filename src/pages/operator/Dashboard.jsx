import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Activity, AlertTriangle, ChevronRight, DollarSign, PlugZap, Wrench, Zap } from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchConnectors, fetchStations } from '@/lib/api/stations'
import { fetchRevenueByDay, fetchSessionsByHour } from '@/lib/api/analytics'

const ALERTS = [
  {
    id: 'al-1',
    icon: AlertTriangle,
    tone: 'text-status-critical',
    text: 'Mission Bay Fast Lane — bay A3 reporting a ground fault',
    time: '12m ago',
  },
  {
    id: 'al-2',
    icon: PlugZap,
    tone: 'text-status-warning',
    text: 'Greenline Depot — all fast bays occupied for over an hour',
    time: '46m ago',
  },
  {
    id: 'al-3',
    icon: Wrench,
    tone: 'text-status-warning',
    text: 'Dogpatch Power Yard — site offline since the scheduled grid works',
    time: '2h ago',
  },
  {
    id: 'al-4',
    icon: Activity,
    tone: 'text-muted-foreground',
    text: 'Harborview Charging Hub — payment terminal reconnected',
    time: '5h ago',
  },
]

export default function Dashboard() {
  const query = useQueries({
    stations: fetchStations,
    connectors: fetchConnectors,
    revenueByDay: fetchRevenueByDay,
    sessionsByHour: fetchSessionsByHour,
  })
  const stations = query.data?.stations ?? []
  const connectors = query.data?.connectors ?? []
  const revenueByDay = query.data?.revenueByDay ?? []
  const sessionsByHour = query.data?.sessionsByHour ?? []

  const faultedChargers = connectors.filter((c) => c.status === 'FAULTED').length

  // Uptime is the mean of what the bays themselves report, not a fixed figure.
  const uptime = connectors.length
    ? connectors.reduce((sum, c) => sum + c.uptimePct, 0) / connectors.length
    : 0

  const latestDay = revenueByDay[revenueByDay.length - 1]

  if (query.loading && !query.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={6} />
      </div>
    )
  }
  if (query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} title="Could not load the dashboard" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operator dashboard"
        description="Live performance across the charging stations you operate."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue today"
          value={latestDay ? formatCurrency(latestDay.revenue) : '—'}
          delta={6.2}
          deltaLabel="vs yesterday"
          icon={DollarSign}
          index={0}
        />
        <StatCard
          label="Sessions today"
          value={latestDay ? formatNumber(latestDay.sessions) : '—'}
          delta={3.4}
          deltaLabel="vs yesterday"
          icon={Zap}
          index={1}
        />
        <StatCard
          label="Network uptime"
          value={`${uptime.toFixed(1)}%`}
          delta={0.4}
          deltaLabel="vs last week"
          icon={Activity}
          index={2}
        />
        <StatCard
          label="Faulted chargers"
          value={faultedChargers}
          delta={12}
          deltaLabel="vs last week"
          deltaGoodWhen="down"
          icon={AlertTriangle}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Revenue (14 days)"
          description="Gross charging revenue per day"
          height={280}
          className="lg:col-span-2"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueByDay} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="opRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" />
              <YAxis {...axisProps} width={40} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill="url(#opRevenueFill)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sessions by hour" description="Today, all stations" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionsByHour} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="hour" {...axisProps} interval={1} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${v} sessions`} />}
                cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
              />
              <Bar
                dataKey="sessions"
                name="Sessions"
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Station health</CardTitle>
            <CardDescription>Utilisation and free bays across every site you run</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead className="w-[180px]">Utilisation</TableHead>
                  <TableHead>Chargers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((s) => {
                  const total = s.connectors.reduce((sum, c) => sum + c.total, 0)
                  const available = s.connectors.reduce((sum, c) => sum + c.available, 0)
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.city}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={s.utilization} className="h-1.5 w-24" />
                          <span className="text-xs tabular-nums text-muted-foreground">{s.utilization}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{available}</span> / {total} free
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="icon-sm" aria-label={`Open ${s.name}`}>
                          <Link to="/operator/stations">
                            <ChevronRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alerts</CardTitle>
            <CardDescription>Live signals from the network in the last few hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {ALERTS.map((a, i) => {
              const Icon = a.icon
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="flex items-start gap-3 rounded-xl border p-3"
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${a.tone}`} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm leading-snug">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0">
                    Dispatch tech
                  </Button>
                </motion.div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
