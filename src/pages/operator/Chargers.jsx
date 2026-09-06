import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Plug,
  Radio,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { CHART_COLORS, ChartCard, ChartLegend, ChartTooltip } from '@/components/shared/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
import { useKioskTelemetry } from '@/lib/kiosk-broadcast'

const PAGE_SIZE = 10

/**
 * The four states a bay can be in (SRS §7.1). This board used to carry
 * `offline` and `maintenance` too, which are *station* states, not bay states —
 * a bay at a site under maintenance now reads FAULTED, which is what the
 * `connectors` table stores.
 *
 * Fixed order: it drives both the donut slices and the CHART_COLORS slots.
 */
const STATUSES = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'FAULTED']

const STATUS_LABEL = {
  AVAILABLE: 'Available',
  OCCUPIED: 'In use',
  RESERVED: 'Reserved',
  FAULTED: 'Faulted',
}

export default function Chargers() {
  const board = useQueries({ connectors: fetchConnectors, stations: fetchStations })
  const telemetry = useKioskTelemetry()
  const list = useMemo(() => {
    const raw = board.data?.connectors ?? []
    if (!telemetry || !telemetry.connectorId) return raw
    return raw.map((c) => {
      if (c.id === telemetry.connectorId) {
        let twinStatus = c.status
        if (telemetry.kioskState === 'FAULTED') twinStatus = 'FAULTED'
        else if (['PLUGGED', 'CHARGING'].includes(telemetry.kioskState)) twinStatus = 'OCCUPIED'
        else if (telemetry.kioskState === 'IDLE') twinStatus = 'AVAILABLE'
        return {
          ...c,
          status: twinStatus,
          energyTodayKwh: (c.energyTodayKwh || 0) + (telemetry.chargingKwh || 0),
        }
      }
      return c
    })
  }, [board.data, telemetry])
  const stations = board.data?.stations ?? []

  const [actionError, setActionError] = useState(null)
  const [query, setQuery] = useState('')
  const [stationFilter, setStationFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [restarting, setRestarting] = useState([])
  const [ticketFor, setTicketFor] = useState(null)

  const counts = useMemo(() => {
    const acc = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    for (const c of list) acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, [list])

  const donutData = STATUSES.map((s) => ({ name: STATUS_LABEL[s], value: counts[s] }))

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list.filter((c) => {
      const matchesQuery =
        !q || c.label.toLowerCase().includes(q) || c.stationName.toLowerCase().includes(q)
      const matchesStation = stationFilter === 'all' || c.stationId === stationFilter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      return matchesQuery && matchesStation && matchesStatus
    })
  }, [list, query, stationFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const startIndex = (currentPage - 1) * PAGE_SIZE
  const pageRows = filtered.slice(startIndex, startIndex + PAGE_SIZE)
  const rangeFrom = filtered.length === 0 ? 0 : startIndex + 1
  const rangeTo = startIndex + pageRows.length

  const setStatus = async (id, status) => {
    setActionError(null)
    try {
      await updateConnectorStatus(id, status)
      board.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  // The restart itself is still simulated — there is no OCPP link behind this
  // button yet. What it writes back afterwards is real.
  const restart = (id) => {
    setRestarting((prev) => [...prev, id])
    setTimeout(async () => {
      await setStatus(id, 'AVAILABLE')
      setRestarting((prev) => prev.filter((x) => x !== id))
    }, 1500)
  }

  const toggleOnline = (charger) =>
    setStatus(charger.id, charger.status === 'FAULTED' ? 'AVAILABLE' : 'FAULTED')

  const resetPage = (fn) => (value) => {
    fn(value)
    setPage(1)
  }

  if (board.loading && !board.data) return <LoadingRows rows={8} />
  if (board.error) {
    return <ErrorState error={board.error} onRetry={board.refetch} title="Could not load chargers" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Chargers"
        description="Every stall across the stations you operate — power rating, throughput and live status."
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-xs">
            <Link to="/operator/kiosk">
              <Radio className="h-3.5 w-3.5 text-primary animate-pulse" /> Kiosk Simulator
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total chargers"
          value={list.length}
          delta={4}
          deltaLabel="vs last month"
          icon={Plug}
          index={0}
        />
        <StatCard
          label="Available"
          value={counts.AVAILABLE}
          delta={6}
          deltaLabel="vs last month"
          icon={CheckCircle2}
          index={1}
        />
        <StatCard
          label="In use"
          value={counts.OCCUPIED}
          delta={9}
          deltaLabel="vs last month"
          icon={BatteryCharging}
          index={2}
        />
        <StatCard
          label="Faulted"
          value={counts.FAULTED}
          delta={-12}
          deltaLabel="vs last month"
          deltaGoodWhen="down"
          icon={AlertTriangle}
          index={3}
        />
      </div>

      <ChartCard
        title="Status distribution"
        description="How the fleet of stalls is currently split"
        height={240}
      >
        <div className="flex h-full flex-col items-center gap-6 sm:flex-row">
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
                  content={<ChartTooltip formatter={(v) => `${v} chargers`} />}
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
              placeholder="Search charger or station…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              className="sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-3 sm:ml-auto">
              <Select value={stationFilter} onValueChange={resetPage(setStationFilter)}>
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
              <Select value={statusFilter} onValueChange={resetPage(setStatusFilter)}>
                <SelectTrigger className="w-[170px]">
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
                <TableHead>Charger</TableHead>
                <TableHead>Station</TableHead>
                <TableHead className="text-right">Power kW</TableHead>
                <TableHead className="text-right">Energy today</TableHead>
                <TableHead className="text-right">Uptime</TableHead>
                <TableHead>Last service</TableHead>
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
                    <TableCell className="text-sm text-muted-foreground">{c.stationName}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.power}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(c.energyToday)} kWh
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        c.uptime < 90 && 'font-medium text-status-critical'
                      )}
                    >
                      {c.uptime}%
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.lastService)}
                    </TableCell>
                    <TableCell>
                      {isRestarting ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Restarting…
                        </span>
                      ) : (
                        <StatusBadge status={c.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Charger actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled={isRestarting} onClick={() => restart(c.id)}>
                            Restart
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleOnline(c)}>
                            {c.status === 'FAULTED' ? 'Return to service' : 'Take out of service'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setTicketFor(c)}>
                            Create ticket
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
                    No chargers match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-xs tabular-nums text-muted-foreground">
              {rangeFrom}–{rangeTo} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
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
                <DialogTitle>Ticket raised</DialogTitle>
                <DialogDescription>
                  A maintenance ticket has been created and queued for maintenance assignment.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-xl border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Charger</span>
                  <span className="font-medium">
                    {ticketFor.label} · {ticketFor.type} {ticketFor.power} kW
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Station</span>
                  <span className="font-medium">{ticketFor.stationName}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Raised from</span>
                  <span className="font-medium">Operator console</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status="open" />
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
