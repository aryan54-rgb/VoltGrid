import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import { motion } from 'framer-motion'
import {
  Gauge,
  BatteryCharging,
  DollarSign,
  Timer,
  Square,
  FileText,
  Plug,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { fetchActiveSession } from '@/lib/api/sessions'

const TICK_MS = 2000
const SOC_STEP = 1
const MINUTES_PER_TICK = 2

/** Usable pack size implied by the energy already delivered over the SoC gained. */
function batteryKwhFor(session) {
  const socGained = (session.currentSoc ?? 0) - (session.startSoc ?? 0)
  // A session that has only just started has no gain to divide by; 75 kWh is a
  // reasonable stand-in until the first few percent land.
  if (!socGained || !session.energyKwh) return 75
  return session.energyKwh / (socGained / 100)
}

function clockLabelFrom(baseMinutes, offsetMin) {
  const total = (baseMinutes + offsetMin) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function minutesLabel(min) {
  const m = Math.max(0, Math.round(min))
  if (m === 0) return 'Done'
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

const GAUGE_SIZE = 208
const GAUGE_STROKE = 14
const GAUGE_RADIUS = (GAUGE_SIZE - GAUGE_STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS

function SocGauge({ soc, targetSoc }) {
  const dash = (Math.min(soc, 100) / 100) * CIRCUMFERENCE
  return (
    <div className="relative" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
      <svg width={GAUGE_SIZE} height={GAUGE_SIZE} className="-rotate-90">
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={GAUGE_STROKE}
        />
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_RADIUS}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-semibold tabular-nums tracking-tight">{soc}%</span>
        <span className="mt-1 text-xs text-muted-foreground">State of charge</span>
        <span className="mt-2 text-xs text-muted-foreground">
          Target <span className="font-medium tabular-nums text-foreground">{targetSoc}%</span>
        </span>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

/**
 * The live screen for one running session.
 *
 * The row in `sessions` is the starting point; the ticking SoC, power taper and
 * running cost are simulated on top of it because the platform has no telemetry
 * feed yet. Swap the interval below for a Supabase Realtime subscription on the
 * `sessions` row and everything else here keeps working.
 */
function LiveSession({ session }) {
  const activeSession = session
  const kwhPerSoc = React.useMemo(() => batteryKwhFor(session) / 100, [session])

  // The feed continues from the last telemetry stamp on the stored curve.
  const baseClockMin = React.useMemo(() => {
    const last = session.powerCurve?.[session.powerCurve.length - 1]?.t
    if (!last) return new Date(session.startedAt).getHours() * 60 + new Date(session.startedAt).getMinutes()
    const [h, m] = last.split(':').map(Number)
    return h * 60 + m
  }, [session])

  const clockLabel = React.useCallback((offset) => clockLabelFrom(baseClockMin, offset), [baseClockMin])

  /** Charging tapers as the pack fills — full rated power early, about half near target. */
  const powerAtSoc = React.useCallback(
    (soc) => {
      const span = Math.max(1, session.targetSoc - session.currentSoc)
      const progress = Math.min(1, Math.max(0, (soc - session.currentSoc) / span))
      return Math.round((session.powerKw ?? 0) * (1 - progress * 0.55))
    },
    [session]
  )

  const initialLive = React.useMemo(
    () => ({
      soc: session.currentSoc ?? 0,
      energyKwh: session.energyKwh ?? 0,
      costSoFar: session.costSoFar ?? 0,
      powerKw: session.powerKw ?? 0,
      elapsedMin: 0,
    }),
    [session]
  )

  const [live, setLive] = React.useState(initialLive)
  const [curve, setCurve] = React.useState(() =>
    (session.powerCurve ?? []).map((p) => ({ t: p.t, kw: p.kw }))
  )
  const [status, setStatus] = React.useState('charging')
  const [stopOpen, setStopOpen] = React.useState(false)
  const liveRef = React.useRef(initialLive)

  React.useEffect(() => {
    if (status !== 'charging') return undefined
    const interval = setInterval(() => {
      const prev = liveRef.current
      if (prev.soc >= activeSession.targetSoc) {
        setStatus('completed')
        return
      }
      const soc = Math.min(activeSession.targetSoc, prev.soc + SOC_STEP)
      const gained = (soc - prev.soc) * kwhPerSoc
      const next = {
        soc,
        energyKwh: prev.energyKwh + gained,
        costSoFar: prev.costSoFar + gained * activeSession.pricePerKwh,
        powerKw: powerAtSoc(soc),
        elapsedMin: prev.elapsedMin + MINUTES_PER_TICK,
      }
      liveRef.current = next
      setLive(next)
      setCurve((c) => [...c, { t: clockLabel(next.elapsedMin), kw: next.powerKw }])
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [status, activeSession, kwhPerSoc, powerAtSoc, clockLabel])

  const charging = status === 'charging'
  const remainingKwh = Math.max(0, (activeSession.targetSoc - live.soc) * kwhPerSoc)
  const minutesRemaining = charging && live.powerKw > 0 ? (remainingKwh / live.powerKw) * 60 : 0

  const stopSession = () => {
    setStopOpen(false)
    setStatus('completed')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Active charging session"
        description={`${activeSession.id} · ${activeSession.stationName} · ${activeSession.charger}`}
        actions={
          charging ? (
            <motion.span
              className="inline-flex"
              animate={{ opacity: [1, 0.55, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <StatusBadge status="charging" />
            </motion.span>
          ) : (
            <StatusBadge status="completed" />
          )
        }
      />

      {!charging && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-[var(--status-good)]/40">
            <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[var(--status-good)]" />
                <CardTitle className="text-base">Session complete</CardTitle>
              </div>
              <StatusBadge status="completed" />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid gap-2 sm:max-w-md">
                <DetailRow label="Final state of charge" value={`${live.soc}%`} />
                <DetailRow label="Energy delivered" value={`${live.energyKwh.toFixed(1)} kWh`} />
                <DetailRow
                  label={`Energy cost @ ${formatCurrency(activeSession.pricePerKwh)}/kWh`}
                  value={formatCurrency(live.costSoFar)}
                />
                <Separator />
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total charged to wallet</span>
                  <span className="tabular-nums">{formatCurrency(live.costSoFar)}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button asChild variant="outline" size="sm">
                  <Link to="/driver/history">View session history</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/driver/wallet">Open wallet</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <SocGauge soc={live.soc} targetSoc={activeSession.targetSoc} />
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <StatCard
            index={0}
            label="Power"
            value={`${charging ? live.powerKw : 0} kW`}
            icon={Gauge}
          />
          <StatCard
            index={1}
            label="Energy delivered"
            value={`${live.energyKwh.toFixed(1)} kWh`}
            icon={BatteryCharging}
          />
          <StatCard
            index={2}
            label="Cost so far"
            value={formatCurrency(live.costSoFar)}
            icon={DollarSign}
          />
          <StatCard
            index={3}
            label="Time remaining"
            value={charging ? minutesLabel(minutesRemaining) : 'Complete'}
            icon={Timer}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Charging power"
          description="Power tapers as the battery fills"
          className="lg:col-span-2"
          height={280}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={curve}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="t" {...axisProps} />
              <YAxis {...axisProps} width={40} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${v} kW`} />}
                cursor={{ stroke: 'var(--chart-axis)' }}
              />
              <Line
                type="monotone"
                dataKey="kw"
                name="Power"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Session details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Station" value={activeSession.stationName} />
            <DetailRow label="Charger" value={activeSession.charger} />
            <DetailRow label="Vehicle" value={activeSession.vehicle} />
            <Separator />
            <DetailRow label="Started at" value={formatDateTime(activeSession.startedAt)} />
            <DetailRow
              label="Price per kWh"
              value={
                <span className="tabular-nums">{formatCurrency(activeSession.pricePerKwh)}</span>
              }
            />
            <DetailRow
              label="Target SoC"
              value={<span className="tabular-nums">{activeSession.targetSoc}%</span>}
            />
          </CardContent>
        </Card>
      </div>

      <Card className="sticky bottom-4 shadow-lg">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plug className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {charging ? 'Charging in progress' : 'Session ended'}
              </p>
              <p className="text-xs text-muted-foreground">
                {charging
                  ? `Stops automatically at ${activeSession.targetSoc}% — unplug within 10 minutes to avoid idle fees.`
                  : 'Your wallet has been debited and the receipt is in your history.'}
              </p>
            </div>
          </div>
          <Button variant="destructive" disabled={!charging} onClick={() => setStopOpen(true)}>
            <Square /> Stop charging
          </Button>
        </CardContent>
      </Card>

      <Dialog open={stopOpen} onOpenChange={setStopOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop charging?</DialogTitle>
            <DialogDescription>
              The battery is at {live.soc}% of a {activeSession.targetSoc}% target. Stopping now ends
              the session and charges {formatCurrency(live.costSoFar)} to your wallet.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStopOpen(false)}>
              Keep charging
            </Button>
            <Button variant="destructive" onClick={stopSession}>
              Stop session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ActiveSession() {
  const { data, loading, error, refetch } = useQuery(fetchActiveSession, [])

  if (loading && !data) return <LoadingRows rows={6} />
  if (error) {
    return <ErrorState error={error} onRetry={refetch} title="Could not load your session" />
  }
  if (!data) {
    return (
      <EmptyState
        icon={Zap}
        title="No session running"
        description="Plug in at any VoltGrid bay and the live view will appear here."
        action={
          <Button asChild>
            <Link to="/driver/stations">Find a station</Link>
          </Button>
        }
      />
    )
  }
  // Remount when the session changes so the simulation restarts from its state.
  return <LiveSession key={data.id} session={data} />
}
