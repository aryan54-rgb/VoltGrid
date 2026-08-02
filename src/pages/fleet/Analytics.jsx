import { useState } from 'react'
import { motion } from 'framer-motion'
import { Gauge, TimerOff, Zap, DollarSign, PlugZap, TrendingUp, TrendingDown } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard, ChartLegend } from '@/components/shared/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { fleetUtilization, fleetCostPerVehicle, fleetEnergyByWeek, costBreakdown } from '@/data/fleet'
import { formatCurrency, formatNumber } from '@/lib/utils'

const INSIGHTS = [
  {
    icon: PlugZap,
    title: 'Depot charging is the cheaper source',
    text: 'Depot energy accounts for $7,420 of spend against $3,180 on public fast charging — a far lower cost per kWh.',
  },
  {
    icon: TrendingUp,
    title: 'Utilisation is up 13 points since February',
    text: 'Fleet utilisation climbed from 68% in February to 81% in July as more vehicles moved onto overnight depot charging.',
  },
  {
    icon: TrendingDown,
    title: 'Downtime is at its lowest this year',
    text: 'Downtime fell to 2.9% in July, less than half the 6.2% recorded in February.',
  },
]

export default function Analytics() {
  const [range, setRange] = useState('30')
  const donutTotal = costBreakdown.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet analytics"
        description="Utilisation, energy and cost performance across the fleet"
        actions={
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilisation" value="81%" delta={3.8} icon={Gauge} index={0} />
        <StatCard label="Downtime" value="2.9%" delta={-19.4} deltaGoodWhen="down" icon={TimerOff} index={1} />
        <StatCard label="kWh per 100 km" value="21.4" delta={-1.8} deltaGoodWhen="down" icon={Zap} index={2} />
        <StatCard label="Cost per km" value="$0.086" delta={-3.4} deltaGoodWhen="down" icon={DollarSign} index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Utilisation vs downtime"
          description="Monthly, % of fleet hours"
          height={280}
          actions={
            <ChartLegend
              items={[
                { label: 'Utilisation', color: CHART_COLORS[0] },
                { label: 'Downtime', color: CHART_COLORS[1] },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fleetUtilization}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${v}%`} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Line
                type="monotone"
                dataKey="utilizationPct"
                name="Utilisation"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="downtimePct"
                name="Downtime"
                stroke={CHART_COLORS[1]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cost per vehicle" description="Charging spend this month" height={280}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fleetCostPerVehicle} layout="vertical">
              <CartesianGrid stroke={GRID} strokeDasharray="0" horizontal={false} />
              <XAxis type="number" {...axisProps} />
              <YAxis dataKey="id" type="category" {...axisProps} width={56} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
                cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
              />
              <Bar dataKey="cost" name="Cost" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Energy by source per week"
          description="Depot vs public charging, kWh"
          height={280}
          actions={
            <ChartLegend
              items={[
                { label: 'Depot', color: CHART_COLORS[0] },
                { label: 'Public', color: CHART_COLORS[1] },
              ]}
            />
          }
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fleetEnergyByWeek}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="week" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${formatNumber(v)} kWh`} />}
                cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
              />
              <Bar dataKey="depot" name="Depot" stackId="mix" fill={CHART_COLORS[0]} maxBarSize={28} />
              <Bar
                dataKey="public"
                name="Public"
                stackId="mix"
                fill={CHART_COLORS[1]}
                maxBarSize={28}
                stroke="var(--card)"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cost breakdown" description="This month by category" height={280}>
          <div className="flex h-full items-center gap-6">
            <div className="relative h-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="var(--card)"
                  >
                    {costBreakdown.map((entry, i) => (
                      <Cell key={entry.name} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <RTooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-semibold tracking-tight">{formatCurrency(donutTotal)}</span>
                <span className="text-xs text-muted-foreground">total spend</span>
              </div>
            </div>
            <div className="hidden w-44 shrink-0 space-y-2 sm:block">
              {costBreakdown.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i] }} />
                    {d.name}
                  </span>
                  <span className="font-medium tabular-nums">{formatCurrency(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {INSIGHTS.map((ins, i) => (
          <motion.div
            key={ins.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.05 }}
          >
            <Card className="h-full">
              <CardContent className="flex gap-3 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ins.icon className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{ins.title}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{ins.text}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
