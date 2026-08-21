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
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Clock,
  Download,
  Landmark,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { CHART_COLORS, ChartCard, ChartTooltip, GRID, axisProps } from '@/components/shared/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { ErrorState, LoadingBlock, LoadingCards } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchRevenueByDay, fetchRevenueByStation } from '@/lib/api/analytics'

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
]

const nextPayout = { amount: 38420.5, expected: '2026-08-07', bank: '•••• 4471' }

const recentPayouts = [
  { id: 'PO-2207', date: '2026-07-24', amount: 35180.2 },
  { id: 'PO-2198', date: '2026-07-10', amount: 33940.75 },
  { id: 'PO-2186', date: '2026-06-26', amount: 31620.4 },
]

const TOP_STATION = 'Volta Plaza'

function PayoutRow({ label, sub, amount, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">{formatCurrency(amount)}</span>
        {children}
      </div>
    </div>
  )
}

export default function Revenue() {
  const [range, setRange] = React.useState('14')

  const charts = useQueries({
    byDay: fetchRevenueByDay,
    byStation: fetchRevenueByStation,
  })
  const revenueByDay = charts.data?.byDay ?? []
  const revenueByStation = charts.data?.byStation ?? []

  const topStation = revenueByStation.find((s) => s.station === TOP_STATION) ?? revenueByStation[0]

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
            <Button variant="outline">
              <Download /> Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Revenue month-to-date"
          value="$142.5k"
          delta={8.1}
          icon={CircleDollarSign}
        />
        <StatCard index={1} label="Average per session" value="$14.20" icon={Banknote} />
        <StatCard index={2} label="Energy sold" value="328 MWh" icon={Zap} />
        <StatCard index={3} label="Idle fees" value="$2.4k" icon={Clock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Daily revenue"
          description="Gross revenue per day across your stations"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByDay} margin={{ left: 4, right: 8 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="day" {...axisProps} />
              <YAxis {...axisProps} width={44} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
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
            <LineChart data={revenueByDay} margin={{ left: 4, right: 8 }}>
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
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
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
            <CardDescription>
              Settled earnings are transferred to your bank account every two weeks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--status-good)]/30 bg-[var(--status-good)]/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Next payout</span>
                  <Badge variant="secondary">Scheduled</Badge>
                </div>
                <p className="text-2xl font-semibold tabular-nums tracking-tight">
                  {formatCurrency(nextPayout.amount)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expected {formatDate(nextPayout.expected)} · bank {nextPayout.bank}
                </p>
              </div>
            </div>

            <Separator />

            {recentPayouts.map((p) => (
              <PayoutRow
                key={p.id}
                label={p.id}
                sub={`Paid ${formatDate(p.date)} · bank ${nextPayout.bank}`}
                amount={p.amount}
              >
                <StatusBadge status="PAID" />
              </PayoutRow>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Top performing station</CardTitle>
            <CardDescription>Month-to-date leader</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="font-medium">Volta Plaza Charging Station</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(topStation.revenue)}
              </p>
              <p className="flex items-center gap-1 text-sm font-medium text-[var(--delta-good)]">
                <ArrowUpRight className="h-4 w-4" />
                +12% month over month
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Utilisation</span>
                <span className="font-medium tabular-nums">72%</span>
              </div>
              <Progress value={72} />
              <p className="text-xs text-muted-foreground">
                Bays are busy roughly three quarters of the day — adding a bay here pays back fastest.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
