import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Layers, CheckCircle2, Pencil, Ban, MoreHorizontal } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { useAuth } from '@/context/auth'
import {
  createScheduleEntries,
  fetchChargingSchedule,
  fetchDepotPowerLimit,
  fetchVehicles,
  updateScheduleEntry,
  updateScheduleStatus,
} from '@/lib/api/fleet'
import { cn } from '@/lib/utils'

const NIGHTS = ['2026-07-30', '2026-07-31']
const BAYS = ['A1', 'A2', 'A3', 'A4']
const WINDOW_MINUTES = 600 // 20:00 → 06:00
const WINDOW_START_HOUR = 20
const KW_PER_VEHICLE = 60
const HOURS = Array.from({ length: 11 }, (_, i) => (WINDOW_START_HOUR + i) % 24)
const START_OPTIONS = ['20:00', '21:00', '22:00', '23:00', '00:00']
const SLOT_MINUTES = 45
const DEFAULT_DURATION = 90

/** Minutes since 20:00, wrapping past midnight. */
function toOffset(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  let mins = h * 60 + m - WINDOW_START_HOUR * 60
  if (mins < 0) mins += 1440
  return mins
}

function fromOffset(offset) {
  const total = (WINDOW_START_HOUR * 60 + offset) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function span(row) {
  const start = toOffset(row.start)
  let end = toOffset(row.end)
  if (end <= start) end += 1440
  return { start, end: Math.min(end, WINDOW_MINUTES) }
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

export default function Schedule() {
  const { profile } = useAuth()
  const board = useQueries({
    schedule: fetchChargingSchedule,
    vehicles: fetchVehicles,
    limit: fetchDepotPowerLimit,
  })
  const rows = useMemo(() => board.data?.schedule ?? [], [board.data])
  const fleetVehicles = useMemo(() => board.data?.vehicles ?? [], [board.data])
  const depotPowerLimitKw = board.data?.limit ?? 300

  const [actionError, setActionError] = useState(null)
  const [night, setNight] = useState(NIGHTS[0])
  const [bulkOpen, setBulkOpen] = useState(false)
  const [picked, setPicked] = useState({})
  const [targetSoc, setTargetSoc] = useState('90')
  const [windowStart, setWindowStart] = useState('22:00')
  const [result, setResult] = useState(null)
  const [editRow, setEditRow] = useState(null)
  const [editStart, setEditStart] = useState('22:00')
  const [editTarget, setEditTarget] = useState('90')

  const nightRows = useMemo(() => rows.filter((r) => r.night === night), [rows, night])
  const timelineRows = nightRows.filter((r) => r.status !== 'CANCELLED')

  /** Vehicles worth scheduling tonight: idle at the depot or running low. */
  const candidates = useMemo(
    () => fleetVehicles.filter((v) => v.status !== 'maintenance' && (v.status === 'idle' || v.soc < 40)),
    [fleetVehicles]
  )

  /** Concurrent depot draw per hour, assuming 60 kW per charging vehicle. */
  const load = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const slotStart = i * 60
        const slotEnd = slotStart + 60
        const concurrent = timelineRows.filter((r) => {
          const s = span(r)
          return s.start < slotEnd && s.end > slotStart
        }).length
        return { hour: `${pad2((WINDOW_START_HOUR + i) % 24)}:00`, kw: concurrent * KW_PER_VEHICLE }
      }),
    [timelineRows]
  )

  const pickedIds = Object.keys(picked).filter((id) => picked[id])

  async function confirmBulk() {
    if (pickedIds.length === 0) return
    const baseOffset = toOffset(windowStart)
    // Vans are staggered by one slot each and spread round-robin across the
    // bays, which is what keeps the concurrent draw under the site limit.
    const additions = pickedIds.map((vehicleId, i) => {
      const start = baseOffset + i * SLOT_MINUTES
      return {
        id: `SCH-B${Date.now().toString(36).toUpperCase()}-${i}`,
        company: profile?.company ?? 'Swift Logistics',
        vehicleId,
        connectorLabel: BAYS[i % BAYS.length],
        start: fromOffset(start),
        end: fromOffset(start + DEFAULT_DURATION),
        targetSocPct: Number(targetSoc),
        night,
      }
    })
    setActionError(null)
    setPicked({})
    setBulkOpen(false)
    try {
      await createScheduleEntries(additions)
      board.refetch()
      const bays = new Set(additions.map((a) => a.connectorLabel)).size
      setResult(
        `${additions.length} vehicle${additions.length === 1 ? '' : 's'} scheduled across ${bays} bay${bays === 1 ? '' : 's'}`
      )
    } catch (err) {
      setActionError(err)
    }
  }

  async function saveEdit() {
    const s = span(editRow)
    const duration = Math.max(30, s.end - s.start)
    const start = toOffset(editStart)
    const id = editRow.id
    setEditRow(null)
    setActionError(null)
    try {
      await updateScheduleEntry(id, {
        start: fromOffset(start),
        end: fromOffset(start + duration),
        targetSocPct: Number(editTarget),
      })
      board.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  async function cancelRow(id) {
    setActionError(null)
    try {
      await updateScheduleStatus(id, 'CANCELLED')
      board.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  const peak = load.reduce((m, d) => Math.max(m, d.kw), 0)

  if (board.loading && !board.data) return <LoadingRows rows={8} />
  if (board.error) {
    return <ErrorState error={board.error} onRetry={board.refetch} title="Could not load the depot schedule" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Depot charging schedule"
        description="Bulk-schedule overnight charging across the depot's four bays"
        actions={
          <>
            <div className="flex items-center gap-1 rounded-lg border bg-card p-1">
              {NIGHTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNight(n)}
                  className={cn(
                    'cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                    night === n ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <Button onClick={() => setBulkOpen(true)}>
              <Layers />
              Bulk schedule
            </Button>
          </>
        }
      />

      <p className="text-sm text-muted-foreground">
        Bulk scheduling staggers overnight charging so the depot stays under its site power limit.
      </p>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between gap-3 rounded-lg border border-status-good/40 bg-status-good/10 px-4 py-3 text-sm"
          >
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="h-4 w-4 text-status-good" />
              {result}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setResult(null)}>
              Dismiss
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overnight timeline</CardTitle>
          <CardDescription>
            Charging windows for the night of {night} · peak draw {peak} kW of {depotPowerLimitKw} kW
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="flex items-end gap-3">
                <div className="w-20 shrink-0" />
                <div className="relative h-5 flex-1">
                  {HOURS.map((h, i) => (
                    <span
                      key={h}
                      className="absolute -translate-x-1/2 text-[10px] tabular-nums text-muted-foreground"
                      style={{ left: `${(i / (HOURS.length - 1)) * 100}%` }}
                    >
                      {pad2(h)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-1 space-y-2">
                {timelineRows.map((r, i) => {
                  const s = span(r)
                  const left = (s.start / WINDOW_MINUTES) * 100
                  const width = Math.max(2, ((s.end - s.start) / WINDOW_MINUTES) * 100)
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 text-xs font-medium tabular-nums">{r.vehicleId}</span>
                      <div className="relative h-7 flex-1 rounded-md bg-secondary/60">
                        {HOURS.map((h, hi) => (
                          <span
                            key={h}
                            className="absolute top-0 h-full w-px bg-border/60"
                            style={{ left: `${(hi / (HOURS.length - 1)) * 100}%` }}
                          />
                        ))}
                        <motion.div
                          initial={{ opacity: 0, scaleX: 0.6 }}
                          animate={
                            r.status === 'ACTIVE'
                              ? { opacity: [1, 0.72, 1], scaleX: 1 }
                              : { opacity: 1, scaleX: 1 }
                          }
                          transition={
                            r.status === 'ACTIVE'
                              ? { opacity: { duration: 2.2, repeat: Infinity }, scaleX: { duration: 0.3 } }
                              : { duration: 0.3, delay: i * 0.03 }
                          }
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            background: CHART_COLORS[0],
                            transformOrigin: 'left',
                          }}
                          className="absolute top-1 flex h-5 items-center overflow-hidden rounded px-2"
                        >
                          <span className="truncate text-[10px] font-medium tabular-nums text-white">
                            {r.start}–{r.end} · {r.connectorLabel}
                          </span>
                        </motion.div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ChartCard
        title="Depot load"
        description={`Concurrent draw per hour at ${KW_PER_VEHICLE} kW per charging vehicle`}
        height={260}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={load}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="hour" {...axisProps} />
            <YAxis {...axisProps} width={48} domain={[0, depotPowerLimitKw + 60]} />
            <RTooltip
              content={<ChartTooltip formatter={(v) => `${v} kW`} />}
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
            />
            <ReferenceLine
              y={depotPowerLimitKw}
              stroke="var(--status-critical)"
              strokeDasharray="4 4"
              label={{ value: 'Site limit', position: 'insideTopRight', fill: 'var(--chart-muted)', fontSize: 11 }}
            />
            <Bar dataKey="kw" name="Depot load" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheduled sessions</CardTitle>
          <CardDescription>{nightRows.length} windows booked for {night}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Schedule</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Bay</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Target SoC</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {nightRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.id}</TableCell>
                  <TableCell>{r.vehicleId}</TableCell>
                  <TableCell className="text-muted-foreground">{r.connectorLabel}</TableCell>
                  <TableCell className="tabular-nums">
                    {r.start}–{r.end}
                  </TableCell>
                  <TableCell className="tabular-nums">{r.targetSocPct}%</TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" disabled={r.status === 'CANCELLED'}>
                          <MoreHorizontal />
                          <span className="sr-only">Actions for {r.id}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditStart(r.start)
                            setEditTarget(String(r.targetSocPct))
                            setEditRow(r)
                          }}
                        >
                          <Pencil />
                          Modify
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-status-critical focus:text-status-critical"
                          onSelect={() => cancelRow(r.id)}
                        >
                          <Ban />
                          Cancel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk schedule */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk schedule</DialogTitle>
            <DialogDescription>
              Select vehicles for {night}. Windows are staggered {SLOT_MINUTES} minutes apart across the four bays.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Vehicles</Label>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border p-1">
                {candidates.map((v) => (
                  <label
                    key={v.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {v.id} <span className="font-normal text-muted-foreground">· {v.model}</span>
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {v.socPct}% · {v.location}
                      </span>
                    </span>
                    <Switch
                      checked={!!picked[v.id]}
                      onCheckedChange={(checked) => setPicked((p) => ({ ...p, [v.id]: checked }))}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Target state of charge</Label>
                <Select value={targetSoc} onValueChange={setTargetSoc}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80">80%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Window starts</Label>
                <Select value={windowStart} onValueChange={setWindowStart}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {START_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {pickedIds.length} selected · estimated peak draw{' '}
              {Math.min(pickedIds.length, 2) * KW_PER_VEHICLE} kW against a {depotPowerLimitKw} kW site limit.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={confirmBulk} disabled={pickedIds.length === 0}>
              Confirm schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify */}
      <Dialog open={!!editRow} onOpenChange={(open) => !open && setEditRow(null)}>
        <DialogContent className="sm:max-w-md">
          {editRow && (
            <>
              <DialogHeader>
                <DialogTitle>Modify {editRow.id}</DialogTitle>
                <DialogDescription>
                  {editRow.vehicleId} · bay {editRow.connectorLabel}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Start time</Label>
                  <Select value={editStart} onValueChange={setEditStart}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {START_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Target state of charge</Label>
                  <Select value={editTarget} onValueChange={setEditTarget}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="80">80%</SelectItem>
                      <SelectItem value="90">90%</SelectItem>
                      <SelectItem value="100">100%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Discard</Button>
                </DialogClose>
                <Button onClick={saveEdit}>Save changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
