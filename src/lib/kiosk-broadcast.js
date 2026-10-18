import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import { updateConnectorStatus } from '@/lib/api/stations'

/**
 * Fault definitions mirroring physical EVSE hardware events.
 */
export const FAULT_DEFINITIONS = {
  OVER_CURRENT: {
    code: 'E-301',
    label: 'Over-Current Surge Fault',
    severity: 'CRITICAL',
    description: 'Current surge detected: DC bus amperage spiked to 482A (>350A rating limit). Safety breaker tripped immediately.',
  },
  CONNECTOR_LATCH_ERROR: {
    code: 'E-231',
    label: 'Connector Latch Failure',
    severity: 'HIGH',
    description: 'Physical interlock failure: Solenoid locking pin lost contact engagement while energized.',
  },
  DC_ISOLATION_FAULT: {
    code: 'E-402',
    label: 'DC Ground Isolation Fault',
    severity: 'CRITICAL',
    description: 'Ground continuity lost: Isolation resistance dropped below safety threshold (<100 Ω/V).',
  },
  EMERGENCY_STOP: {
    code: 'E-100',
    label: 'Hardware Emergency Stop Activated',
    severity: 'CRITICAL',
    description: 'Physical mushroom E-Stop button pressed on terminal chassis. Main contactor safety circuit cut.',
  },
}

export const KIOSK_STATES = ['IDLE', 'PLUGGED', 'CHARGING', 'COMPLETE', 'FAULTED']

export const STATE_TRANSITIONS = {
  IDLE: ['PLUGGED', 'FAULTED'],
  PLUGGED: ['CHARGING', 'IDLE', 'FAULTED'],
  CHARGING: ['COMPLETE', 'IDLE', 'FAULTED'],
  COMPLETE: ['IDLE', 'FAULTED'],
  FAULTED: ['IDLE', 'PLUGGED'],
}

const STORAGE_KEY = 'voltgrid_kiosk_twin_state'
const BROADCAST_CHANNEL_NAME = 'voltgrid-kiosk-bus'
const SUPABASE_CHANNEL_NAME = 'kiosk-terminal-twin'

/** Default starting state */
const DEFAULT_STATE = {
  stationId: 'st-01',
  stationName: 'Downtown EV Fast Hub',
  connectorId: 'st-01-c11',
  connectorLabel: 'Bay A1 (CCS2)',
  powerKw: 150,
  pricePerKwh: 0.38,
  kioskState: 'IDLE', // IDLE | PLUGGED | CHARGING | COMPLETE | FAULTED
  plugDetected: false,
  authenticating: false,
  powerStreamActive: false,
  streamSpeed: 2, // multiplier
  chargingKwh: 0,
  costSoFar: 0,
  startSoc: 22,
  currentSoc: 22,
  targetSoc: 80,
  voltage: 400.0,
  current: 0.0,
  faultState: null, // key of FAULT_DEFINITIONS
  faultDetails: null,
  sessionId: null,
  reservationId: null,
  paymentStatus: 'unpaid',
  billingError: null,
  driverName: 'Alex Mercer',
  driverUserId: null,
  vehicle: 'Tesla Model 3 Long Range',
  powerCurve: [],
  sessionStartedAt: null,
  sessionEndedAt: null,
  elapsedSeconds: 0,
  updatedAt: Date.now(),
  logs: [
    {
      id: 'log-init',
      time: new Date().toLocaleTimeString(),
      level: 'info',
      source: 'OCPP',
      message: 'Kiosk Terminal Booted. OCPP 2.0.1 link established with VoltGrid Central System.',
    },
  ],
}

// In-memory state singleton
let currentState = loadInitialState()
const listeners = new Set()
let timerInterval = null
let bc = null
let supabaseChannel = null

function loadInitialState() {
  if (typeof window === 'undefined') return DEFAULT_STATE
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      const legacyUnbookedSession = parsed.kioskState !== 'IDLE' && !parsed.reservationId
      return {
        ...DEFAULT_STATE,
        ...parsed,
        ...(legacyUnbookedSession ? { kioskState: 'IDLE', plugDetected: false, sessionId: null } : {}),
        powerStreamActive: false,
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_STATE
}

function saveState(state) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...state,
        powerStreamActive: false, // do not persist running loop on reload
      })
    )
  } catch {
    // ignore
  }
}

function broadcastUpdate(state, eventType = 'telemetry') {
  saveState(state)

  // Notify in-process listeners
  for (const listener of listeners) {
    listener(state)
  }

  // Notify other tabs via Web BroadcastChannel
  if (bc) {
    try {
      bc.postMessage({ type: eventType, payload: state })
    } catch {
      // ignore
    }
  }

  // Notify same-window listeners via CustomEvent
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('voltgrid-kiosk-event', { detail: { type: eventType, state } }))
  }

  // Notify Supabase Realtime broadcast
  if (supabaseChannel) {
    try {
      supabaseChannel.send({
        type: 'broadcast',
        event: 'kiosk-event',
        payload: { type: eventType, state },
      })
    } catch {
      // ignore
    }
  }
}

function addLog(level, source, message) {
  const newLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    time: new Date().toLocaleTimeString(),
    level,
    source,
    message,
  }
  return [newLog, ...(currentState.logs || [])].slice(0, 50)
}

/**
 * Initialize background listeners (BroadcastChannel + Supabase channel)
 */
function initChannels() {
  if (typeof window === 'undefined') return

  if (!bc && 'BroadcastChannel' in window) {
    bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
    bc.onmessage = (event) => {
      if (event.data?.payload) {
        currentState = { ...currentState, ...event.data.payload }
        for (const listener of listeners) {
          listener(currentState)
        }
      }
    }
  }

  if (!supabaseChannel) {
    try {
      supabaseChannel = supabase.channel(SUPABASE_CHANNEL_NAME, {
        config: { broadcast: { self: false } },
      })
      supabaseChannel
        .on('broadcast', { event: 'kiosk-event' }, ({ payload }) => {
          if (payload?.state) {
            currentState = { ...currentState, ...payload.state }
            for (const listener of listeners) {
              listener(currentState)
            }
          }
        })
        .subscribe()
    } catch {
      // ignore
    }
  }
}

initChannels()

/**
 * The Kiosk Hardware Digital Twin State Machine
 */
export const KioskEngine = {
  getState() {
    return currentState
  },

  subscribe(listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  canTransition(to) {
    return Boolean(STATE_TRANSITIONS[currentState.kioskState]?.includes(to))
  },

  setStationAndConnector({ stationId, stationName, connectorId, connectorLabel, powerKw, pricePerKwh } = {}) {
    let changed = false
    const next = { ...currentState }

    if (stationId && stationId !== currentState.stationId) {
      next.stationId = stationId
      changed = true
    }
    if (stationName && stationName !== currentState.stationName) {
      next.stationName = stationName
      changed = true
    }
    if (connectorId && connectorId !== currentState.connectorId) {
      next.connectorId = connectorId
      changed = true
    }
    if (connectorLabel && connectorLabel !== currentState.connectorLabel) {
      next.connectorLabel = connectorLabel
      changed = true
    }
    if (powerKw != null && powerKw !== currentState.powerKw) {
      next.powerKw = powerKw
      changed = true
    }
    if (pricePerKwh != null && pricePerKwh !== currentState.pricePerKwh) {
      next.pricePerKwh = pricePerKwh
      changed = true
    }

    if (!changed) return

    next.updatedAt = Date.now()
    currentState = next
    broadcastUpdate(currentState, 'config_update')
  },

  setDriverInfo({ driverName, vehicle, driverUserId }) {
    currentState = {
      ...currentState,
      driverName: driverName || currentState.driverName,
      vehicle: vehicle || currentState.vehicle,
      driverUserId: driverUserId || currentState.driverUserId,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'driver_update')
  },

  setBooking(booking) {
    if (currentState.kioskState !== 'IDLE') return false
    currentState = {
      ...currentState,
      reservationId: booking.id,
      stationId: booking.stationId,
      stationName: booking.stationName || booking.station,
      connectorId: booking.connectorId,
      connectorLabel: booking.connectorLabel || booking.charger,
      driverName: booking.customer,
      driverUserId: booking.userId,
      billingError: null,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'booking_selected')
    return true
  },

  setStreamSpeed(speed) {
    currentState = {
      ...currentState,
      streamSpeed: speed,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'speed_update')
  },

  /**
   * Action 1: [Plug Cable]
   * Physical hardware action: coupler plugged into EV inlet.
   * Transitions state to PLUGGED / AUTHENTICATING.
   */
  async plugCable() {
    if (currentState.kioskState !== 'IDLE') {
      return false
    }
    if (!currentState.reservationId) throw new Error('Select an approved booking before plugging in.')

    const logs = addLog(
      'info',
      'HARDWARE',
      `Physical connector coupled to vehicle port (${currentState.vehicle}). Control Pilot (CP) handshake initiating.`
    )

    currentState = {
      ...currentState,
      kioskState: 'PLUGGED',
      plugDetected: true,
      authenticating: true,
      faultState: null,
      faultDetails: null,
      chargingKwh: 0,
      costSoFar: 0,
      powerCurve: [],
      current: 0,
      voltage: 400.0,
      logs,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'state_change')

    // Update connector status in database to OCCUPIED
    try {
      if (currentState.connectorId) {
        await updateConnectorStatus(currentState.connectorId, 'OCCUPIED')
      }
    } catch {
      // Non-fatal if offline or demo
    }

    // Vehicle authorization handshake completion
    setTimeout(() => {
      if (currentState.kioskState === 'PLUGGED') {
        const authedLogs = addLog(
          'success',
          'OCPP',
          `Authorize.req(RFID: "AUTO-CHARGE-EV") -> Accepted (idTag: OK). EVSE ready for charging command.`
        )
        currentState = {
          ...currentState,
          authenticating: false,
          logs: authedLogs,
          updatedAt: Date.now(),
        }
        broadcastUpdate(currentState, 'auth_complete')
      }
    }, 700)

    return true
  },

  /**
   * Action 2: [Unplug Cable]
   */
  async unplugCable() {
    if (['CHARGING', 'COMPLETE', 'FAULTED'].includes(currentState.kioskState) && currentState.sessionId) {
      await this.stopAndUnplug()
      return true
    }

    const logs = addLog('info', 'HARDWARE', 'Connector uncoupled from vehicle. Pilot signal lost. Charger holstered.')
    currentState = {
      ...currentState,
      kioskState: 'IDLE',
      plugDetected: false,
      authenticating: false,
      powerStreamActive: false,
      current: 0,
      logs,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'state_change')

    try {
      if (currentState.connectorId) {
        await updateConnectorStatus(currentState.connectorId, 'AVAILABLE')
      }
    } catch {
      // Non-fatal
    }

    return true
  },

  /**
   * Action 3: [Start Session]
   * Validates the approved booking and transitions to CHARGING.
   */
  async startSession(options = {}) {
    if (currentState.kioskState !== 'PLUGGED') {
      return false
    }
    if (currentState.authenticating) throw new Error('Wait for the cable handshake to finish.')
    if (!currentState.reservationId) throw new Error('Select an approved booking first.')

    const targetSoc = options.targetSoc || currentState.targetSoc || 80
    const startSoc = options.startSoc || currentState.startSoc || 22
    const sessionId = `cs-${Date.now().toString(36)}`
    const nowIso = new Date().toISOString()
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const { data: bookedSession, error: startError } = await supabase.rpc('operator_start_booked_session', {
      p_reservation_id: currentState.reservationId,
      p_session_id: sessionId,
      p_vehicle: currentState.vehicle,
      p_start_soc: startSoc,
      p_target_soc: targetSoc,
    })
    if (startError) throw startError

    const logs1 = addLog('info', 'PAYMENT', `Rate locked at ₹${Number(bookedSession.price_per_kwh).toFixed(2)}/kWh. Wallet payment is due after charging ends.`)
    const logs2 = [
      {
        id: `log-${Date.now()}-c`,
        time: new Date().toLocaleTimeString(),
        level: 'success',
        source: 'HARDWARE',
        message: 'Pre-charge DC voltage match confirmed. High-voltage contactors CLOSED with positive latch.',
      },
      ...logs1,
    ]

    currentState = {
      ...currentState,
      kioskState: 'CHARGING',
      pricePerKwh: Number(bookedSession.price_per_kwh),
      targetSoc,
      startSoc,
      currentSoc: startSoc,
      chargingKwh: 0,
      costSoFar: 0,
      sessionId,
      paymentStatus: 'unpaid',
      billingError: null,
      sessionStartedAt: nowIso,
      sessionEndedAt: null,
      elapsedSeconds: 0,
      powerCurve: [{ t: nowTime, kw: currentState.powerKw }],
      logs: logs2,
      updatedAt: Date.now(),
    }

    broadcastUpdate(currentState, 'session_started')

    // Automatically begin power streaming loop
    this.togglePowerStream(true)

    return true
  },

  /**
   * Action 4: [Simulate Power Stream]
   * Toggles an automated timer loop incrementing kWh, running cost, and SOC % every second.
   */
  togglePowerStream(forceState) {
    const nextState = forceState !== undefined ? forceState : !currentState.powerStreamActive

    if (!nextState) {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      currentState = {
        ...currentState,
        powerStreamActive: false,
        updatedAt: Date.now(),
      }
      broadcastUpdate(currentState, 'stream_paused')
      return false
    }

    if (currentState.kioskState !== 'CHARGING') {
      return false
    }

    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    currentState = {
      ...currentState,
      powerStreamActive: true,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'stream_started')

    timerInterval = setInterval(() => {
      this.tick()
    }, 1000)

    return true
  },

  tick() {
    if (currentState.kioskState !== 'CHARGING' || !currentState.powerStreamActive) {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      return
    }

    const prev = currentState
    const speed = prev.streamSpeed || 1

    // Pack sizing and taper maths:
    // Power tapers from full rated kW (150kW) down to ~45kW near 100%
    const socSpan = Math.max(1, 100 - prev.startSoc)
    const progress = Math.min(1, Math.max(0, (prev.currentSoc - prev.startSoc) / socSpan))
    const currentKw = Math.round(prev.powerKw * (1 - progress * 0.55))

    // Base energy increment: (kW / 3600) per second * demo multiplier
    const deltaKwh = (currentKw / 3600) * speed
    const nextKwh = Number((prev.chargingKwh + deltaKwh).toFixed(3))
    const nextCost = Number((nextKwh * prev.pricePerKwh).toFixed(2))

    // 75 kWh nominal pack: delta % = (deltaKwh / 75) * 100
    const socGained = (deltaKwh / 75) * 100
    const nextSoc = Math.min(100, Math.round((prev.currentSoc + socGained) * 10) / 10)

    // Jittered voltage and current calculations
    const voltage = Number((396.0 + (Math.random() * 6 - 3)).toFixed(1))
    const current = Number(((currentKw * 1000) / voltage).toFixed(1))
    const nextElapsed = prev.elapsedSeconds + 1

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const updatedCurve =
      nextElapsed % 3 === 0 || prev.powerCurve.length === 0
        ? [...prev.powerCurve.slice(-25), { t: nowTime, kw: currentKw }]
        : prev.powerCurve

    let nextLogs = prev.logs
    if (nextElapsed % 5 === 0) {
      nextLogs = addLog(
        'info',
        'BMS',
        `Telemetry MeterValues: ${currentKw} kW · ${voltage}V · ${current}A · Energy: ${nextKwh.toFixed(2)} kWh · SoC: ${nextSoc.toFixed(0)}%`
      )
    }

    // Check if target SOC reached
    if (nextSoc >= prev.targetSoc) {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      const completeLogs = addLog(
        'success',
        'BMS',
        `Target battery State of Charge (${prev.targetSoc}%) reached! Contactor power draw cut to 0 kW. Ready for unplug.`
      )
      currentState = {
        ...prev,
        kioskState: 'COMPLETE',
        powerStreamActive: false,
        chargingKwh: nextKwh,
        costSoFar: nextCost,
        currentSoc: prev.targetSoc,
        current: 0,
        powerCurve: updatedCurve,
        elapsedSeconds: nextElapsed,
        logs: completeLogs,
        updatedAt: Date.now(),
      }
      broadcastUpdate(currentState, 'session_complete')
      this.finishSession().catch((error) => {
        currentState = { ...currentState, billingError: error.message }
        broadcastUpdate(currentState, 'billing_error')
      })
      return
    }

    currentState = {
      ...prev,
      chargingKwh: nextKwh,
      costSoFar: nextCost,
      currentSoc: nextSoc,
      voltage,
      current,
      powerCurve: updatedCurve,
      elapsedSeconds: nextElapsed,
      logs: nextLogs,
      updatedAt: Date.now(),
    }

    broadcastUpdate(currentState, 'telemetry')

    // Asynchronously update Supabase sessions row periodically
    if (nextElapsed % 5 === 0 && prev.sessionId) {
      try {
        supabase.rpc('operator_meter_booked_session', {
          p_session_id: prev.sessionId,
          p_energy_kwh: nextKwh,
          p_current_soc: Math.round(nextSoc),
        }).then(() => {})
      } catch {
        // ignore
      }
    }
  },

  /**
   * Action 5: [Simulate Hardware Fault]
   * Triggers OVER_CURRENT or CONNECTOR_LATCH_ERROR and sets station status to FAULTED.
   */
  async simulateHardwareFault(faultKey = 'OVER_CURRENT') {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    const fault = FAULT_DEFINITIONS[faultKey] || FAULT_DEFINITIONS.OVER_CURRENT

    const logs = addLog(
      'error',
      'HARDWARE',
      `[CRITICAL ALARM ${fault.code}] ${fault.label}: ${fault.description} HV contactors EMERGENCY TRIPPED open.`
    )

    currentState = {
      ...currentState,
      kioskState: 'FAULTED',
      powerStreamActive: false,
      faultState: faultKey,
      faultDetails: fault.description,
      current: 0,
      logs,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'fault')

    // Mark connector in DB as FAULTED
    try {
      if (currentState.connectorId) {
        await updateConnectorStatus(currentState.connectorId, 'FAULTED')
      }
    } catch {
      // non-fatal
    }

    // Try creating maintenance ticket in public.tickets table
    try {
      const ticketId = `TK-SIM-${Date.now().toString(36).toUpperCase()}`
      await supabase.from('tickets').insert({
        id: ticketId,
        title: `Hardware Fault: ${fault.label} (${fault.code})`,
        station_id: currentState.stationId,
        connector_id: currentState.connectorId,
        connector_label: currentState.connectorLabel,
        category: 'Hardware',
        priority: fault.severity || 'CRITICAL',
        status: 'OPEN',
        source: 'KIOSK_EMULATOR',
        reporter: 'VoltGrid Digital Twin Telemetry',
        description: `Automated hardware alert from Kiosk Simulator at ${currentState.stationName} (${currentState.connectorLabel}): ${fault.description}`,
      })
    } catch {
      // non-fatal
    }

    return true
  },

  /**
   * Action: [Emergency Stop]
   * Physical big red E-Stop button actuation.
   */
  async emergencyStop() {
    return this.simulateHardwareFault('EMERGENCY_STOP')
  },

  async finishSession() {
    if (!currentState.sessionId) return
    const { error } = await supabase.rpc('operator_finish_booked_session', {
      p_session_id: currentState.sessionId,
      p_energy_kwh: currentState.chargingKwh,
      p_current_soc: Math.round(currentState.currentSoc),
    })
    if (error) throw error
  },

  /** Stop delivery, finalize the bill, and make the connector available. */
  async stopAndUnplug() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    const prev = currentState
    const finalCost = prev.costSoFar
    const nowIso = new Date().toISOString()

    if (prev.sessionId && ['CHARGING', 'COMPLETE', 'FAULTED'].includes(prev.kioskState)) {
      try {
        await this.finishSession()
      } catch (error) {
        currentState = { ...currentState, powerStreamActive: false, billingError: error.message }
        broadcastUpdate(currentState, 'billing_error')
        throw error
      }
    }

    const logs1 = addLog('info', 'PAYMENT', `Session ended. Final amount due: ₹${finalCost.toFixed(2)}. Driver can pay from the active session screen.`)
    const logs2 = [
      {
        id: `log-${Date.now()}-end`,
        time: new Date().toLocaleTimeString(),
        level: 'success',
        source: 'HARDWARE',
        message: 'Contactors verified open. Solenoid latch retracted. Cable decoupled. Terminal returned to IDLE.',
      },
      ...logs1,
    ]

    // Reset connector in DB to AVAILABLE
    try {
      if (prev.connectorId) {
        await updateConnectorStatus(prev.connectorId, 'AVAILABLE')
      }
    } catch {
      // Non-fatal
    }

    currentState = {
      ...prev,
      kioskState: 'IDLE',
      plugDetected: false,
      authenticating: false,
      powerStreamActive: false,
      faultState: null,
      faultDetails: null,
      current: 0,
      voltage: 400.0,
      sessionEndedAt: nowIso,
      reservationId: null,
      logs: logs2,
      updatedAt: Date.now(),
    }

    broadcastUpdate(currentState, 'session_ended')
    return true
  },

  /**
   * Action: [Reset / Clear Fault]
   * Clears breaker and resets terminal back to IDLE (or PLUGGED if cable is still inserted).
   */
  async resetFault() {
    if (currentState.kioskState !== 'FAULTED') return false

    const logs = addLog('info', 'MAINTENANCE', 'Technician reset interlock tripped breaker. Isolation check OK. Terminal restored.')

    currentState = {
      ...currentState,
      kioskState: currentState.plugDetected ? 'PLUGGED' : 'IDLE',
      faultState: null,
      faultDetails: null,
      logs,
      updatedAt: Date.now(),
    }
    broadcastUpdate(currentState, 'fault_cleared')

    try {
      if (currentState.connectorId) {
        await updateConnectorStatus(
          currentState.connectorId,
          currentState.plugDetected ? 'OCCUPIED' : 'AVAILABLE'
        )
      }
    } catch {
      // Non-fatal
    }

    return true
  },
}

function subscribeToKiosk(onStoreChange) {
  return KioskEngine.subscribe(onStoreChange)
}

function getKioskSnapshot() {
  return KioskEngine.getState()
}

const kioskActions = {
  plugCable: () => KioskEngine.plugCable(),
  unplugCable: () => KioskEngine.unplugCable(),
  startSession: (options) => KioskEngine.startSession(options),
  togglePowerStream: (force) => KioskEngine.togglePowerStream(force),
  simulateHardwareFault: (faultKey) => KioskEngine.simulateHardwareFault(faultKey),
  emergencyStop: () => KioskEngine.emergencyStop(),
  stopAndUnplug: () => KioskEngine.stopAndUnplug(),
  resetFault: () => KioskEngine.resetFault(),
  setStationAndConnector: (data) => KioskEngine.setStationAndConnector(data),
  setDriverInfo: (data) => KioskEngine.setDriverInfo(data),
  setBooking: (booking) => KioskEngine.setBooking(booking),
  setStreamSpeed: (speed) => KioskEngine.setStreamSpeed(speed),
}

/**
 * Hook for full interactive control of the Kiosk Simulator
 */
export function useKioskSimulator() {
  const state = useSyncExternalStore(subscribeToKiosk, getKioskSnapshot)

  return {
    state,
    ...kioskActions,
  }
}

/**
 * Hook for consumer components (ActiveSession, Connectors, Dashboard)
 * to react to real-time Kiosk Hardware Twin telemetry broadcasts.
 */
export function useKioskTelemetry() {
  return useSyncExternalStore(subscribeToKiosk, getKioskSnapshot)
}
