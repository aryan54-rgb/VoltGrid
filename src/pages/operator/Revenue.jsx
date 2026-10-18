import * as React from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Banknote,
  CircleDollarSign,
  Download,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, ChartCard, ChartTooltip, GRID, axisProps } from '@/components/shared/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatNumber } from '@/lib/utils'
import { ErrorState, LoadingBlock, LoadingCards } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchRevenueByDay, fetchRevenueByStation } from '@/lib/api/analytics'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
]

export default function Revenue() {
  const [range, setRange] = React.useState('14')

  const charts = useQueries({
    byDay: fetchRevenueByDay,
    byStation: fetchRevenueByStation,
  })
  const revenueByDay = charts.data?.byDay ?? []
  const revenueByStation = charts.data?.byStation ?? []

  const topStation = revenueByStation[0]
  const month = new Date().toISOString().slice(0, 7)
  const monthDays = revenueByDay.filter((day) => day.day.startsWith(month))
  const monthRevenue = monthDays.reduce((sum, day) => sum + day.revenue, 0)
  const monthSessions = monthDays.reduce((sum, day) => sum + day.sessions, 0)
  const monthEnergy = monthDays.reduce((sum, day) => sum + day.energyKwh, 0)
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - Number(range) + 1)
  const visibleDays = revenueByDay.filter((day) => day.day >= cutoff.toISOString().slice(0, 10))

  if (charts.loading && !charts.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingBlock />
      </div>
    )
  }
  if (charts.error) {
    return <ErrorState error={charts.error} onRetry={charts.refetch} title="Could not load revenue" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue"
        description="Earnings, energy sold and payouts across the stations you operate."
        actions={
          <div className="flex items-center gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled title="Export is not configured yet">
              <Download /> Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Revenue month-to-date"
          value={formatCurrency(monthRevenue)}
          icon={CircleDollarSign}
        />
        <StatCard index={1} label="Average per session" value={formatCurrency(monthSessions ? monthRevenue / monthSessions : 0)} icon={Banknote} />
        <StatCard index={2} label="Energy sold" value={`${formatNumber(monthEnergy)} kWh`} icon={Zap} />
        <StatCard index={3} label="Sessions" value={formatNumber(monthSessions)} icon={Zap} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Daily revenue"
          description="Gross revenue per day across your stations"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visibleDays} margin={{ left: 4, right: 8 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={44} tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Bar
                dataKey="revenue"
                name="Revenue"
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Energy delivered"
          description="kWh per day"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visibleDays} margin={{ left: 4, right: 8 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="day" {...axisProps} interval={3} />
              <YAxis {...axisProps} width={44} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${formatNumber(v)} kWh`} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Line
                type="monotone"
                dataKey="energyKwh"
                name="Energy"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <p className="text-xs text-muted-foreground">
        Revenue and energy are shown separately because they move in different units — read them
        side by side rather than as one line.
      </p>

      <ChartCard
        title="Revenue by station"
        description="Month-to-date, highest earning first"
        height={300}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueByStation} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
            <YAxis type="category" dataKey="station" {...axisProps} width={110} />
            <RTooltip
              content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
              cursor={{ stroke: 'var(--chart-axis)' }}
            />
            <Bar
              dataKey="revenue"
              name="Revenue"
              fill={CHART_COLORS[0]}
              radius={[0, 4, 4, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payouts</CardTitle>
            <CardDescription>Payout details are not connected to a payment provider.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">No payout records are available.</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top performing station</CardTitle>
            <CardDescription>Month-to-date leader</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium">{topStation?.station ?? 'No station earnings yet'}</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(topStation?.revenue ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
