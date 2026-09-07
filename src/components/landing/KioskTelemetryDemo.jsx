import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import {
  Zap,
  Plug,
  BatteryCharging,
  Gauge,
  RotateCcw,
  OctagonAlert,
  Sparkles,
  CheckCircle2,
  Activity,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function KioskTelemetryDemo() {
  const [cablePlugged, setCablePlugged] = useState(false)
  const [chargingSpeed, setChargingSpeed] = useState(0) // 0 = off, 50 = 50kW, 150 = 150kW
  const [soc, setSoc] = useState(24) // % State of Charge
  const [kwh, setKwh] = useState(0)
  const [cost, setCost] = useState(0)
  const [voltage, setVoltage] = useState(0)
  const [currentA, setCurrentA] = useState(0)
  const [isFaulted, setIsFaulted] = useState(false)
  const [completed, setCompleted] = useState(false)

  const confettiFired = useRef(false)

  // Simulation tick loop
  useEffect(() => {
    if (!cablePlugged || chargingSpeed === 0 || isFaulted) {
      if (!cablePlugged) {
        setVoltage(0)
        setCurrentA(0)
      } else if (isFaulted) {
        setCurrentA(0)
      } else {
        // Plugged in and idle handshake
        setVoltage(402.1)
        setCurrentA(0)
      }
      return
    }

    const interval = setInterval(() => {
      // Voltage fluctuation around 400V - 408V
      const baseV = 400 + Math.random() * 6
      setVoltage(parseFloat(baseV.toFixed(1)))

      // Current calculation based on speed
      const targetA = (chargingSpeed * 1000) / baseV
      const jitterA = targetA + (Math.random() - 0.5) * 4
      setCurrentA(parseFloat(jitterA.toFixed(1)))

      // Increment battery and energy
      setKwh((prev) => parseFloat((prev + (chargingSpeed / 3600) * 8).toFixed(2)))
      setCost((prev) => parseFloat((prev + (chargingSpeed / 3600) * 8 * 0.38).toFixed(2)))

      setSoc((prev) => {
        const next = prev + (chargingSpeed === 150 ? 1.2 : 0.6)
        if (next >= 80 && !confettiFired.current) {
          confettiFired.current = true
          setCompleted(true)
          setChargingSpeed(0)
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#06B6D4', '#F59E0B'],
          })
          return 80
        }
        return Math.min(parseFloat(next.toFixed(1)), 100)
      })
    }, 500)

    return () => clearInterval(interval)
  }, [cablePlugged, chargingSpeed, isFaulted])

  const handlePlugToggle = () => {
    if (cablePlugged) {
      setCablePlugged(false)
      setChargingSpeed(0)
      setIsFaulted(false)
      setCompleted(false)
      confettiFired.current = false
    } else {
      setCablePlugged(true)
      setVoltage(401.4)
      setIsFaulted(false)
    }
  }

  const handleStartCharge = (speed) => {
    if (!cablePlugged) {
      setCablePlugged(true)
    }
    setIsFaulted(false)
    setCompleted(false)
    setChargingSpeed(speed)
  }

  const handleEmergencyStop = () => {
    setIsFaulted(true)
    setChargingSpeed(0)
    setCurrentA(0)
  }

  const handleReset = () => {
    setCablePlugged(false)
    setChargingSpeed(0)
    setSoc(24)
    setKwh(0)
    setCost(0)
    setVoltage(0)
    setCurrentA(0)
    setIsFaulted(false)
    setCompleted(false)
    confettiFired.current = false
  }

  return (
    <section id="telemetry-demo" className="relative scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-3 border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300"
          >
            Interactive Sandbox
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Live Kiosk & Telemetry{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Hardware Twin
            </span>
          </h2>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Interact with our simulated DC fast charger in real time. Plug the virtual cable, activate high-voltage
            relays, and observe real-time telemetry streaming over OCPP 2.0.1.
          </p>
        </div>

        {/* The Interactive Kiosk Chassis */}
        <div className="relative mt-12 overflow-hidden rounded-3xl border border-white/10 bg-[#0A101D]/90 p-6 shadow-2xl backdrop-blur-2xl sm:p-8 lg:p-10">
          {/* Top Chassis Lights & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-slate-950 shadow-[0_0_15px_#10b981]">
                <Zap className="h-6 w-6 font-black" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">VoltGrid SuperTwin EVSE · Bay #01</h3>
                <p className="font-mono text-xs text-slate-400">Firmware v4.8.2-rt · ISO 15118 Active Handshake</p>
              </div>
            </div>

            {/* Hardware Status Light Indicator */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full border px-4 py-1 text-xs font-mono font-semibold ${
                  isFaulted
                    ? 'border-rose-500/40 bg-rose-950/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                    : chargingSpeed > 0
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                    : cablePlugged
                    ? 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isFaulted
                      ? 'bg-rose-500 animate-ping'
                      : chargingSpeed > 0
                      ? 'bg-emerald-400 animate-pulse'
                      : cablePlugged
                      ? 'bg-cyan-400'
                      : 'bg-slate-500'
                  }`}
                />
                <span>
                  {isFaulted
                    ? 'E-STOP TRIPPED'
                    : chargingSpeed > 0
                    ? `CHARGING @ ${chargingSpeed}kW`
                    : cablePlugged
                    ? 'PLUGGED & READY'
                    : 'IDLE (DISENGAGED)'}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Controls Bar */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#080D18] p-4">
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Plug Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePlugToggle}
                className={
                  cablePlugged
                    ? 'border-cyan-500/50 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40'
                    : 'border-white/10 bg-[#0E1726] text-slate-200 hover:border-emerald-500/40'
                }
              >
                <Plug className="mr-1.5 h-4 w-4" />
                {cablePlugged ? 'Disconnect Cable' : 'Plug Cable [CCS2]'}
              </Button>

              {/* 50kW Fast Charge */}
              <Button
                size="sm"
                onClick={() => handleStartCharge(50)}
                disabled={isFaulted}
                className={
                  chargingSpeed === 50
                    ? 'border border-emerald-400 bg-emerald-500 text-slate-950 font-bold shadow-emerald-glow'
                    : 'border border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40'
                }
              >
                <Zap className="mr-1 h-3.5 w-3.5" />
                Simulate 50kW Charge
              </Button>

              {/* 150kW Ultra Charge */}
              <Button
                size="sm"
                onClick={() => handleStartCharge(150)}
                disabled={isFaulted}
                className={
                  chargingSpeed === 150
                    ? 'border border-cyan-400 bg-cyan-400 text-slate-950 font-bold shadow-cyan-glow'
                    : 'border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/40'
                }
              >
                <Flame className="mr-1 h-3.5 w-3.5 text-amber-400" />
                Boost to 150kW Ultra
              </Button>

              {/* Emergency Stop */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleEmergencyStop}
                className="border-rose-500/40 bg-rose-950/20 text-rose-400 hover:bg-rose-900/40 hover:text-rose-200"
              >
                <OctagonAlert className="mr-1.5 h-4 w-4" />
                Emergency Stop
              </Button>
            </div>

            {/* Reset */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="text-slate-400 hover:text-white"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {/* Telemetry Dials & Digital Gauges */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Dial 1: DC Bus Voltage */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D1525] p-4 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Gauge className="h-3.5 w-3.5 text-cyan-400" />
                  DC Bus Voltage
                </span>
                <span className="font-mono text-[10px] text-cyan-400">400V ARCH</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-extrabold text-white sm:text-4xl">
                  {voltage > 0 ? voltage : '0.0'}
                </span>
                <span className="font-mono text-xs font-bold text-cyan-400">V</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.min((voltage / 500) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Dial 2: Current Amperage */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D1525] p-4 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  Charging Current
                </span>
                <span className="font-mono text-[10px] text-emerald-400">MAX 500A</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-extrabold text-white sm:text-4xl">
                  {currentA > 0 ? currentA : '0.0'}
                </span>
                <span className="font-mono text-xs font-bold text-emerald-400">A</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.min((currentA / 400) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Dial 3: Active Power Output */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D1525] p-4 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Instant Power
                </span>
                <span className="font-mono text-[10px] text-amber-400">FLOW RATE</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-extrabold text-white sm:text-4xl">
                  {chargingSpeed > 0 ? chargingSpeed : 0}
                </span>
                <span className="font-mono text-xs font-bold text-amber-400">kW</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min((chargingSpeed / 150) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Dial 4: Total Energy & Cost */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0D1525] p-4 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                  Delivered Session
                </span>
                <span className="font-mono text-[10px] text-emerald-400">${cost.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-extrabold text-white sm:text-4xl">{kwh}</span>
                <span className="font-mono text-xs font-bold text-emerald-400">kWh</span>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 font-mono">Tariff: $0.38 / kWh</p>
            </div>
          </div>

          {/* Battery State of Charge Progress Bar */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#080E1A] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BatteryCharging className="h-5 w-5 text-emerald-400" />
                <span className="font-semibold text-white">Simulated EV Battery Pack (82 kWh Lithium-Ion)</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-sm">
                <span className="text-slate-400">Target: 80% (Quick-charge optimal)</span>
                <span className="font-extrabold text-emerald-400">{soc}% SoC</span>
              </div>
            </div>

            {/* Visual Animated Battery Bar */}
            <div className="relative mt-4 h-6 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900 p-1">
              <motion.div
                className={`h-full rounded-full transition-all duration-500 ${
                  isFaulted
                    ? 'bg-rose-500'
                    : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 shadow-[0_0_20px_#10b981]'
                }`}
                style={{ width: `${soc}%` }}
              >
                {chargingSpeed > 0 && !isFaulted && (
                  <div className="animate-beam h-full w-full bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                )}
              </motion.div>
            </div>

            {/* Milestones */}
            <div className="mt-2 flex justify-between text-[11px] font-mono text-slate-400">
              <span>0% Empty</span>
              <span>20% Reserve</span>
              <span className="text-emerald-400 font-bold">80% Fast Curve Cutoff</span>
              <span>100% Full</span>
            </div>
          </div>

          {/* Completion banner */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-emerald-300"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-bold">Charge Complete! 80% Optimal Target Reached</p>
                  <p className="text-xs text-slate-300">
                    Solenoid unlocked. Cable ready to return to holster. Total cost: ${cost.toFixed(2)}.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleReset}
                className="border border-emerald-400/40 bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400"
              >
                Run Again
              </Button>
            </motion.div>
          )}

          {/* Fault Banner */}
          {isFaulted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 flex items-center justify-between rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 text-rose-300"
            >
              <div className="flex items-center gap-2.5">
                <OctagonAlert className="h-5 w-5 text-rose-400" />
                <div>
                  <p className="text-sm font-bold">EMERGENCY STOP SHUTDOWN INITIATED</p>
                  <p className="text-xs text-slate-300">
                    High voltage relays opened in under 12 milliseconds. Contactor isolation verified.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={handleReset}
                className="border border-rose-400/40 bg-rose-500 text-white font-semibold hover:bg-rose-600"
              >
                Reset Breaker
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  )
}
