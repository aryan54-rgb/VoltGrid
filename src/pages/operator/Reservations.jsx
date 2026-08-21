import { useMemo, useState } from 'react'
import { CalendarDays, CalendarX, Check, CheckCircle2, Clock, Percent, X } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatDate, initials } from '@/lib/utils'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { fetchReservations, setReservationStatus } from '@/lib/api/reservations'

/**
 * The day the board opens on. The seeded booking book is dated end of July
 * 2026; point this at `new Date()` once real bookings are coming in.
 */
const TODAY = '2026-07-31'

function dayLabel(date) {
  const monthDay = formatDate(date, { year: undefined })
  if (date === TODAY) return `Today · ${monthDay}`
  const weekday = new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
  return `${weekday} · ${monthDay}`
}

/** Placeholder contact details so the operator detail dialog is complete. */
function mockContact(name) {
  const clean = name
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z ]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return {
    email: `${clean.join('.') || 'customer'}@example.com`,
    phone: `+1 415 ${String(1000000 + ((name.length * 7919) % 8999999)).slice(0, 3)} ${String(
      1000000 + ((name.length * 104729) % 8999999)
    ).slice(0, 4)}`,
  }
}

export default function Reservations() {
  // Operators read the whole booking book — that widening lives in the
  // reservations SELECT policy, not in this query.
  const book = useQuery(fetchReservations, [])
  const list = useMemo(() => book.data ?? [], [book.data])

  const [day, setDay] = useState(TODAY)
  const [stationFilter, setStationFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [actionError, setActionError] = useState(null)

  const days = useMemo(() => [...new Set(list.map((r) => r.date))].sort(), [list])
  const stationOptions = useMemo(() => [...new Set(list.map((r) => r.station))].sort(), [list])

  const filtered = useMemo(
    () => list.filter((r) => r.date === day && (stationFilter === 'all' || r.station === stationFilter)),
    [list, day, stationFilter]
  )

  const todayCount = list.filter((r) => r.date === TODAY).length
  const confirmedCount = list.filter((r) => r.status === 'RESERVED').length
  const pendingCount = list.filter((r) => r.status === 'PENDING').length

  const setStatus = async (id, status) => {
    setActionError(null)
    try {
      await setReservationStatus(id, status)
      setSelected((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
      book.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  if (book.loading && !book.data) return <LoadingRows rows={8} />
  if (book.error) {
    return <ErrorState error={book.error} onRetry={book.refetch} title="Could not load reservations" />
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {actionError && <ErrorState error={actionError} title="That change did not go through" />}
        <PageHeader
          title="Reservations"
          description="Stall-level bookings across the stations you operate."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Today's reservations" value={todayCount} icon={CalendarDays} index={0} />
          <StatCard label="Confirmed" value={confirmedCount} icon={CheckCircle2} index={1} />
          <StatCard label="Pending" value={pendingCount} icon={Clock} index={2} />
          <StatCard
            label="No-show rate"
            value="3.1%"
            delta={-0.4}
            deltaLabel="vs last month"
            deltaGoodWhen="down"
            icon={Percent}
            index={3}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={cn(
                'cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                day === d
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {dayLabel(d)}
            </button>
          ))}
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-full sm:ml-auto sm:w-64">
              <SelectValue placeholder="Station" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stations</SelectItem>
              {stationOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            title="No reservations for this day"
            description="Nothing is booked for the selected day and station. Try another day or clear the station filter."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setDay(TODAY)
                  setStationFilter('all')
                }}
              >
                Back to today
              </Button>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Charger</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                      <TableCell className="font-medium">{r.customer}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.station}</TableCell>
                      <TableCell className="tabular-nums">{r.charger}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(r.date)}
                      </TableCell>
                      <TableCell className="text-sm">{r.time}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Approve reservation"
                                disabled={r.status !== 'PENDING'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStatus(r.id, 'RESERVED')
                                }}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Approve</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Cancel reservation"
                                disabled={r.status === 'CANCELLED'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setStatus(r.id, 'CANCELLED')
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent>
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle>Reservation {selected.id}</DialogTitle>
                  <DialogDescription>
                    {selected.station} · Charger {selected.charger}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="mt-0.5 font-medium">{formatDate(selected.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="mt-0.5 font-medium">{selected.time}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Charger</p>
                      <p className="mt-0.5 font-medium">{selected.charger}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <div className="mt-0.5">
                        <StatusBadge status={selected.status} />
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(selected.customer)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium">{selected.customer}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {mockContact(selected.customer).email} ·{' '}
                        {mockContact(selected.customer).phone}
                      </p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  {selected.status === 'PENDING' && (
                    <Button onClick={() => setStatus(selected.id, 'RESERVED')}>
                      <Check /> Approve
                    </Button>
                  )}
                  {selected.status !== 'CANCELLED' && (
                    <Button variant="outline" onClick={() => setStatus(selected.id, 'CANCELLED')}>
                      <X /> Cancel reservation
                    </Button>
                  )}
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
