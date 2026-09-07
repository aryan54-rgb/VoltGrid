import {
  Activity,
  Zap,
  Globe,
  BatteryCharging,
  ShieldCheck,
  Cpu,
  Clock,
  Radio,
  Sparkles,
} from 'lucide-react'

const TICKER_ITEMS = [
  { icon: ShieldCheck, label: 'Network Uptime', value: '99.9% SLA', color: 'text-emerald-400' },
  { icon: Globe, label: 'Metropolitan Coverage', value: '40+ Cities', color: 'text-cyan-400' },
  { icon: BatteryCharging, label: 'Energy Delivered', value: '12.4 MWh Today', color: 'text-emerald-300' },
  { icon: Cpu, label: 'Standard Protocol', value: 'OCPP 2.0.1 Native', color: 'text-cyan-300' },
  { icon: Zap, label: 'Active Fast Bays', value: '12,400+ Connectors', color: 'text-emerald-400' },
  { icon: Activity, label: 'Telemetry Response', value: '< 150ms Latency', color: 'text-cyan-400' },
  { icon: Sparkles, label: 'Smart Protocol', value: 'ISO 15118 Plug & Charge', color: 'text-emerald-300' },
  { icon: Clock, label: 'Daily Charge Sessions', value: '18,200+ Runs', color: 'text-cyan-300' },
  { icon: Radio, label: 'Cloud Diagnostics', value: '24/7 Auto-Recovery', color: 'text-emerald-400' },
]

export function NetworkTicker() {
  return (
    <div className="relative w-full overflow-hidden border-y border-white/10 bg-[#060911]/85 py-4 backdrop-blur-md">
      {/* Left/Right Fade Gradient Masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#060911] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#060911] to-transparent" />

      {/* Infinite Scrolling Track (duplicated for seamless continuous loop) */}
      <div className="animate-marquee flex items-center gap-6">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => {
          const Icon = item.icon
          return (
            <div
              key={idx}
              className="group flex items-center gap-3 rounded-full border border-white/10 bg-[#0C1322]/80 px-4 py-2 text-xs backdrop-blur-md transition-all hover:border-emerald-500/40 hover:bg-[#101A30]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                <Icon className={`h-3.5 w-3.5 ${item.color}`} />
              </div>
              <span className="font-medium text-slate-400">{item.label}:</span>
              <span className="font-mono font-semibold text-white group-hover:text-emerald-300">
                {item.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
