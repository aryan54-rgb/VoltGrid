import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import { updateConnectorStatus } from '@/lib/api/stations'
import { purchase } from '@/lib/api/wallet'

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
  depositHeld: 0,
  depositAmount: 20.0,
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
      return { ...DEFAULT_STATE, ...parsed, powerStreamActive: false }
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
    if (currentState.kioskState !== 'IDLE' && currentState.kioskState !== 'COMPLETE') {
      return false
    }

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
    if (currentState.kioskState === 'CHARGING') {
      // Must stop session first or call stopAndUnplug
      await this.stopAndUnplug()
      return true
    }

    const logs = addLog('info', 'HARDWARE', 'Connector uncoupled from vehicle. Pilot signal lost. Charger holstered.')
    currentState = {
      ...currentState,
      kioskState: 'IDLE',
      plugDetected: false,
      authenticating: false,
      depositHeld: 0,
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
   * Holds deposit & transitions state to CHARGING.
   */
  async startSession(options = {}) {
    if (currentState.kioskState !== 'PLUGGED') {
      return false
    }

    const targetSoc = options.targetSoc || currentState.targetSoc || 80
    const startSoc = options.startSoc || currentState.startSoc || 22
    const depositAmount = options.depositAmount || currentState.depositAmount || 20.0
    const sessionId = `cs-${Date.now().toString(36)}`
    const nowIso = new Date().toISOString()
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const logs1 = addLog('info', 'PAYMENT', `Pre-authorization hold of $${depositAmount.toFixed(2)} placed on driver account.`)
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
      depositHeld: depositAmount,
      targetSoc,
      startSoc,
      currentSoc: startSoc,
      chargingKwh: 0,
      costSoFar: 0,
      sessionId,
      sessionStartedAt: nowIso,
      sessionEndedAt: null,
      elapsedSeconds: 0,
      powerCurve: [{ t: nowTime, kw: currentState.powerKw }],
      logs: logs2,
      updatedAt: Date.now(),
    }

    // Try creating session record in Supabase
    try {
      const { data: authData } = await supabase.auth.getUser()
      const effectiveUserId = currentState.driverUserId || authData?.user?.id
      if (effectiveUserId && currentState.stationId && currentState.connectorId) {
        await supabase.from('sessions').insert({
          id: sessionId,
          user_id: effectiveUserId,
          station_id: currentState.stationId,
          connector_id: currentState.connectorId,
          vehicle: currentState.vehicle,
          status: 'active',
          started_at: nowIso,
          start_soc: startSoc,
          current_soc: startSoc,
          target_soc: targetSoc,
          power_kw: currentState.powerKw,
          energy_kwh: 0,
          cost: 0,
          power_curve: [{ t: nowTime, kw: currentState.powerKw }],
        })
      }
    } catch {
      // Non-fatal if offline/demo
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
    const deltaKwh = ((currentKw * 1) / 3600) * speed * 2.5
    const nextKwh = Number((prev.chargingKwh + deltaKwh).toFixed(3))
    const nextCost = Number((nextKwh * prev.pricePerKwh).toFixed(2))

    // 75 kWh nominal pack: delta % = (deltaKwh / 75) * 100
    const socGained = Math.max(0.1, (deltaKwh / 75) * 100)
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
        supabase
          .from('sessions')
          .update({
            current_soc: Math.round(nextSoc),
            energy_kwh: nextKwh,
            cost: nextCost,
            power_kw: currentKw,
          })
          .eq('id', prev.sessionId)
          .then(() => {})
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

  /**
   * Action 6: [Stop & Unplug]
   * Settles total bill, deducts from wallet, and resets station state to IDLE.
   */
  async stopAndUnplug() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }

    const prev = currentState
    const finalKwh = prev.chargingKwh
    const finalCost = prev.costSoFar > 0 ? prev.costSoFar : Number((finalKwh * prev.pricePerKwh).toFixed(2))
    const nowIso = new Date().toISOString()

    const logs1 = addLog('info', 'PAYMENT', `Session ended. Releasing deposit hold ($${prev.depositHeld.toFixed(2)}). Final billing amount: $${finalCost.toFixed(2)}.`)
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

    // Deduct from wallet if cost > 0
    if (finalCost > 0) {
      try {
        const { data: authData } = await supabase.auth.getUser()
        const effectiveUserId = prev.driverUserId || authData?.user?.id
        if (effectiveUserId) {
          await purchase(effectiveUserId, finalCost, `Charging session at ${prev.stationName} (${finalKwh.toFixed(1)} kWh)`)
        }
      } catch {
        // Non-fatal if offline/demo
      }
    }

    // Complete session in Supabase sessions table
    if (prev.sessionId) {
      try {
        await supabase
          .from('sessions')
          .update({
            status: 'completed',
            ended_at: nowIso,
            energy_kwh: finalKwh,
            cost: finalCost,
            current_soc: Math.round(prev.currentSoc),
          })
          .eq('id', prev.sessionId)
      } catch {
        // Non-fatal
      }
    }

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
      depositHeld: 0,
      powerStreamActive: false,
      faultState: null,
      faultDetails: null,
      current: 0,
      voltage: 400.0,
      sessionEndedAt: nowIso,
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
