import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, ClipboardList, Package, Target } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { ChartCard, CHART_COLORS, ChartTooltip, ChartLegend } from '@/components/shared/chart'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'
import { tickets, technicianStats } from '@/data/tickets'

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const PRIORITY_LABEL = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }

const vanInventory = [
  { part: 'CCS2 latch actuator', sku: 'CCS2-LA-04', stock: 3 },
  { part: 'LTE modem', sku: 'NET-LTE-2', stock: 2 },
  { part: 'HMI controller board', sku: 'HMI-CB-7', stock: 1, low: true },
  { part: 'Air filter kit', sku: 'PM-AF-12', stock: 8 },
]

function dueChip(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function dueDay(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const unresolved = tickets.filter((t) => t.status !== 'RESOLVED')

  const schedule = [...unresolved].sort((a, b) => new Date(a.slaDueAt) - new Date(b.slaDueAt))

  const priorityData = PRIORITIES.map((p) => ({
    name: PRIORITY_LABEL[p],
    value: unresolved.filter((t) => t.priority === p).length,
  })).filter((d) => d.value > 0)

  const recentActivity = tickets
    .flatMap((t) => t.activity.map((a) => ({ ...a, ticketId: t.id })))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Technician dashboard"
        description="Your assignments, SLA schedule and van stock at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Assigned" value={technicianStats.assigned} icon={ClipboardList} index={0} />
        <StatCard label="Due today" value={technicianStats.dueToday} icon={CalendarClock} index={1} />
        <StatCard
          label="Resolved this week"
          value={technicianStats.resolvedThisWeek}
          icon={CheckCircle2}
          index={2}
        />
        <StatCard
          label="First-time fix rate"
          value={`${technicianStats.firstTimeFixRate}%`}
          icon={Target}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s schedule</CardTitle>
            <CardDescription>Unresolved jobs ordered by SLA due time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {schedule.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.05 }}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
              >
                <span className="inline-flex w-fit shrink-0 flex-col items-center rounded-md bg-primary/10 px-2.5 py-1 text-primary">
                  <span className="font-mono text-xs font-medium">{dueChip(t.slaDueAt)}</span>
                  <span className="text-[10px] leading-tight">{dueDay(t.slaDueAt)}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.stationName} · {t.connectorLabel}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={t.priority} />
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/technician/tickets/${t.id}`}>Open</Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <ChartCard title="Priority breakdown" description="Unresolved tickets" height={180}>
            <div className="flex h-full items-center gap-4">
              <div className="h-full w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius="60%"
                      outerRadius="90%"
                      paddingAngle={2}
                      stroke="var(--card)"
                    >
                      {priorityData.map((entry, i) => (
                        <Cell key={entry.name} fill={CHART_COLORS[i]} />
                      ))}
                    </Pie>
                    <RTooltip
                      content={<ChartTooltip formatter={(v) => `${v} tickets`} />}
                      cursor={{ stroke: 'var(--chart-axis)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                className="flex-col items-start gap-2"
                items={priorityData.map((d, i) => ({
                  label: `${d.name} (${d.value})`,
                  color: CHART_COLORS[i],
                }))}
              />
            </div>
          </ChartCard>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Van inventory</CardTitle>
              <CardDescription>Spare parts on board</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {vanInventory.map((item) => (
                <div key={item.sku} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.part}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.low && <Badge variant="warning">Low stock</Badge>}
                    <span className="text-sm font-medium tabular-nums">×{item.stock}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Latest updates across your tickets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentActivity.map((a, i) => (
            <div key={`${a.ticketId}-${i}`} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
              <div className="min-w-0 flex-1">
                <p>
                  <span className="font-medium">{a.who}</span>{' '}
                  <span className="text-muted-foreground">{a.what}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{a.ticketId}</span> · {formatDateTime(a.at)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
