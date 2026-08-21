import { useMemo, useState } from 'react'
import { Plus, MoreHorizontal, Eye, Wrench, Archive, CheckCircle2 } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { CHART_COLORS, GRID, axisProps, ChartTooltip } from '@/components/shared/chart'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
import { useQuery } from '@/hooks/use-query'
import { useAuth } from '@/context/auth'
import { createVehicle, fetchVehicles, removeVehicle } from '@/lib/api/fleet'
import { cn, formatNumber } from '@/lib/utils'

const STATUSES = ['active', 'charging', 'idle', 'maintenance']
const STATUS_LABELS = {
  active: 'On route',
  charging: 'Charging',
  idle: 'Idle',
  maintenance: 'Maintenance',
}
/** Models offered in the add-vehicle picker before the roster has loaded. */
const FALLBACK_MODELS = [
  'Ford E-Transit',
  'Rivian EDV 700',
  'Rivian EDV 500',
  'Mercedes eSprinter',
  'BrightDrop Zevo 600',
]

/** Deterministic 8-point state-of-charge trace ending at the vehicle's current level. */
function socHistory(vehicle) {
  const deltas = [14, -6, 10, -18, 8, -12, 6, 0]
  let soc = vehicle.soc
  const points = []
  for (let i = deltas.length - 1; i >= 0; i--) {
    points.unshift({ time: `${8 + i}:00`, soc: Math.max(4, Math.min(100, Math.round(soc))) })
    soc -= deltas[i]
  }
  return points
}

export default function Vehicles() {
  const { profile } = useAuth()
  const roster = useQuery(fetchVehicles, [])
  const vehicles = useMemo(() => roster.data ?? [], [roster.data])

  const [actionError, setActionError] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modelFilter, setModelFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ model: '', id: '', driver: '' })
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')

  // The model filter follows the roster, so a newly commissioned model appears
  // without a code change.
  const MODELS = useMemo(() => {
    const fromRoster = [...new Set(vehicles.map((v) => v.model))]
    return fromRoster.length ? fromRoster : FALLBACK_MODELS
  }, [vehicles])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false
      if (modelFilter !== 'all' && v.model !== modelFilter) return false
      if (q && !`${v.id} ${v.model} ${v.driver} ${v.location}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [vehicles, query, statusFilter, modelFilter])

  async function addVehicle() {
    if (!form.model || !form.id.trim()) return
    setActionError(null)
    try {
      await createVehicle({
        company: profile?.company ?? 'Swift Logistics',
        id: form.id.trim(),
        model: form.model,
        driverName: form.driver.trim(),
      })
      setForm({ model: '', id: '', driver: '' })
      setAddOpen(false)
      roster.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  function scheduleService(vehicle) {
    setNotice(`Service booked for ${vehicle.id} at the depot workshop.`)
  }

  async function retire(id) {
    setActionError(null)
    try {
      await removeVehicle(id)
      roster.refetch()
      setNotice(`${id} removed from the active fleet.`)
    } catch (err) {
      setActionError(err)
    }
  }

  if (roster.loading && !roster.data) return <LoadingRows rows={8} />
  if (roster.error) {
    return <ErrorState error={roster.error} onRetry={roster.refetch} title="Could not load your vehicles" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Vehicles"
        description={`${vehicles.length} vehicles across the Swift Logistics fleet`}
        actions={
          <>
            <SearchInput
              placeholder="Search vehicles…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56"
            />
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Add vehicle
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={modelFilter} onValueChange={setModelFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All models</SelectItem>
            {MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {vehicles.length} vehicles
        </p>
      </div>

      {notice && (
        <p className="flex items-center gap-1.5 text-sm text-status-good">
          <CheckCircle2 className="h-4 w-4" />
          {notice}
        </p>
      )}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vehicle</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>State of charge</TableHead>
              <TableHead>Range km</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Health %</TableHead>
              <TableHead>Next service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => (
              <TableRow key={v.id} className="cursor-pointer" onClick={() => setSelected(v)}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium">{v.id}</p>
                    <p className="text-xs text-muted-foreground">{v.model}</p>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{v.driver}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={v.soc}
                      className="w-16"
                      indicatorClassName={cn(v.soc < 20 && 'bg-status-critical')}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">{v.soc}%</span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">{v.rangeKm}</TableCell>
                <TableCell className="text-muted-foreground">{v.location}</TableCell>
                <TableCell className="tabular-nums">{v.health}%</TableCell>
                <TableCell className="text-muted-foreground">{v.nextService}</TableCell>
                <TableCell>
                  <StatusBadge status={v.status} label={STATUS_LABELS[v.status]} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                        <span className="sr-only">Actions for {v.id}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setSelected(v)}>
                        <Eye />
                        View details
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => scheduleService(v)}>
                        <Wrench />
                        Schedule service
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-status-critical focus:text-status-critical"
                        onSelect={() => retire(v.id)}
                      >
                        <Archive />
                        Retire
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add vehicle */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
            <DialogDescription>Register a new vehicle to the Swift Logistics fleet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Model</Label>
              <Select value={form.model} onValueChange={(v) => setForm((f) => ({ ...f, model: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {MODELS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-id">Vehicle id</Label>
              <Input
                id="vehicle-id"
                placeholder="VN-122"
                value={form.id}
                onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vehicle-driver">Assigned driver</Label>
              <Input
                id="vehicle-driver"
                placeholder="Leave blank if unassigned"
                value={form.driver}
                onChange={(e) => setForm((f) => ({ ...f, driver: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={addVehicle} disabled={!form.model || !form.id.trim()}>
              Add vehicle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vehicle detail */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.id} · {selected.model}
                </DialogTitle>
                <DialogDescription>Vehicle detail and today&apos;s state-of-charge trace.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Odometer</p>
                  <p className="font-medium tabular-nums">{formatNumber(selected.odometer)} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Health</p>
                  <p className="font-medium tabular-nums">{selected.health}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-0.5">
                    <StatusBadge status={selected.status} label={STATUS_LABELS[selected.status]} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Driver</p>
                  <p className="font-medium">{selected.driver}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-medium">{selected.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">State of charge</p>
                  <p className="font-medium tabular-nums">{selected.soc}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Range</p>
                  <p className="font-medium tabular-nums">{selected.rangeKm} km</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Next service</p>
                  <p className="font-medium">{selected.nextService}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">State of charge — today</p>
                <div className="h-36 w-full [&_.recharts-surface]:outline-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={socHistory(selected)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                      <XAxis dataKey="time" {...axisProps} />
                      <YAxis {...axisProps} width={32} domain={[0, 100]} />
                      <RTooltip
                        content={<ChartTooltip formatter={(v) => `${v}%`} />}
                        cursor={{ stroke: 'var(--chart-axis)' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="soc"
                        name="State of charge"
                        stroke={CHART_COLORS[0]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
