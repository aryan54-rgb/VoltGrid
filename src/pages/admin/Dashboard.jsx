import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts'
import { Users, DollarSign, Zap, Activity } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard, ChartLegend } from '@/components/shared/chart'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { adminUsers } from '@/data/users'
import { platformGrowth, revenueBySegment } from '@/data/analytics'
import { stations } from '@/data/stations'
import { formatDate, formatNumber } from '@/lib/utils'

/** Core platform services and their rolling 30-day availability. */
const SERVICES = [
  { name: 'API gateway', status: 'online', uptime: 99.98 },
  { name: 'Session telemetry', status: 'online', uptime: 99.94 },
  { name: 'Payments & wallet', status: 'online', uptime: 99.89 },
  { name: 'Reporting pipeline', status: 'maintenance', uptime: 98.2 },
]

const STATUS_DOT = {
  online: 'var(--status-good)',
  maintenance: 'var(--status-warning)',
  offline: 'var(--status-critical)',
}

/** Five newest accounts across the network. */
const recentSignups = [...adminUsers]
  .sort((a, b) => new Date(b.joined) - new Date(a.joined))
  .slice(0, 5)

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="Network-wide growth, revenue and platform health."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value="14,600" delta={13.2} icon={Users} index={0} />
        <StatCard label="Monthly revenue" value="$243k" delta={9.4} icon={DollarSign} index={1} />
        <StatCard label="Active stations" value={formatNumber(stations.length)} icon={Zap} index={2} />
        <StatCard label="Platform uptime" value="99.2%" icon={Activity} index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users and sessions sit on different scales — two charts, never a dual axis. */}
        <div className="space-y-6 lg:col-span-2">
          <ChartCard title="Platform growth" description="Registered accounts, month over month" height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformGrowth}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => formatNumber(v)} />}
                  cursor={{ stroke: 'var(--chart-axis)' }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sessions" description="Charging sessions completed network-wide" height={180}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformGrowth}>
                <defs>
                  <linearGradient id="adminDashSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => formatNumber(v)} />}
                  cursor={{ stroke: 'var(--chart-axis)' }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fill="url(#adminDashSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="space-y-3">
          <ChartCard
            title="Revenue by segment"
            description="Monthly revenue, $k"
            height={496}
            actions={
              <ChartLegend
                items={[
                  { label: 'Drivers', color: CHART_COLORS[0] },
                  { label: 'Fleet', color: CHART_COLORS[1] },
                  { label: 'Marketplace', color: CHART_COLORS[2] },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySegment}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `$${v}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => `$${v}k`} />}
                  cursor={{ fill: 'var(--chart-grid)' }}
                />
                <Bar
                  dataKey="drivers"
                  name="Drivers"
                  stackId="rev"
                  fill={CHART_COLORS[0]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="fleet"
                  name="Fleet"
                  stackId="rev"
                  fill={CHART_COLORS[1]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="marketplace"
                  name="Marketplace"
                  stackId="rev"
                  fill={CHART_COLORS[2]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={28}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <p className="px-1 text-xs text-muted-foreground">
            Drivers pay from a prepaid wallet, fleets are invoiced monthly, and marketplace revenue comes
            from accessory sales.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent signups</CardTitle>
            <CardDescription>Newest accounts registered on the platform</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.joined)}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System health</CardTitle>
            <CardDescription>Core services behind the VoltGrid platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: STATUS_DOT[s.status] }}
                    aria-hidden="true"
                  />
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">{s.uptime}%</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Availability measured over the last 30 days. The reporting pipeline is in a scheduled
              maintenance window.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
