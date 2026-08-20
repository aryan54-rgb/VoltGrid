/**
 * Software-based Kiosk Telemetry Emulator Engine (SRS §2.6, §4.2).
 *
 * In the absence of physical IoT-enabled chargers, this module is the authoritative
 * source of charger state. It models the kiosk state machine and streams the same
 * three signals a real charger would push over the WebSocket channel —
 * `PlugDetected`, `Charging_kWh` and `FaultState` — so no application logic has to
 * change when real hardware is integrated behind the same contract.
 *
 * Frontend-only prototype: the transport is a local interval rather than a socket,
 * but the event shape is the contract the backend is expected to implement.
 */

/** Fault codes a charger can raise on its own, mapped to a human-readable cause. */
export const FAULT_CODES = {
  'E-231': 'Connector lock failure',
  'E-402': 'DC isolation fault',
  'E-118': 'Over-temperature cutback',
  'E-505': 'Ground continuity lost',
  'E-660': 'Payment terminal unreachable',
}

/** Kiosk state machine states, in the order a healthy session moves through them. */
export const KIOSK_STATES = ['IDLE', 'PLUGGED', 'CHARGING', 'COMPLETE', 'FAULTED']

/** Legal transitions of the kiosk state machine. */
const TRANSITIONS = {
  IDLE: ['PLUGGED', 'FAULTED'],
  PLUGGED: ['CHARGING', 'IDLE', 'FAULTED'],
  CHARGING: ['COMPLETE', 'FAULTED'],
  COMPLETE: ['IDLE'],
  FAULTED: ['IDLE'],
}

export function canTransition(from, to) {
  return Boolean(TRANSITIONS[from]?.includes(to))
}

/**
 * Deterministic pseudo-random source. The emulator must produce a repeatable
 * stream so a demo run looks the same twice.
 */
function seeded(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/**
 * Creates an emulator for a single connector.
 *
 * @param {object} options
 * @param {string} options.connectorId  connector being emulated
 * @param {number} options.powerKw      connector power rating, drives the kWh ramp
 * @param {number} [options.targetKwh]  energy at which the session self-completes
 * @param {number} [options.tickMs]     emitted telemetry interval
 * @param {number} [options.faultRate]  chance per tick of raising a fault code
 * @param {number} [options.seed]       seed for repeatable runs
 * @returns an object with `subscribe`, `plugIn`, `unplug`, `stop` and `snapshot`
 */
export function createKioskEmulator({
  connectorId,
  powerKw = 50,
  targetKwh = 42,
  tickMs = 1000,
  faultRate = 0,
  seed = 1,
} = {}) {
  const rand = seeded(seed)
  const listeners = new Set()
  let timer = null

  let state = {
    connectorId,
    kioskState: 'IDLE',
    plugDetected: false,
    chargingKwh: 0,
    powerKw,
    faultState: null,
    updatedAt: 0,
  }

  function emit() {
    const frame = { ...state }
    for (const fn of listeners) fn(frame)
  }

  function move(next, patch = {}) {
    if (!canTransition(state.kioskState, next)) return false
    state = { ...state, ...patch, kioskState: next, updatedAt: state.updatedAt + 1 }
    emit()
    return true
  }

  function tick() {
    if (state.kioskState !== 'CHARGING') return

    if (faultRate > 0 && rand() < faultRate) {
      const codes = Object.keys(FAULT_CODES)
      const code = codes[Math.floor(rand() * codes.length)]
      move('FAULTED', { faultState: code, plugDetected: true })
      return
    }

    // kWh delivered this tick, derived from the connector's power rating.
    const deltaKwh = (powerKw * (tickMs / 1000)) / 3600
    const nextKwh = Math.min(targetKwh, state.chargingKwh + deltaKwh)
    state = { ...state, chargingKwh: nextKwh, updatedAt: state.updatedAt + 1 }

    if (nextKwh >= targetKwh) move('COMPLETE')
    else emit()
  }

  return {
    /** Register a telemetry listener. Returns an unsubscribe function. */
    subscribe(fn) {
      listeners.add(fn)
      fn({ ...state })
      if (!timer) timer = setInterval(tick, tickMs)
      return () => {
        listeners.delete(fn)
        if (listeners.size === 0 && timer) {
          clearInterval(timer)
          timer = null
        }
      }
    },
    /** PlugDetected = true, then the session authorises and starts charging. */
    plugIn() {
      if (move('PLUGGED', { plugDetected: true })) move('CHARGING')
    },
    unplug() {
      move('IDLE', { plugDetected: false, chargingKwh: 0, faultState: null })
    },
    /** Force a fault code, used to demonstrate automatic ticket generation. */
    raiseFault(code) {
      move('FAULTED', { faultState: code in FAULT_CODES ? code : 'E-402' })
    },
    snapshot() {
      return { ...state }
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
      listeners.clear()
    },
  }
}
