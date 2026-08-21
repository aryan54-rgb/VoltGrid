import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Truck, BatteryCharging, Zap, DollarSign, AlertTriangle, ArrowRight } from 'lucide-react'
import {
  ResponsiveContainer,
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
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchVehicles } from '@/lib/api/fleet'
import { fetchFleetEnergyByWeek } from '@/lib/api/analytics'
import { cn, formatNumber } from '@/lib/utils'

const STATUS_ORDER = ['active', 'charging', 'idle', 'maintenance']
const STATUS_LABELS = {
  active: 'On route',
  charging: 'Charging',
  idle: 'Idle',
  maintenance: 'Maintenance',
}

export default function Dashboard() {
  const query = useQueries({ vehicles: fetchVehicles, energy: fetchFleetEnergyByWeek })
  const fleetVehicles = query.data?.vehicles ?? []
  const fleetEnergyByWeek = query.data?.energy ?? []

  const avgSoc = fleetVehicles.length
    ? Math.round(fleetVehicles.reduce((s, v) => s + v.soc, 0) / fleetVehicles.length)
    : 0
  const lastWeek = fleetEnergyByWeek[fleetEnergyByWeek.length - 1]
  const weekEnergy = lastWeek ? lastWeek.depot + lastWeek.public : 0

  const statusData = STATUS_ORDER.map((status, i) => ({
    name: STATUS_LABELS[status],
    value: fleetVehicles.filter((v) => v.status === status).length,
    color: CHART_COLORS[i],
  }))

  const attention = fleetVehicles.filter((v) => v.soc < 20 || v.status === 'maintenance')
  const snapshot = fleetVehicles.slice(0, 5)

  if (query.loading && !query.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={6} />
      </div>
    )
  }
  if (query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} title="Could not load your fleet" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet dashboard"
        description="Swift Logistics · live overview of your electric fleet"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fleet vehicles" value={fleetVehicles.length} delta={9} deltaLabel="vs last quarter" icon={Truck} index={0} />
        <StatCard label="Average state of charge" value={`${avgSoc}%`} delta={4} icon={BatteryCharging} index={1} />
        <StatCard label="Energy this week" value={`${formatNumber(weekEnergy)} kWh`} delta={5.7} deltaLabel="vs last week" icon={Zap} index={2} />
        <StatCard label="Estimated cost this month" value="$12.4k" delta={-2.1} deltaGoodWhen="down" icon={DollarSign} index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Weekly energy by source"
          description="Depot vs public charging, kWh"
          className="lg:col-span-2"
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
            <BarChart data={fleetEnergyByWeek} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="week" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${formatNumber(v)} kWh`} />}
                cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
              />
              <Bar dataKey="depot" name="Depot" stackId="energy" fill={CHART_COLORS[0]} maxBarSize={28} />
              <Bar
                dataKey="public"
                name="Public"
                stackId="energy"
                fill={CHART_COLORS[1]}
                maxBarSize={28}
                stroke="var(--card)"
                strokeWidth={2}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Fleet status</CardTitle>
            <CardDescription>Vehicles by current state</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative mx-auto h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="var(--card)"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip content={<ChartTooltip formatter={(v) => `${v} vehicles`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tracking-tight">{fleetVehicles.length}</span>
                <span className="text-xs text-muted-foreground">vehicles</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {statusData.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-medium tabular-nums">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-status-critical" />
                Attention needed
              </CardTitle>
              <CardDescription>Low state of charge or in service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {attention.map((v) => (
                <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium">
                      {v.id} <span className="font-normal text-muted-foreground">· {v.model}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {v.status === 'maintenance'
                        ? 'In the service centre — awaiting repair'
                        : `State of charge at ${v.soc}% · ${v.rangeKm} km of range left`}
                    </p>
                    <div className="pt-1">
                      <StatusBadge status={v.status} label={STATUS_LABELS[v.status]} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button variant="ghost" size="sm">
                      Charge now
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/fleet/vehicles">View</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  Live vehicle snapshot
                </CardTitle>
                <CardDescription>State of charge and position right now</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/fleet/vehicles">
                  All vehicles
                  <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>State of charge</TableHead>
                    <TableHead>Range</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {snapshot.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.id}</TableCell>
                      <TableCell className="text-muted-foreground">{v.driver}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={v.soc}
                            className="h-1.5 w-14"
                            indicatorClassName={cn(v.soc < 20 && 'bg-status-critical')}
                          />
                          <span className="text-xs tabular-nums text-muted-foreground">{v.soc}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums">{v.rangeKm} km</TableCell>
                      <TableCell className="text-muted-foreground">{v.location}</TableCell>
                      <TableCell>
                        <StatusBadge status={v.status} label={STATUS_LABELS[v.status]} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
