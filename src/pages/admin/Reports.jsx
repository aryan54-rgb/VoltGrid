import { useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip } from 'recharts'
import {
  DollarSign, Activity, TrendingUp, Leaf, Truck, AlertTriangle,
  Download, Check, Loader2, ArrowUpRight, FileBarChart,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { CHART_COLORS, ChartTooltip, ChartCard, ChartLegend } from '@/components/shared/chart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { energyMix, regionPerformance } from '@/data/analytics'
import { formatCurrency, formatDate, cn } from '@/lib/utils'

/** Exportable reports available for analysis. */
const REPORTS = [
  { id: 'revenue', title: 'Revenue summary', icon: DollarSign, description: 'Gross revenue, refunds and net take by billing mode.', generated: '2026-07-29' },
  { id: 'uptime', title: 'Station uptime', icon: Activity, description: 'Availability, fault counts and MTTR for every station.', generated: '2026-07-29' },
  { id: 'growth', title: 'User growth', icon: TrendingUp, description: 'Signups, activation and retention cohorts by month.', generated: '2026-07-28' },
  { id: 'energy', title: 'Energy & sustainability', icon: Leaf, description: 'kWh delivered, energy mix and CO₂ avoided.', generated: '2026-07-27' },
  { id: 'fleet', title: 'Fleet consolidated billing', icon: Truck, description: 'Postpaid fleet invoices, consumption and outstanding balances.', generated: '2026-07-26' },
  { id: 'incidents', title: 'Incident & fault log', icon: AlertTriangle, description: 'Fault tickets, SLA breaches and resolution timelines.', generated: '2026-07-29' },
]

const INITIAL_SCHEDULES = [
  { id: 'sr-1', name: 'Weekly executive digest', cadence: 'Weekly', recipients: 'exec@voltgrid.com', enabled: true },
  { id: 'sr-2', name: 'Monthly revenue close', cadence: 'Monthly', recipients: 'finance@voltgrid.com', enabled: true },
  { id: 'sr-3', name: 'Daily uptime snapshot', cadence: 'Daily', recipients: 'ops@voltgrid.com', enabled: false },
]

const TOTAL_MIX = energyMix.reduce((sum, e) => sum + e.value, 0)

export default function Reports() {
  const [period, setPeriod] = useState('30d')
  const [generating, setGenerating] = useState('idle')
  const [downloaded, setDownloaded] = useState({})
  const [schedules, setSchedules] = useState(INITIAL_SCHEDULES)

  const generate = () => {
    setGenerating('loading')
    setTimeout(() => {
      setGenerating('done')
      setTimeout(() => setGenerating('idle'), 2000)
    }, 1200)
  }

  const download = (id) => {
    setDownloaded((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => setDownloaded((prev) => ({ ...prev, [id]: false })), 1800)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate, export and schedule network-wide reports."
        actions={
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last quarter</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={generate} disabled={generating === 'loading'}>
              {generating === 'loading' ? (
                <><Loader2 className="animate-spin" /> Generating…</>
              ) : generating === 'done' ? (
                <><Check /> Report ready</>
              ) : (
                <><FileBarChart /> Generate report</>
              )}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => (
          <Card key={r.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <r.icon className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">{r.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="text-sm text-muted-foreground">{r.description}</p>
              <p className="mt-auto text-xs text-muted-foreground">
                Last generated {formatDate(r.generated)}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => download(r.id)}>
                  {downloaded[r.id] ? <><Check /> Downloaded</> : <><Download /> Download</>}
                </Button>
                <Button variant="ghost" size="sm">View</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regional performance</CardTitle>
            <CardDescription>Stations, uptime, revenue and growth by region</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Region</TableHead>
                  <TableHead className="text-right">Stations</TableHead>
                  <TableHead className="text-right">Uptime %</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Growth %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regionPerformance.map((r) => (
                  <TableRow key={r.region}>
                    <TableCell className="font-medium text-foreground">{r.region}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.stations}</TableCell>
                    <TableCell className="text-right">
                      {r.uptimePct < 97 ? (
                        <Badge variant="warning">{r.uptimePct}%</Badge>
                      ) : (
                        <span className="tabular-nums">{r.uptimePct}%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(r.revenue)}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center gap-0.5 tabular-nums text-[var(--delta-good)]">
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        {r.growthPct}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ChartCard title="Energy mix" description="Share of energy delivered by source" height={280}>
          <div className="flex h-full items-center gap-6">
            <div className="relative h-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={energyMix}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="var(--card)"
                  >
                    {energyMix.map((e, i) => (
                      <Cell key={e.name} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <RTooltip content={<ChartTooltip formatter={(v) => `${Math.round((v / TOTAL_MIX) * 100)}%`} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-semibold text-foreground">45M</span>
                <span className="text-xs text-muted-foreground">kWh</span>
              </div>
            </div>
            <ChartLegend
              className="flex-col items-start gap-2"
              items={energyMix.map((e, i) => ({ label: e.name, color: CHART_COLORS[i] }))}
            />
          </div>
        </ChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled reports</CardTitle>
          <CardDescription>Automatic delivery to stakeholder inboxes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedules.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium', s.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                    {s.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{s.recipients}</p>
                </div>
                <Badge variant="secondary">{s.cadence}</Badge>
              </div>
              <Switch
                checked={s.enabled}
                onCheckedChange={(v) =>
                  setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, enabled: v } : x)))
                }
                aria-label={`Toggle ${s.name}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
