import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plug,
  Loader2,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { ChartCard, CHART_COLORS, ChartTooltip, ChartLegend } from '@/components/shared/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDate, formatNumber } from '@/lib/utils'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchConnectors, fetchStations, updateConnectorStatus } from '@/lib/api/stations'

const PAGE_SIZE = 10
const STATUSES = ['AVAILABLE', 'RESERVED', 'OCCUPIED', 'FAULTED']
const STATUS_LABEL = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  OCCUPIED: 'Occupied',
  FAULTED: 'Faulted',
}

export default function Connectors() {
  const board = useQueries({ connectors: fetchConnectors, stations: fetchStations })
  const list = useMemo(() => board.data?.connectors ?? [], [board.data])
  const stations = board.data?.stations ?? []

  const [actionError, setActionError] = useState(null)
  const [query, setQuery] = useState('')
  const [stationFilter, setStationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [restarting, setRestarting] = useState([])
  const [ticketFor, setTicketFor] = useState(null)

  const counts = useMemo(() => {
    const c = { AVAILABLE: 0, RESERVED: 0, OCCUPIED: 0, FAULTED: 0 }
    for (const item of list) c[item.status] = (c[item.status] ?? 0) + 1
    return c
  }, [list])

  const donutData = STATUSES.map((s) => ({ name: STATUS_LABEL[s], value: counts[s] }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((c) => {
      const matchesQuery =
        !q ||
        c.label.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.stationName.toLowerCase().includes(q)
      const matchesStation = stationFilter === 'all' || c.stationId === stationFilter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesQuery && matchesStation && matchesStatus
    })
  }, [list, query, stationFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const setStatus = async (id, status) => {
    setActionError(null)
    try {
      await updateConnectorStatus(id, status)
      board.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  // The restart is still simulated — there is no OCPP link behind this button
  // yet. The state it writes back afterwards is real.
  const restart = (id) => {
    setRestarting((prev) => [...prev, id])
    setTimeout(async () => {
      await setStatus(id, 'AVAILABLE')
      setRestarting((prev) => prev.filter((x) => x !== id))
    }, 1500)
  }

  const toggleOnline = (connector) => {
    setStatus(connector.id, connector.status === 'FAULTED' ? 'AVAILABLE' : 'FAULTED')
  }

  if (board.loading && !board.data) return <LoadingRows rows={8} />
  if (board.error) {
    return <ErrorState error={board.error} onRetry={board.refetch} title="Could not load connectors" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Connectors"
        description="Every charging bay you operate — type, power rating and current status."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total connectors" value={list.length} icon={Plug} index={0} />
        <StatCard label="Available" value={counts.AVAILABLE} icon={CheckCircle2} index={1} />
        <StatCard label="Occupied" value={counts.OCCUPIED} icon={BatteryCharging} index={2} />
        <StatCard
          label="Faulted"
          value={counts.FAULTED}
          deltaGoodWhen="down"
          icon={AlertTriangle}
          index={3}
        />
      </div>

      <ChartCard
        title="Status distribution"
        description="Connector states across the network"
        height={220}
      >
        <div className="flex h-full flex-col items-center gap-4 sm:flex-row">
          <div className="h-full w-full sm:w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                  stroke="var(--card)"
                >
                  {donutData.map((entry, i) => (
                    <Cell key={entry.name} fill={CHART_COLORS[i]} />
                  ))}
                </Pie>
                <RTooltip
                  content={<ChartTooltip formatter={(v) => `${v} connectors`} />}
                  cursor={{ stroke: 'var(--chart-axis)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            className="flex-col items-start gap-2"
            items={donutData.map((d, i) => ({
              label: `${d.name} (${d.value})`,
              color: CHART_COLORS[i],
            }))}
          />
        </div>
      </ChartCard>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Search bay label or station…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-3">
              <Select
                value={stationFilter}
                onValueChange={(v) => {
                  setStationFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stations</SelectItem>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Connector</TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Power kW</TableHead>
                <TableHead className="text-right">Energy today</TableHead>
                <TableHead className="text-right">Uptime</TableHead>
                <TableHead>Last serviced</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((c) => {
                const isRestarting = restarting.includes(c.id)
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{c.label}</span>
                        <span className="text-xs text-muted-foreground">{c.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.stationName}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.powerKw}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.energyTodayKwh)} kWh
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        c.uptimePct < 90 && 'font-medium text-status-critical'
                      )}
                    >
                      {c.uptimePct}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.lastServiced)}
                    </TableCell>
                    <TableCell>
                      {isRestarting ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Restarting…
                        </span>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Connector actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={isRestarting} onClick={() => restart(c.id)}>
                            Restart connector
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleOnline(c)}>
                            {c.status === 'FAULTED' ? 'Bring online' : 'Take offline'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setTicketFor(c)}>
                            Raise ticket
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No connectors match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {pageRows.length} of {filtered.length} connectors
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!ticketFor} onOpenChange={(open) => !open && setTicketFor(null)}>
        <DialogContent>
          {ticketFor && (
            <>
              <DialogHeader>
                <DialogTitle>Fault ticket raised</DialogTitle>
                <DialogDescription>
                  A maintenance ticket has been created and queued for maintenance assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-xl border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Connector</span>
                  <span className="font-medium">
                    {ticketFor.label} · {ticketFor.type}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Station</span>
                  <span className="font-medium">{ticketFor.stationName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Source</span>
                  <span className="font-medium">Operator console</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status="OPEN" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setTicketFor(null)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
