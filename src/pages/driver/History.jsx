import * as React from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import { BatteryCharging, Zap, DollarSign, Receipt, SearchX } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchChargingHistory } from '@/lib/api/sessions'
import { fetchMonthlyUsage } from '@/lib/api/analytics'

const TAX_RATE = 0.08

const STATUS_LABELS = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

/** Receipt is derived from the session itself: energy × rate, no idle time, 8% tax. */
function receiptFor(session) {
  const energyCost = session.cost
  const idleFee = 0
  const tax = energyCost * TAX_RATE
  return {
    ratePerKwh: session.energy > 0 ? energyCost / session.energy : 0,
    energyCost,
    idleFee,
    tax,
    total: energyCost + idleFee + tax,
  }
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold tabular-nums' : 'font-medium tabular-nums'}>
        {value}
      </span>
    </div>
  )
}

export default function History() {
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState('all')
  const [selected, setSelected] = React.useState(null)

  const data = useQueries({
    history: () => fetchChargingHistory({ limit: 200 }),
    usage: fetchMonthlyUsage,
  })
  const chargingHistory = React.useMemo(() => data.data?.history ?? [], [data.data])
  const monthlyUsage = data.data?.usage ?? []

  const totals = React.useMemo(() => {
    const energy = chargingHistory.reduce((sum, s) => sum + s.energy, 0)
    const spent = chargingHistory.reduce((sum, s) => sum + s.cost, 0)
    return {
      sessions: chargingHistory.length,
      energy,
      spent,
      avg: chargingHistory.length ? spent / chargingHistory.length : 0,
    }
  }, [chargingHistory])

  // The status filter offers only the statuses this account actually has.
  const statuses = React.useMemo(
    () => [...new Set(chargingHistory.map((s) => s.status))],
    [chargingHistory]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return chargingHistory.filter((s) => {
      const matchesQuery = !q || s.station.toLowerCase().includes(q)
      const matchesStatus = status === 'all' || s.status === status
      return matchesQuery && matchesStatus
    })
  }, [chargingHistory, query, status])

  const receipt = selected ? receiptFor(selected) : null

  if (data.loading && !data.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={8} />
      </div>
    )
  }
  if (data.error) {
    return <ErrorState error={data.error} onRetry={data.refetch} title="Could not load your history" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Charging history"
        description="Every session on this account, with the receipt for each one."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Total sessions" value={totals.sessions} icon={Zap} />
        <StatCard
          index={1}
          label="Total energy"
          value={`${totals.energy.toFixed(1)} kWh`}
          icon={BatteryCharging}
        />
        <StatCard
          index={2}
          label="Total spent"
          value={formatCurrency(totals.spent)}
          icon={DollarSign}
        />
        <StatCard
          index={3}
          label="Average per session"
          value={formatCurrency(totals.avg)}
          icon={Receipt}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Energy delivered by month" description="kWh charged" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyUsage}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${v} kWh`} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Bar
                dataKey="energy"
                name="Energy"
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Spend by month" description="Charging costs" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyUsage}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="month" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Line
                type="monotone"
                dataKey="cost"
                name="Spend"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search by station…"
          className="w-full sm:w-72"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {chargingHistory.length} sessions
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No sessions match your filters"
          description="Try a different station name or clear the status filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setStatus('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Energy</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setSelected(s)}>
                    <TableCell className="font-mono text-xs">{s.id}</TableCell>
                    <TableCell className="font-medium">
                      {s.station}
                      <span className="block text-xs font-normal text-muted-foreground">
                        {s.connector}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(s.date)}
                    </TableCell>
                    <TableCell className="tabular-nums">{s.duration}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.energy} kWh</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(s.cost)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Select any row to open its receipt.
      </p>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Session {selected?.id}
            </DialogTitle>
            <DialogDescription>
              {selected?.station} · {selected ? formatDateTime(selected.date) : ''}
            </DialogDescription>
          </DialogHeader>
          {selected && receipt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selected.connector} · {selected.duration}
                </span>
                <StatusBadge status={selected.status} />
              </div>
              <Separator />
              <Row
                label={`Energy · ${selected.energy} kWh @ ${formatCurrency(receipt.ratePerKwh)}/kWh`}
                value={formatCurrency(receipt.energyCost)}
              />
              <Row label="Idle fee" value="$0.00" />
              <Row label="Tax (8%)" value={formatCurrency(receipt.tax)} />
              <Separator />
              <Row label="Total" value={formatCurrency(receipt.total)} strong />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
