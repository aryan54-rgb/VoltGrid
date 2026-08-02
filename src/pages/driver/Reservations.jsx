import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  CalendarClock,
  CircleDot,
  CheckCircle2,
  Users,
  CalendarX2,
  Pencil,
  Ban,
  ChevronRight,
  MapPin,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { formatDate } from '@/lib/utils'
import { stations, timeSlots } from '@/data/stations'
import { reservations, waitlistEntries } from '@/data/reservations'
import { currentUsers } from '@/data/users'

const driver = currentUsers.driver
const BASE_DATE = '2026-07-31'
const SLOT_MINUTES = 30

function stationName(stationId) {
  return stations.find((s) => s.id === stationId)?.name ?? stationId
}

function dateOptions(baseIso, count) {
  const [y, m, d] = baseIso.split('-').map(Number)
  const out = []
  for (let i = 0; i < count; i += 1) {
    const dt = new Date(y, m - 1, d + i)
    out.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    )
  }
  return out
}

function addMinutes(slot, minutes) {
  const [time, meridiem] = slot.split(' ')
  const [hh, mm] = time.split(':').map(Number)
  let hours24 = hh % 12
  if (meridiem === 'PM') hours24 += 12
  const total = (hours24 * 60 + mm + minutes) % (24 * 60)
  const h = Math.floor(total / 60)
  const min = total % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${suffix}`
}

function ReservationCard({ reservation, index, onModify, onCancel }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.04 }}
    >
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{reservation.id}</span>
              <StatusBadge status={reservation.status} />
            </div>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {stationName(reservation.stationId)}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> Bay {reservation.connectorLabel}
              </span>
              <span>·</span>
              <span>{formatDate(reservation.date)}</span>
              <span>·</span>
              <span className="tabular-nums">
                {reservation.startTime} – {reservation.endTime}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {reservation.status === 'RESERVED' && (
              <>
                <Button variant="outline" size="sm" onClick={() => onModify(reservation)}>
                  <Pencil /> Modify
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onCancel(reservation)}>
                  <Ban /> Cancel
                </Button>
              </>
            )}
            {reservation.status === 'ACTIVE' && (
              <Button asChild size="sm">
                <Link to="/driver/session">
                  View live session <ChevronRight />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default function Reservations() {
  const [rows, setRows] = React.useState(() =>
    reservations.filter((r) => r.userId === driver.id)
  )
  const [waitlist, setWaitlist] = React.useState(() =>
    waitlistEntries.filter((w) => w.userId === driver.id)
  )
  const [modifyTarget, setModifyTarget] = React.useState(null)
  const [cancelTarget, setCancelTarget] = React.useState(null)
  const [draftDate, setDraftDate] = React.useState(BASE_DATE)
  const [draftTime, setDraftTime] = React.useState(timeSlots[0])
  const [notice, setNotice] = React.useState('')

  React.useEffect(() => {
    if (!notice) return undefined
    const t = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(t)
  }, [notice])

  const dates = React.useMemo(() => dateOptions(BASE_DATE, 7), [])

  const upcoming = rows.filter((r) => r.status === 'RESERVED')
  const active = rows.filter((r) => r.status === 'ACTIVE')
  const past = rows.filter((r) => r.status === 'EXPIRED' || r.status === 'CANCELLED')

  const openModify = (r) => {
    setDraftDate(r.date)
    setDraftTime(r.startTime)
    setModifyTarget(r)
  }

  const saveModify = () => {
    if (!modifyTarget) return
    const id = modifyTarget.id
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, date: draftDate, startTime: draftTime, endTime: addMinutes(draftTime, SLOT_MINUTES) }
          : r
      )
    )
    setModifyTarget(null)
    setNotice(`${id} moved to ${formatDate(draftDate)} at ${draftTime}.`)
  }

  const confirmCancel = () => {
    if (!cancelTarget) return
    const id = cancelTarget.id
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)))
    setCancelTarget(null)
    setNotice(`${id} cancelled — the bay has been released.`)
  }

  const toggleNotify = (id) => {
    setWaitlist((prev) =>
      prev.map((w) => (w.id === id ? { ...w, notifyOnFree: !w.notifyOnFree } : w))
    )
  }

  const leaveWaitlist = (id) => {
    setWaitlist((prev) => prev.filter((w) => w.id !== id))
    setNotice(`${id} — you have left the waitlist.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My reservations"
        description={`Slot reservations for ${driver.name} — modify, cancel or track your waitlist.`}
        actions={
          <Button asChild size="sm">
            <Link to="/driver/stations">Book another slot</Link>
          </Button>
        }
      />

      {notice && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm"
        >
          <CheckCircle2 className="h-4 w-4 text-[var(--status-good)]" />
          {notice}
        </motion.p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Upcoming" value={upcoming.length} icon={CalendarClock} />
        <StatCard index={1} label="Active now" value={active.length} icon={CircleDot} />
        <StatCard index={2} label="Completed / expired" value={past.length} icon={CheckCircle2} />
        <StatCard index={3} label="Waitlisted" value={waitlist.length} icon={Users} />
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="No upcoming reservations"
              description="Find a station and reserve a bay to see it here."
              action={
                <Button asChild variant="outline">
                  <Link to="/driver/stations">Find a station</Link>
                </Button>
              }
            />
          ) : (
            upcoming.map((r, i) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                index={i}
                onModify={openModify}
                onCancel={setCancelTarget}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-3">
          {active.length === 0 ? (
            <EmptyState
              icon={CircleDot}
              title="No active reservation"
              description="A reservation becomes ACTIVE when you plug in during its time window."
            />
          ) : (
            active.map((r, i) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                index={i}
                onModify={openModify}
                onCancel={setCancelTarget}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Nothing in your history yet"
              description="Expired and cancelled reservations appear here."
            />
          ) : (
            past.map((r, i) => (
              <ReservationCard
                key={r.id}
                reservation={r}
                index={i}
                onModify={openModify}
                onCancel={setCancelTarget}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Live waitlist — position 1 is promoted automatically when a bay frees up.
          </p>
          {waitlist.length === 0 ? (
            <EmptyState
              icon={Users}
              title="You're not on any waitlist"
              description="When every window at a station is booked, you can join its live waitlist from the booking flow."
              action={
                <Button asChild variant="outline">
                  <Link to="/driver/stations">Browse stations</Link>
                </Button>
              }
            />
          ) : (
            waitlist.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.04 }}
              >
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{w.id}</span>
                        <Badge variant="warning">Position #{w.position}</Badge>
                      </div>
                      <p className="text-sm font-medium">{stationName(w.stationId)}</p>
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                        <span>{formatDate(w.date)}</span>
                        <span>·</span>
                        <span className="tabular-nums">{w.window}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {w.aheadOf === 0
                          ? "You're next in line — the bay is yours as soon as one frees up."
                          : `${w.aheadOf} ${w.aheadOf === 1 ? 'driver is' : 'drivers are'} ahead of you.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`notify-${w.id}`}
                          checked={w.notifyOnFree}
                          onCheckedChange={() => toggleNotify(w.id)}
                        />
                        <Label htmlFor={`notify-${w.id}`} className="text-xs text-muted-foreground">
                          Notify me
                        </Label>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => leaveWaitlist(w.id)}>
                        <Ban /> Leave waitlist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Modify */}
      <Dialog open={Boolean(modifyTarget)} onOpenChange={(o) => !o && setModifyTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify reservation</DialogTitle>
            <DialogDescription>
              {modifyTarget
                ? `${modifyTarget.id} · ${stationName(modifyTarget.stationId)} · Bay ${modifyTarget.connectorLabel}`
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="modify-date">Date</Label>
              <Select value={draftDate} onValueChange={setDraftDate}>
                <SelectTrigger id="modify-date">
                  <SelectValue placeholder="Pick a date" />
                </SelectTrigger>
                <SelectContent>
                  {dates.map((d) => (
                    <SelectItem key={d} value={d}>
                      {formatDate(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modify-time">Start time</Label>
              <Select value={draftTime} onValueChange={setDraftTime}>
                <SelectTrigger id="modify-time">
                  <SelectValue placeholder="Pick a time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t} – {addMinutes(t, SLOT_MINUTES)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyTarget(null)}>
              Discard
            </Button>
            <Button onClick={saveModify}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this reservation?</DialogTitle>
            <DialogDescription>
              {cancelTarget
                ? `${cancelTarget.id} at ${stationName(cancelTarget.stationId)} on ${formatDate(
                    cancelTarget.date
                  )}, ${cancelTarget.startTime} – ${cancelTarget.endTime}. The bay is released back to the pool and the first driver on the waitlist is promoted.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep reservation
            </Button>
            <Button variant="destructive" onClick={confirmCancel}>
              <Ban /> Cancel reservation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
