import { Fragment, useState } from 'react'
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts'
import { Users, Repeat, UserMinus, DollarSign, ChevronDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard, ChartLegend } from '@/components/shared/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { LoadingBlock, QueryBoundary } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import {
  fetchPlatformGrowth, fetchRevenueBySegment, fetchSessionsByHour,
} from '@/lib/api/analytics'
import { formatNumber } from '@/lib/utils'

/** Driver acquisition funnel — an ordinal ramp of chart-1, not four categories. */
const FUNNEL = [
  { stage: 'Visited', count: 96400 },
  { stage: 'Registered', count: 21200 },
  { stage: 'First charging session', count: 14100 },
  { stage: 'Repeat customer', count: 9800 },
]

export default function Analytics() {
  const [range, setRange] = useState('6m')

  const charts = useQueries({
    platformGrowth: fetchPlatformGrowth,
    revenueBySegment: fetchRevenueBySegment,
    sessionsByHour: fetchSessionsByHour,
  })
  const { platformGrowth = [], revenueBySegment = [], sessionsByHour = [] } = charts.data ?? {}

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Network-wide engagement, revenue and usage trends."
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="3m">Last 3 months</SelectItem>
              <SelectItem value="6m">Last 6 months</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Monthly active users" value="14.6k" delta={13.2} icon={Users} index={0} />
        <StatCard label="Sessions per user" value="2.9" delta={3.6} icon={Repeat} index={1} />
        <StatCard label="Churn" value="1.8%" delta={-0.3} deltaGoodWhen="down" icon={UserMinus} index={2} />
        <StatCard label="Average session cost" value="$14.20" delta={2.4} icon={DollarSign} index={3} />
      </div>

      <QueryBoundary
        query={charts}
        errorTitle="Could not load analytics"
        loading={
          <div className="grid gap-6 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <LoadingBlock key={i} className="h-[318px]" />
            ))}
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="User growth" description="Registered accounts, month over month" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformGrowth}>
                <defs>
                  <linearGradient id="adminAnalyticsUsers" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="users"
                  name="Users"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fill="url(#adminAnalyticsUsers)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sessions per month" description="Charging sessions completed network-wide" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={platformGrowth}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => formatNumber(v)} />}
                  cursor={{ fill: 'var(--chart-grid)' }}
                />
                <Bar dataKey="sessions" name="Sessions" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Revenue by billing mode"
            description="Prepaid drivers vs postpaid fleets, $k"
            height={260}
            actions={
              <ChartLegend
                items={[
                  { label: 'Drivers', color: CHART_COLORS[0] },
                  { label: 'Fleet', color: CHART_COLORS[1] },
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
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Network sessions by hour" description="Average sessions started per hour of day" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionsByHour}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="hour" {...axisProps} />
                <YAxis {...axisProps} width={40} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => formatNumber(v)} />}
                  cursor={{ fill: 'var(--chart-grid)' }}
                />
                <Bar dataKey="sessions" name="Sessions" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </QueryBoundary>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Driver conversion funnel</CardTitle>
          <CardDescription>Visit through to repeat charging, last 6 months</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {FUNNEL.map((f, i) => {
            const widthPct = Math.max((f.count / FUNNEL[0].count) * 100, 3)
            const conversion = i > 0 ? Math.round((f.count / FUNNEL[i - 1].count) * 100) : null
            const opacity = 1 - i * 0.2 // 100% → 80% → 60% → 40%, an ordinal ramp
            return (
              <Fragment key={f.stage}>
                {conversion != null && (
                  <div className="flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5" />
                    {conversion}% continue to {f.stage.toLowerCase()}
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-4 text-sm">
                    <span className="font-medium text-foreground">{f.stage}</span>
                    <span className="tabular-nums text-muted-foreground">{formatNumber(f.count)}</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${widthPct}%`, backgroundColor: CHART_COLORS[0], opacity }}
                    />
                  </div>
                </div>
              </Fragment>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
