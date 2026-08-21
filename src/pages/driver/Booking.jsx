import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Zap,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Wallet as WalletIcon,
  CalendarDays,
  Clock,
  MapPin,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQueries, useQuery } from '@/hooks/use-query'
import { useAuth } from '@/context/auth'
import { fetchStation, fetchConnectorsFor } from '@/lib/api/stations'
import { fetchSlotAvailability, createReservation } from '@/lib/api/reservations'
import { fetchWallet } from '@/lib/api/wallet'

const BASE_DATE = '2026-07-31'
const SLOT_MINUTES = 30

const STEPS = [
  { id: 1, label: 'Charger' },
  { id: 2, label: 'Date & time' },
  { id: 3, label: 'Review' },
]

/** Deterministic next-5-days list built from a fixed base date string. */
function nextDates(baseIso, count) {
  const [y, m, d] = baseIso.split('-').map(Number)
  const out = []
  for (let i = 0; i < count; i += 1) {
    const dt = new Date(y, m - 1, d + i)
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`
    out.push({
      iso,
      weekday: dt.toLocaleDateString('en-US', { weekday: 'short' }),
      day: dt.getDate(),
      month: dt.toLocaleDateString('en-US', { month: 'short' }),
    })
  }
  return out
}

export default function Booking() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const dates = React.useMemo(() => nextDates(BASE_DATE, 5), [])

  const [step, setStep] = React.useState(1)
  const [connectorType, setConnectorType] = React.useState(null)
  const [date, setDate] = React.useState(dates[0].iso)
  const [slotId, setSlotId] = React.useState(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [booking, setBooking] = React.useState(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [submitError, setSubmitError] = React.useState(null)

  const base = useQueries(
    {
      station: () => fetchStation(id),
      bays: () => fetchConnectorsFor(id),
      wallet: fetchWallet,
    },
    [id]
  )
  const station = base.data?.station ?? null
  const bays = base.data?.bays ?? []
  const wallet = base.data?.wallet

  // Availability is per station *and* per day, so it reloads when the date
  // changes rather than being read once at mount.
  const slots = useQuery(() => fetchSlotAvailability(id, date), [id, date])
  const timeSlots = React.useMemo(() => slots.data ?? [], [slots.data])

  const connector = station?.connectors.find((c) => c.type === connectorType) ?? null
  const slot = timeSlots.find((t) => t.id === slotId) ?? null
  const freeSlots = timeSlots.filter((t) => t.available).length

  const estKwh = connector
    ? Math.round(Math.min(connector.power * (SLOT_MINUTES / 60) * 0.8, 60) * 10) / 10
    : 0
  const estCost = station ? Math.round(estKwh * station.pricePerKwh * 100) / 100 : 0

  const canContinue = step === 1 ? Boolean(connector) : step === 2 ? Boolean(slot) : true

  const confirm = async () => {
    if (!user || !slot || !connector) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      // The driver picks a connector *type*; the booking has to name a bay, so
      // take the first free one of that type and fall back to any of that type.
      const bay =
        bays.find((c) => c.type === connector.type && c.status === 'AVAILABLE') ??
        bays.find((c) => c.type === connector.type)

      const reservation = await createReservation({
        userId: user.id,
        stationId: station.id,
        connectorId: bay?.id ?? null,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
      })
      setBooking(reservation)
      setConfirmOpen(true)
      slots.refetch()
    } catch (err) {
      setSubmitError(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (base.loading && !station) return <LoadingRows rows={6} />
  if (base.error) {
    return <ErrorState error={base.error} onRetry={base.refetch} title="Could not open booking" />
  }
  if (!station) {
    return (
      <EmptyState
        icon={MapPin}
        title="Station not found"
        description="This station is no longer on the network, or the link is out of date."
        action={
          <Button asChild variant="outline">
            <Link to="/driver/stations">All stations</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book a charging slot"
        description={`${station.name} · ${station.address}, ${station.city}`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={`/driver/stations/${station.id}`}>Back to station</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    step > s.id
                      ? 'bg-primary text-primary-foreground'
                      : step === s.id
                        ? 'bg-primary/15 text-primary ring-2 ring-primary/40'
                        : 'bg-muted text-muted-foreground'
                  )}
                >
                  {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                </span>
                <span
                  className={cn(
                    'text-sm',
                    step === s.id ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${(step / STEPS.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 180, damping: 24 }}
            />
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Choose a charger</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Connector types available at {station.name}.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {station.connectors.map((c) => {
                  const bookable = c.available > 0
                  const selected = c.type === connectorType
                  return (
                    <button
                      key={c.type}
                      type="button"
                      disabled={!bookable}
                      onClick={() => setConnectorType(c.type)}
                      className={cn(
                        'rounded-xl border p-4 text-left transition-colors',
                        bookable
                          ? 'cursor-pointer hover:bg-accent/50'
                          : 'cursor-not-allowed opacity-60',
                        selected && 'border-primary bg-primary/5 ring-2 ring-primary/30'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{c.type}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Up to {c.power} kW · {c.available} of {c.total} free
                          </p>
                        </div>
                        <Zap
                          className={cn(
                            'h-4 w-4 shrink-0',
                            bookable ? 'text-primary' : 'text-muted-foreground'
                          )}
                        />
                      </div>
                      <div className="mt-3">
                        <StatusBadge status={bookable ? 'available' : 'in-use'} />
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="space-y-4"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Choose a date</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {dates.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => setDate(d.iso)}
                    className={cn(
                      'flex min-w-[76px] cursor-pointer flex-col items-center rounded-xl border px-4 py-2.5 transition-colors hover:bg-accent/50',
                      date === d.iso && 'border-primary bg-primary/5 ring-2 ring-primary/30'
                    )}
                  >
                    <span className="text-xs text-muted-foreground">{d.weekday}</span>
                    <span className="text-lg font-semibold leading-tight">{d.day}</span>
                    <span className="text-xs text-muted-foreground">{d.month}</span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base">Choose a time</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Slots already taken by other drivers are disabled.
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {freeSlots} of {timeSlots.length} free
                </span>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {slots.loading && <LoadingRows rows={2} className="col-span-full" />}
                {slots.error && (
                  <ErrorState
                    className="col-span-full"
                    error={slots.error}
                    onRetry={slots.refetch}
                    title="Could not check availability"
                  />
                )}
                {timeSlots.map((t) => {
                  const selected = slotId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={!t.available}
                      onClick={() => setSlotId(t.id)}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-center text-sm transition-colors',
                        t.available
                          ? 'cursor-pointer hover:bg-accent/50'
                          : 'cursor-not-allowed bg-muted text-muted-foreground',
                        selected && 'border-primary bg-primary/5 font-medium ring-2 ring-primary/30'
                      )}
                    >
                      <span className="block tabular-nums">{t.time}</span>
                      {!t.available && <span className="block text-[10px]">Booked</span>}
                    </button>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Review your booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Station</p>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {station.name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Charger</p>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                      {connector ? `${connector.type} · ${connector.power} kW` : '—'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(date)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      {slot ? `${slot.time} · ${SLOT_MINUTES} min` : '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Energy rate</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(station.pricePerKwh)} / kWh
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated energy</span>
                    <span className="font-medium tabular-nums">{estKwh} kWh</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estimated cost</span>
                    <span className="font-medium tabular-nums">{formatCurrency(estCost)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <WalletIcon className="h-3.5 w-3.5" /> Wallet balance
                    </span>
                    <span className="font-medium tabular-nums">
                      {wallet ? formatCurrency(wallet.balance, wallet.currency) : '—'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Nothing is charged now — your wallet is debited when the session is settled.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 1}
          onClick={() => setStep((s) => Math.max(1, s - 1))}
        >
          <ChevronLeft /> Back
        </Button>
        {step < 3 ? (
          <Button disabled={!canContinue} onClick={() => setStep((s) => Math.min(3, s + 1))}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button onClick={confirm} disabled={submitting}>
            <CheckCircle2 /> {submitting ? 'Requesting…' : 'Request booking'}
          </Button>
        )}
      </div>

      {submitError && (
        <ErrorState error={submitError} title="Could not send this booking request" onRetry={confirm} />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex flex-col items-center gap-3 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-status-warning/10 text-status-warning"
              >
                <Clock className="h-7 w-7" />
              </motion.div>
              <DialogTitle>Booking requested</DialogTitle>
              <DialogDescription>
                Your request for a {connector?.type} charger at {station.name} is pending operator
                approval. The slot is held for you until they respond.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-2 rounded-xl border p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Booking ID</span>
              <span className="font-mono font-medium">{booking?.id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">When</span>
              <span className="font-medium tabular-nums">
                {formatDate(date)} · {slot?.time}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={booking?.status ?? 'PENDING'} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => navigate('/driver')}>
              Done
            </Button>
            <Button onClick={() => navigate('/driver/history')}>View bookings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
