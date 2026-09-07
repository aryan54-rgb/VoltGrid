import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts'
import {
  Zap,
  Activity,
  Radio,
  Server,
  TrendingUp,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const BASE_CHART_DATA = [
  { time: '00:00', power: 65, gridLoad: 42 },
  { time: '04:00', power: 48, gridLoad: 35 },
  { time: '08:00', power: 142, gridLoad: 88 },
  { time: '11:00', power: 185, gridLoad: 94 },
  { time: '14:00', power: 160, gridLoad: 82 },
  { time: '17:00', power: 215, gridLoad: 98 },
  { time: '20:00', power: 178, gridLoad: 86 },
  { time: '23:00', power: 92, gridLoad: 55 },
]

export function SaaSPreviewCard() {
  const [isSurge, setIsSurge] = useState(false)
  const [livePower, setLivePower] = useState(154.2)
  const [energyDelivered, setEnergyDelivered] = useState(14820)
  const [pingPulse, setPingPulse] = useState(false)

  // Live micro-telemetry jitter to simulate active high-frequency hardware streaming
  useEffect(() => {
    const timer = setInterval(() => {
      const delta = (Math.random() - 0.48) * (isSurge ? 5.2 : 2.1)
      setLivePower((prev) => {
        const next = prev + delta
        const minVal = isSurge ? 180 : 130
        const maxVal = isSurge ? 245 : 175
        return Math.min(Math.max(Number(next.toFixed(1)), minVal), maxVal)
      })

      setEnergyDelivered((prev) => prev + Math.floor(Math.random() * 3) + 1)
    }, 1200)

    return () => clearInterval(timer)
  }, [isSurge])

  const chartData = BASE_CHART_DATA.map((item) => ({
    ...item,
    power: isSurge ? Math.round(item.power * 1.35) : item.power,
  }))

  const handlePing = () => {
    setPingPulse(true)
    setTimeout(() => setPingPulse(false), 900)
  }

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Outer ambient glow */}
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/25 via-cyan-500/20 to-emerald-400/25 opacity-70 blur-xl transition-all duration-700 hover:opacity-100" />

      {/* Main Glassmorphic Chassis */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-[#0B111E]/90 shadow-2xl backdrop-blur-2xl">
        {/* Top Browser / Telemetry Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 bg-[#070C16]/80 px-4 py-3 text-xs sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              <span className="h-3 w-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
              <span className="h-3 w-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </span>
            <div className="ml-3 hidden items-center gap-1.5 rounded-md border border-white/10 bg-[#0E1726] px-3 py-1 font-mono text-[11px] text-slate-300 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>https://console.voltgrid.io/telemetry/live</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-0.5 text-[11px] font-medium text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>OCPP 2.0.1 LIVE</span>
              <span className="text-slate-400 font-mono">14ms</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePing}
              className="h-7 border-emerald-500/30 bg-[#0B1424] px-2.5 text-[11px] text-slate-200 hover:border-emerald-400 hover:bg-emerald-950/30"
            >
              <Radio className={`h-3.5 w-3.5 text-cyan-400 ${pingPulse ? 'animate-spin text-emerald-400' : ''}`} />
              <span className="hidden sm:inline">Ping Nodes</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="space-y-6 p-5 sm:p-7">
          {/* Top Metrics Row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {/* Metric 1: Power Stream */}
            <div className="group relative overflow-hidden rounded-xl border border-emerald-500/20 bg-[#0E1726]/80 p-4 transition-all hover:border-emerald-500/40">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Zap className="h-4 w-4 text-emerald-400" />
                  Instantaneous Output
                </span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">Active</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <AnimatePresence mode="popLayout">
                  <motion.span
                    key={livePower}
                    initial={{ opacity: 0.6, y: -2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl"
                  >
                    {livePower}
                  </motion.span>
                </AnimatePresence>
                <span className="font-mono text-xs font-semibold text-emerald-400">kW</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <TrendingUp className="h-3 w-3 text-emerald-400" />
                <span>Peak capacity 350 kW</span>
              </p>
            </div>

            {/* Metric 2: Active Station Bays */}
            <div className="group relative overflow-hidden rounded-xl border border-cyan-500/20 bg-[#0E1726]/80 p-4 transition-all hover:border-cyan-500/40">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Server className="h-4 w-4 text-cyan-400" />
                  Active Hubs
                </span>
                <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400">100% Up</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">42</span>
                <span className="text-xs text-slate-400">/ 42 Online</span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-cyan-400/90">
                <Activity className="h-3 w-3" />
                <span>0 faults reported</span>
              </p>
            </div>

            {/* Metric 3: Energy Delivered */}
            <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0E1726]/80 p-4 transition-all hover:border-emerald-500/30">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="h-4 w-4 text-emerald-300" />
                  Today&apos;s Energy
                </span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-300">24h Rolling</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {(energyDelivered / 1000).toFixed(2)}
                </span>
                <span className="font-mono text-xs font-semibold text-emerald-400">MWh</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">+14.2% vs yesterday</p>
            </div>

            {/* Metric 4: Grid Efficiency */}
            <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-[#0E1726]/80 p-4 transition-all hover:border-cyan-500/30">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Grid Factor
                </span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">Eco-Tune</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-mono text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {isSurge ? '94%' : '98.6%'}
                </span>
                <span className="text-xs text-slate-400">PF</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">Dynamic phase balancing</p>
            </div>
          </div>

          {/* Interactive Live Curve Chart & Sub-control */}
          <div className="rounded-xl border border-white/10 bg-[#0A101C]/90 p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-white">Aggregated Network Power Stream</h4>
                <p className="text-xs text-slate-400">Live 1-second telemetry refresh across all DC fast chargers</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  onClick={() => setIsSurge(!isSurge)}
                  className={`cursor-pointer transition-all ${
                    isSurge
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  }`}
                >
                  <Zap className="mr-1 h-3 w-3" />
                  {isSurge ? '⚡ Surge Load Active (+35%)' : 'Standard Balanced Grid'}
                </Badge>
              </div>
            </div>

            <div className="h-48 w-full sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="cyberEmeraldGlow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                      <stop offset="60%" stopColor="#06B6D4" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="time"
                    stroke="#475569"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0B111E',
                      border: '1px solid rgba(16,185,129,0.3)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                    formatter={(val) => [`${val} kW`, 'Power Load']}
                  />
                  <Area
                    type="monotone"
                    dataKey="power"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#cyberEmeraldGlow)"
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottom Live Hardware Stream Feed */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-[#080D18] px-4 py-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
              <span className="font-mono text-slate-300">Bay #A04 · CCS2 Combo 350kW:</span>
              <span className="text-emerald-400">Delivering 122.4 kW to Porsche Taycan (64% SoC)</span>
            </div>
            <a
              href="#telemetry-demo"
              className="inline-flex items-center gap-1 font-medium text-cyan-400 hover:text-cyan-300"
            >
              Test interactive terminal simulator
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
