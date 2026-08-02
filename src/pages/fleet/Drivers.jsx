import { useMemo, useState } from 'react'
import { Users, CheckCircle2, UserMinus, ShieldCheck, Plus, MoreHorizontal, Car, Clock, Ban } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { fleetDrivers, fleetVehicles } from '@/data/fleet'
import { cn, initials } from '@/lib/utils'

const SHIFTS = ['Morning', 'Evening', 'Night', 'Relief']
const STATUSES = ['ON_DUTY', 'OFF_DUTY', 'ON_LEAVE']
const STATUS_LABELS = { ON_DUTY: 'On duty', OFF_DUTY: 'Off duty', ON_LEAVE: 'On leave' }

export default function Drivers() {
  const [drivers, setDrivers] = useState(fleetDrivers)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', licence: '', shift: 'Morning' })
  const [assignDriver, setAssignDriver] = useState(null)
  const [assignVehicle, setAssignVehicle] = useState('')
  const [shiftDriver, setShiftDriver] = useState(null)
  const [shiftValue, setShiftValue] = useState('Morning')

  const total = drivers.length
  const onDuty = drivers.filter((d) => d.status === 'ON_DUTY').length
  const unassigned = drivers.filter((d) => d.assignedVehicle === null).length
  const avgSafety = Math.round(drivers.reduce((s, d) => s + d.safetyScore, 0) / (drivers.length || 1))

  /** Vehicles with no driver attached — the only ones offered for assignment. */
  const freeVehicles = useMemo(() => {
    const taken = new Set(drivers.map((d) => d.assignedVehicle).filter(Boolean))
    return fleetVehicles.filter((v) => v.driverId === null && !taken.has(v.id))
  }, [drivers])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return drivers.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (shiftFilter !== 'all' && d.shift !== shiftFilter) return false
      if (q && !`${d.name} ${d.email}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [drivers, query, statusFilter, shiftFilter])

  function addDriver() {
    if (!form.name.trim() || !form.email.trim()) return
    setDrivers((prev) => [
      ...prev,
      {
        id: `fd-${String(prev.length + 1).padStart(2, '0')}`,
        name: form.name.trim(),
        email: form.email.trim(),
        licence: form.licence.trim() || '—',
        assignedVehicle: null,
        shift: form.shift,
        status: 'OFF_DUTY',
        sessionsThisMonth: 0,
        energyKwh: 0,
        safetyScore: 100,
      },
    ])
    setForm({ name: '', email: '', licence: '', shift: 'Morning' })
    setAddOpen(false)
  }

  function confirmAssign() {
    if (!assignVehicle) return
    setDrivers((prev) =>
      prev.map((d) => (d.id === assignDriver.id ? { ...d, assignedVehicle: assignVehicle } : d))
    )
    setAssignDriver(null)
    setAssignVehicle('')
  }

  function confirmShift() {
    setDrivers((prev) => prev.map((d) => (d.id === shiftDriver.id ? { ...d, shift: shiftValue } : d)))
    setShiftDriver(null)
  }

  function deactivate(id) {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, status: 'OFF_DUTY' } : d)))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        description="Manage the drivers assigned to your fleet vehicles"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus />
            Add driver
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total drivers" value={total} icon={Users} index={0} />
        <StatCard label="On duty" value={onDuty} icon={CheckCircle2} index={1} />
        <StatCard label="Unassigned" value={unassigned} icon={UserMinus} index={2} />
        <StatCard label="Average safety score" value={avgSafety} icon={ShieldCheck} index={3} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
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
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shifts</SelectItem>
            {SHIFTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {drivers.length} drivers
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Driver</TableHead>
              <TableHead>Licence</TableHead>
              <TableHead>Assigned vehicle</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Sessions this month</TableHead>
              <TableHead>Energy kWh</TableHead>
              <TableHead>Safety score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(d.name)}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-0.5">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{d.licence}</TableCell>
                <TableCell>
                  {d.assignedVehicle ? (
                    <span className="font-medium">{d.assignedVehicle}</span>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{d.shift}</TableCell>
                <TableCell className="tabular-nums">{d.sessionsThisMonth}</TableCell>
                <TableCell className="tabular-nums">{d.energyKwh}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress
                      value={d.safetyScore}
                      className="w-16"
                      indicatorClassName={cn(d.safetyScore < 90 && 'bg-status-warning')}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">{d.safetyScore}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={d.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal />
                        <span className="sr-only">Actions for {d.name}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setAssignVehicle('')
                          setAssignDriver(d)
                        }}
                      >
                        <Car />
                        Assign vehicle
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          setShiftValue(d.shift)
                          setShiftDriver(d)
                        }}
                      >
                        <Clock />
                        Change shift
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-status-critical focus:text-status-critical"
                        onSelect={() => deactivate(d.id)}
                      >
                        <Ban />
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add driver */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add driver</DialogTitle>
            <DialogDescription>Add a driver to the Swift Logistics fleet roster.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="driver-name">Name</Label>
              <Input
                id="driver-name"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-email">Email</Label>
              <Input
                id="driver-email"
                type="email"
                placeholder="name@swiftlogistics.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driver-licence">Licence</Label>
              <Input
                id="driver-licence"
                placeholder="MH12-0000"
                value={form.licence}
                onChange={(e) => setForm((f) => ({ ...f, licence: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Shift</Label>
              <Select value={form.shift} onValueChange={(v) => setForm((f) => ({ ...f, shift: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={addDriver} disabled={!form.name.trim() || !form.email.trim()}>
              Add driver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign vehicle */}
      <Dialog open={!!assignDriver} onOpenChange={(open) => !open && setAssignDriver(null)}>
        <DialogContent className="sm:max-w-md">
          {assignDriver && (
            <>
              <DialogHeader>
                <DialogTitle>Assign vehicle to {assignDriver.name}</DialogTitle>
                <DialogDescription>Only vehicles without a driver can be assigned.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-2">
                <Label>Vehicle</Label>
                <Select value={assignVehicle} onValueChange={setAssignVehicle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an available vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {freeVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.id} · {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {freeVehicles.length === 0 && (
                  <p className="text-xs text-muted-foreground">Every vehicle already has a driver.</p>
                )}
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={confirmAssign} disabled={!assignVehicle}>
                  Assign
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Change shift */}
      <Dialog open={!!shiftDriver} onOpenChange={(open) => !open && setShiftDriver(null)}>
        <DialogContent className="sm:max-w-md">
          {shiftDriver && (
            <>
              <DialogHeader>
                <DialogTitle>Change shift for {shiftDriver.name}</DialogTitle>
                <DialogDescription>Currently on the {shiftDriver.shift} shift.</DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-2">
                <Label>Shift</Label>
                <Select value={shiftValue} onValueChange={setShiftValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={confirmShift}>Save shift</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
