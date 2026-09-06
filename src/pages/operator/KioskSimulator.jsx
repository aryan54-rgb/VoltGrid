import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BatteryCharging,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Layers,
  OctagonAlert,
  Play,
  Plug,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  Square,
  Terminal,
  Zap,
  DollarSign,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { useQuery } from '@/hooks/use-query'
import { fetchStations, fetchConnectorsFor } from '@/lib/api/stations'
import { fetchReservations, setReservationStatus } from '@/lib/api/reservations'
import { useAuth } from '@/context/auth'
import { useKioskSimulator, FAULT_DEFINITIONS } from '@/lib/kiosk-broadcast'

const SPEED_OPTIONS = [
  { label: '1x Normal', value: 1 },
  { label: '2x Fast', value: 2 },
  { label: '5x Demo', value: 5 },
  { label: '10x Turbo', value: 10 },
]

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function KioskSimulator() {
  const { profile, role: userRole } = useAuth()
  const {
    state,
    plugCable,
    unplugCable,
    startSession,
    togglePowerStream,
    simulateHardwareFault,
    emergencyStop,
    stopAndUnplug,
    resetFault,
    setStationAndConnector,
    setDriverInfo,
    setStreamSpeed,
  } = useKioskSimulator()

  const stationsQuery = useQuery(fetchStations, [])
  const allStations = useMemo(() => stationsQuery.data ?? [], [stationsQuery.data])

  // Filter stations strictly to the ones owned by this operator
  const stations = useMemo(() => {
    if (userRole === 'admin') return allStations
    if (userRole === 'operator' && profile) {
      const owned = allStations.filter((s) => {
        if (s.operatorId && s.operatorId === profile.id) return true
        if (profile.company && s.operator && s.operator.toLowerCase().trim() === profile.company.toLowerCase().trim()) return true
        if (profile.name && s.operator && s.operator.toLowerCase().trim() === profile.name.toLowerCase().trim()) return true
        if (profile.email && s.operator && s.operator.toLowerCase().trim() === profile.email.toLowerCase().trim()) return true
        return false
      })
      return owned
    }
    return allStations
  }, [allStations, userRole, profile])

  const [connectors, setConnectors] = useState([])
  const [loadingConnectors, setLoadingConnectors] = useState(false)

  // Dynamically load real connector bays for the selected station
  useEffect(() => {
    if (!state.stationId) return
    let active = true
    setLoadingConnectors(true)
    fetchConnectorsFor(state.stationId)
      .then((data) => {
        if (!active) return
        setConnectors(data || [])
        if (data && data.length > 0 && !data.some((c) => c.id === state.connectorId)) {
          setStationAndConnector({
            connectorId: data[0].id,
            connectorLabel: `Bay ${data[0].label} (${data[0].type})`,
            powerKw: data[0].powerKw || 150,
          })
        }
      })
      .catch(() => {
        if (!active) return
        setConnectors([])
      })
      .finally(() => {
        if (active) setLoadingConnectors(false)
      })
    return () => {
      active = false
    }
  }, [state.stationId, state.connectorId, setStationAndConnector])

  // Query reservations for quick-start and approval
  const reservationsQuery = useQuery(fetchReservations, [])
  const allReservations = useMemo(() => reservationsQuery.data ?? [], [reservationsQuery.data])

  const pendingBookings = useMemo(() => {
    return allReservations.filter((r) => r.stationId === state.stationId && r.status === 'PENDING')
  }, [allReservations, state.stationId])

  const approvedBookings = useMemo(() => {
    return allReservations.filter((r) => r.stationId === state.stationId && r.status === 'RESERVED')
  }, [allReservations, state.stationId])

  const [selectedFault, setSelectedFault] = useState('OVER_CURRENT')
  const [logFilter, setLogFilter] = useState('all')

  // When operator's stations load, sync simulator target
  useEffect(() => {
    if (stations.length > 0) {
      const current = stations.find((s) => s.id === state.stationId) || stations[0]
      if (current && (state.stationId !== current.id || state.stationName !== current.name || state.pricePerKwh !== current.pricePerKwh)) {
        setStationAndConnector({
          stationId: current.id,
          stationName: current.name,
          pricePerKwh: current.pricePerKwh,
        })
      }
    }
  }, [stations, state.stationId, state.stationName, state.pricePerKwh, setStationAndConnector])

  const handleStationChange = (stId) => {
    const st = stations.find((s) => s.id === stId)
    if (st) {
      setStationAndConnector({
        stationId: st.id,
        stationName: st.name,
        pricePerKwh: st.pricePerKwh,
      })
    }
  }

  const isIdle = state.kioskState === 'IDLE'
  const isPlugged = state.kioskState === 'PLUGGED'
  const isCharging = state.kioskState === 'CHARGING'
  const isComplete = state.kioskState === 'COMPLETE'
  const isFaulted = state.kioskState === 'FAULTED'

  // Dynamic halo ring styling matching physical LED indicators
  const haloColor = useMemo(() => {
    if (isFaulted) return 'border-red-500/80 shadow-[0_0_35px_rgba(239,68,68,0.5)]'
    if (isCharging) return 'border-emerald-400/80 shadow-[0_0_35px_rgba(52,211,153,0.45)] animate-pulse'
    if (isComplete) return 'border-cyan-400/80 shadow-[0_0_30px_rgba(34,211,238,0.4)]'
    if (isPlugged) return 'border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.35)]'
    return 'border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
  }, [isFaulted, isCharging, isComplete, isPlugged])

  const filteredLogs = useMemo(() => {
    if (logFilter === 'all') return state.logs || []
    return (state.logs || []).filter((l) => l.source.toLowerCase() === logFilter.toLowerCase() || l.level === logFilter)
  }, [state.logs, logFilter])

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <PageHeader
        title="Kiosk Terminal Simulator"
        description="Hardware Digital Twin · Emulating physical charging station actions, contactor states, and live telemetry broadcast."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              <Radio className="h-3 w-3 animate-ping" /> Live Realtime Bus Active
            </Badge>
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link to="/driver/active-session" target="_blank" rel="noreferrer">
                <ExternalLink className="h-3.5 w-3.5" /> Driver Live View
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link to="/operator/connectors">
                <Layers className="h-3.5 w-3.5" /> Bay Board
              </Link>
            </Button>
          </div>
        }
      />

      {/* Warning if operator owns no stations */}
      {stations.length === 0 && !stationsQuery.loading && (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">No stations assigned to your operator account</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  You are signed in as <strong>{profile?.name || profile?.email || 'Station Operator'}</strong>. Only stations registered under your account are displayed here.
                </p>
              </div>
            </div>
            <Button asChild size="sm" className="gap-1.5 shrink-0">
              <Link to="/operator/stations">
                <Plus className="h-3.5 w-3.5" /> Commission Station
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Driver Booking Notification Banner: Pending Approval */}
      {pendingBookings.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CalendarClock className="h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {pendingBookings.length} Driver Booking Request Pending
                  </span>
                  <span className="text-xs font-semibold">{pendingBookings[0].customer}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Slot: {pendingBookings[0].date} ({pendingBookings[0].time}) · {pendingBookings[0].charger}
                </p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1.5 border-amber-500/40 shrink-0">
              <Link to="/operator/reservations">
                Review & Approve on Reservations Board
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Driver Booking Ready to Charge Banner: Approved */}
      {approvedBookings.length > 0 && (
        <Card className="border-emerald-500/40 bg-emerald-500/10 p-3.5 text-emerald-900 dark:text-emerald-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    Approved Booking Ready
                  </span>
                  <span className="text-xs font-semibold">{approvedBookings[0].customer}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Slot: {approvedBookings[0].date} ({approvedBookings[0].time}) · {approvedBookings[0].charger}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs shrink-0"
              disabled={isCharging}
              onClick={() => {
                const b = approvedBookings[0]
                setDriverInfo({ driverName: b.customer, driverUserId: b.userId, vehicle: 'Tesla Model 3' })
                if (b.connectorId) {
                  setStationAndConnector({ connectorId: b.connectorId, connectorLabel: b.connectorLabel || b.charger })
                }
                plugCable()
                setTimeout(() => startSession(), 600)
                setReservationStatus(b.id, 'ACTIVE').catch(() => {})
              }}
            >
              <Play className="h-4 w-4 fill-current" /> Plug & Start Session for Driver
            </Button>
          </div>
        </Card>
      )}

      {/* Hardware Target Configuration Bar */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:max-w-2xl">
            <div>
              <span className="text-xs text-muted-foreground block mb-1 font-medium">Station Target</span>
              <Select value={state.stationId || 'st-01'} onValueChange={handleStationChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.length > 0 ? (
                    <>
                      {stations.map((st) => (
                        <SelectItem key={st.id} value={st.id} className="text-xs">
                          {st.name} {st.city ? `(${st.city})` : ''}
                        </SelectItem>
                      ))}
                      {!stations.some((st) => st.id === (state.stationId || 'st-01')) && (
                        <SelectItem value={state.stationId || 'st-01'} className="text-xs">
                          {state.stationName || 'Current Station'}
                        </SelectItem>
                      )}
                    </>
                  ) : (
                    <SelectItem value={state.stationId || 'st-01'} className="text-xs">
                      {state.stationName || 'No station registered'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1 font-medium">Connector Bay</span>
              <Select
                value={state.connectorId || 'st-01-c11'}
                onValueChange={(cid) => {
                  const found = connectors.find((c) => c.id === cid)
                  setStationAndConnector({
                    connectorId: cid,
                    connectorLabel: found ? `Bay ${found.label} (${found.type})` : cid,
                    powerKw: found?.powerKw || state.powerKw,
                  })
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={loadingConnectors ? 'Loading bays...' : 'Select connector'} />
                </SelectTrigger>
                <SelectContent>
                  {connectors.length > 0 ? (
                    connectors.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        Bay {c.label} · {c.type} {c.powerKw} kW ({c.status})
                      </SelectItem>
                    ))
                  ) : (
                    <>
                      <SelectItem value="st-01-c11" className="text-xs">Bay A1 · CCS2 150 kW</SelectItem>
                      <SelectItem value="st-01-c12" className="text-xs">Bay A2 · CCS2 150 kW</SelectItem>
                      <SelectItem value="st-01-c13" className="text-xs">Bay B1 · CHAdeMO 50 kW</SelectItem>
                      {!['st-01-c11', 'st-01-c12', 'st-01-c13'].includes(state.connectorId) && state.connectorId && (
                        <SelectItem value={state.connectorId} className="text-xs">{state.connectorLabel || state.connectorId}</SelectItem>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1 font-medium">Simulation Clock</span>
              <Select
                value={String(state.streamSpeed || 2)}
                onValueChange={(val) => setStreamSpeed(Number(val))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Speed" />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col text-right">
              <span className="text-muted-foreground">Rate:</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(state.pricePerKwh)} / kWh</span>
            </div>
            <Separator orientation="vertical" className="h-8 hidden sm:block" />
            <div className="flex flex-col text-right">
              <span className="text-muted-foreground">Pre-auth Deposit:</span>
              <span className="font-semibold tabular-nums text-foreground">{formatCurrency(state.depositAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid: Physical Kiosk Terminal Twin & State Machine Controls */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Physical Kiosk Enclosure (Left: 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative rounded-3xl p-6 sm:p-8 bg-zinc-950 text-zinc-100 shadow-2xl border-4 transition-all duration-500 overflow-hidden backdrop-blur-xl">
            {/* Top Industrial Bezel and Status Lightbar */}
            <div className={`absolute top-0 left-0 right-0 h-2.5 border-t-2 ${haloColor}`} />

            {/* Terminal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700/60 flex items-center justify-center text-emerald-400 font-bold tracking-wider shadow-inner">
                  VG
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase">
                      {state.stationName}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                      {state.connectorLabel}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    OCPP 2.0.1 · Firmware v4.18-Twin · EVSE ID #{state.connectorId}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    isFaulted
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                      : isCharging
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                      : isComplete
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      : isPlugged
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isFaulted
                        ? 'bg-red-500 animate-ping'
                        : isCharging
                        ? 'bg-emerald-400'
                        : isComplete
                        ? 'bg-cyan-400'
                        : isPlugged
                        ? 'bg-amber-400'
                        : 'bg-zinc-400'
                    }`}
                  />
                  {state.kioskState}
                  {state.authenticating ? ' / AUTHENTICATING' : ''}
                </span>
              </div>
            </div>

            {/* LCD Screen Internal Face */}
            <div className="rounded-2xl bg-black/80 border border-zinc-800 p-5 shadow-inner space-y-6">
              {/* Fault Banner if Faulted */}
              <AnimatePresence>
                {isFaulted && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-xl border border-red-500/50 bg-red-950/60 p-3.5 text-red-300 flex items-start gap-3"
                  >
                    <OctagonAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                    <div>
                      <h4 className="text-sm font-semibold tracking-wide text-red-200">
                        HARDWARE TRIP: {FAULT_DEFINITIONS[state.faultState]?.label || state.faultState}
                      </h4>
                      <p className="text-xs text-red-300/90 mt-0.5">
                        {state.faultDetails || FAULT_DEFINITIONS[state.faultState]?.description}
                      </p>
                      <p className="text-[11px] text-red-400/80 mt-1 font-mono">
                        Safety relay opened. Contactors isolated. Automatic maintenance ticket queued.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Central Telemetry Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] uppercase tracking-wider font-mono">Power Draw</span>
                    <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                      {isCharging ? (state.powerKw ?? 0) : 0}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">kW</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1">DC Fast Bus</span>
                </div>

                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] uppercase tracking-wider font-mono">Delivered</span>
                    <BatteryCharging className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-cyan-300 tabular-nums">
                      {Number(state.chargingKwh ?? 0).toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">kWh</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1">Total Net Energy</span>
                </div>

                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] uppercase tracking-wider font-mono">Cost So Far</span>
                    <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
                      {formatCurrency(state.costSoFar ?? 0)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1">
                    {state.depositHeld > 0 ? `($${state.depositHeld} hold)` : 'Pre-auth'}
                  </span>
                </div>

                <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-zinc-400 mb-1">
                    <span className="text-[11px] uppercase tracking-wider font-mono">Duration</span>
                    <Activity className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                      {formatDuration(state.elapsedSeconds ?? 0)}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1">MM:SS active</span>
                </div>
              </div>

              {/* Battery SoC & Charging Flow Bar */}
              <div className="space-y-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-emerald-400" /> State of Charge (SoC)
                  </span>
                  <span className="text-zinc-100 font-bold tabular-nums">
                    {Number(state.currentSoc ?? 22).toFixed(0)}% / Target {state.targetSoc ?? 80}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="relative h-4 w-full rounded-full bg-zinc-950 p-0.5 border border-zinc-800 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isFaulted
                        ? 'bg-red-500'
                        : isComplete
                        ? 'bg-cyan-400'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, state.currentSoc ?? 22))}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono pt-1">
                  <span>Start: {state.startSoc ?? 22}%</span>
                  <span>Vehicle: {state.vehicle || 'EV'}</span>
                  <span>Target: {state.targetSoc ?? 80}%</span>
                </div>
              </div>

              {/* Low-Level Hardware Diagnostic Telemetry */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-800/60 text-[11px] font-mono">
                <div className="text-zinc-400">
                  <span>DC Voltage: </span>
                  <span className="text-zinc-200 font-semibold tabular-nums">{Number(state.voltage ?? 400).toFixed(1)} V</span>
                </div>
                <div className="text-zinc-400">
                  <span>Amperage: </span>
                  <span className="text-zinc-200 font-semibold tabular-nums">
                    {isCharging ? Number(state.current ?? 0).toFixed(1) : '0.0'} A
                  </span>
                </div>
                <div className="text-zinc-400">
                  <span>Contactor: </span>
                  <span
                    className={`font-semibold ${
                      isCharging ? 'text-emerald-400' : isFaulted ? 'text-red-400' : 'text-zinc-400'
                    }`}
                  >
                    {isCharging ? 'CLOSED [HV]' : isFaulted ? 'TRIPPED [OPEN]' : 'OPEN'}
                  </span>
                </div>
                <div className="text-zinc-400">
                  <span>Coupler Latch: </span>
                  <span className={`font-semibold ${state.plugDetected ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {state.plugDetected ? 'ENGAGED' : 'UNLATCHED'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Hardware Bezel Status */}
            <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>BMS Interlock: ACTIVE</span>
              </div>
              <div className="font-mono text-[11px] text-zinc-500">
                Coupled Vehicle: {state.driverName} ({state.vehicle})
              </div>
            </div>
          </div>
        </div>

        {/* State Machine Action Controls (Right: 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-2 shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> State Machine Controls
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Hardware events mirroring physical charger interactions.
                  </CardDescription>
                </div>
                <StatusBadge status={state.kioskState} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Action 1: [Plug Cable] / [Unplug Cable] */}
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plug className={`h-4 w-4 ${state.plugDetected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold">Physical Cable Coupler</span>
                  </div>
                  <Badge variant={state.plugDetected ? 'default' : 'secondary'} className="text-[10px]">
                    {state.plugDetected ? 'LOCKED IN INLET' : 'HOLSTERED'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Simulates physical connector mating and CP/PP pilot handshake.
                </p>
                <div className="pt-1 flex gap-2">
                  {!state.plugDetected ? (
                    <Button
                      onClick={plugCable}
                      className="w-full gap-1.5"
                      size="sm"
                      disabled={isCharging || isFaulted}
                    >
                      <Plug className="h-4 w-4" /> [Plug Cable] → PLUGGED
                    </Button>
                  ) : (
                    <Button
                      onClick={unplugCable}
                      variant="outline"
                      className="w-full gap-1.5 text-destructive hover:bg-destructive/10"
                      size="sm"
                      disabled={isCharging}
                    >
                      <Plug className="h-4 w-4 rotate-180" /> [Unplug Cable] → IDLE
                    </Button>
                  )}
                </div>
              </div>

              {/* Action 2: [Start Session] */}
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className={`h-4 w-4 ${isCharging ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold">Session Authorization</span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Pre-auth Hold: {formatCurrency(state.depositAmount)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Holds deposit, energizes high-voltage contactors, transitions to CHARGING.
                </p>
                <Button
                  onClick={() => startSession()}
                  disabled={!isPlugged || isCharging}
                  className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                >
                  <Play className="h-4 w-4" /> [Start Session] → CHARGING
                </Button>
              </div>

              {/* Action 3: [Simulate Power Stream] */}
              <div className="p-3.5 rounded-xl border bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${state.powerStreamActive ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold">Live Power Stream Loop</span>
                  </div>
                  <Badge variant={state.powerStreamActive ? 'default' : 'outline'} className="text-[10px]">
                    {state.powerStreamActive ? '1-SEC TICK ACTIVE' : 'PAUSED'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Increments kWh, running cost, and battery SOC % every second.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => togglePowerStream()}
                    disabled={!isCharging}
                    variant={state.powerStreamActive ? 'secondary' : 'default'}
                    className="w-full gap-1.5"
                    size="sm"
                  >
                    <Activity className="h-4 w-4" />
                    {state.powerStreamActive ? 'Pause Power Stream' : '[Simulate Power Stream]'}
                  </Button>
                </div>
              </div>

              {/* Action 4: [Simulate Hardware Fault] */}
              <div className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-semibold">Hardware Fault Simulator</span>
                  </div>
                  <Badge variant="destructive" className="text-[10px]">
                    TRIP TEST
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Injects safety anomalies (Over-Current or Latch Error) and transitions to FAULTED.
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    onClick={() => simulateHardwareFault('OVER_CURRENT')}
                    variant="destructive"
                    size="sm"
                    className="text-xs px-2"
                  >
                    Trip OVER_CURRENT
                  </Button>
                  <Button
                    onClick={() => simulateHardwareFault('CONNECTOR_LATCH_ERROR')}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                  >
                    Latch Lock Error
                  </Button>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Select value={selectedFault} onValueChange={setSelectedFault}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Other fault..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OVER_CURRENT">Over-Current (E-301)</SelectItem>
                      <SelectItem value="CONNECTOR_LATCH_ERROR">Connector Latch (E-231)</SelectItem>
                      <SelectItem value="DC_ISOLATION_FAULT">DC Isolation (E-402)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => simulateHardwareFault(selectedFault)}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-destructive border-destructive/30"
                  >
                    Trigger
                  </Button>
                </div>
              </div>

              {/* Action 5: [Stop & Unplug] & E-Stop */}
              <div className="pt-2 space-y-2 border-t">
                <Button
                  onClick={stopAndUnplug}
                  disabled={isIdle}
                  className="w-full gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold"
                  size="default"
                >
                  <Square className="h-4 w-4 fill-current" />
                  [Stop & Unplug] → Settle & Reset to IDLE
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={emergencyStop}
                    variant="destructive"
                    size="sm"
                    className="gap-1 text-xs font-bold uppercase tracking-wider"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" /> Emergency Stop
                  </Button>

                  <Button
                    onClick={resetFault}
                    disabled={!isFaulted}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Clear / Reset Fault
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Real-time Telemetry Terminal Packet Log & Verification Guide */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Terminal Packet Log (8 Cols) */}
        <div className="lg:col-span-8">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm flex items-center gap-2 font-mono">
                  <Terminal className="h-4 w-4 text-primary" /> Real-Time OCPP & Hardware Telemetry Log
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  Listening to live broadcast bus: broadcast channel + Supabase Realtime
                </CardDescription>
              </div>
              <div className="flex gap-1">
                {['all', 'ocpp', 'hardware', 'error'].map((filt) => (
                  <Button
                    key={filt}
                    variant={logFilter === filt ? 'default' : 'ghost'}
                    size="sm"
                    className="h-6 text-[11px] px-2 uppercase font-mono"
                    onClick={() => setLogFilter(filt)}
                  >
                    {filt}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto rounded-xl bg-zinc-950 p-3 font-mono text-xs text-zinc-300 space-y-1.5 border border-zinc-800">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-zinc-500 shrink-0 text-[10px]">{log.time}</span>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        log.level === 'error'
                          ? 'bg-red-500/20 text-red-400'
                          : log.level === 'success'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {log.source}
                    </span>
                    <span
                      className={
                        log.level === 'error'
                          ? 'text-red-300'
                          : log.level === 'success'
                          ? 'text-emerald-300'
                          : 'text-zinc-200'
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-zinc-600 text-center py-8 italic">No events captured yet.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification & Live Testing Card (4 Cols) */}
        <div className="lg:col-span-4">
          <Card className="h-full bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Digital Twin Live Verification
              </CardTitle>
              <CardDescription className="text-xs">
                How to verify state transitions & live synchronization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  1
                </span>
                <p>
                  Click <strong>[Open Driver Live View]</strong> above to pop out{' '}
                  <code className="text-foreground font-semibold">/driver/active-session</code> in a split window.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  2
                </span>
                <p>
                  Click <strong>[Plug Cable]</strong>, then <strong>[Start Session]</strong>. Pre-auth deposit is held and state enters CHARGING.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  3
                </span>
                <p>
                  Watch <strong>[Simulate Power Stream]</strong> tick each second: power, kWh, cost, and battery SoC update in both windows simultaneously!
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  4
                </span>
                <p>
                  Click <strong>[Trip OVER_CURRENT]</strong> or <strong>[Emergency Stop]</strong> to trigger instantaneous contactor isolation and fault alerts.
                </p>
              </div>
              <div className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  5
                </span>
                <p>
                  Click <strong>[Stop & Unplug]</strong> to settle the session bill, record the wallet ledger deduction, and return to IDLE.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
