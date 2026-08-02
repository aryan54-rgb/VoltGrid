import { Link, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, BatteryCharging, MapPin, ShieldCheck } from 'lucide-react'

const points = [
  { icon: BatteryCharging, text: '12,400+ fast chargers across 5 regions' },
  { icon: MapPin, text: 'Live availability, booking and route planning' },
  { icon: ShieldCheck, text: '99.2% network uptime, 24/7 support' },
]

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden overflow-hidden bg-[#052e22] text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              'radial-gradient(600px 400px at 20% 10%, rgba(16,185,129,0.5), transparent), radial-gradient(500px 400px at 90% 90%, rgba(5,150,105,0.45), transparent)',
          }}
        />
        <Link to="/" className="relative flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-400 text-emerald-950">
            <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
          </span>
          <span className="text-lg font-semibold tracking-tight">VoltGrid</span>
        </Link>
        <motion.div
          className="relative max-w-md space-y-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <blockquote className="text-2xl font-medium leading-snug">
            “The charging network that finally feels like software, not infrastructure.”
          </blockquote>
          <ul className="space-y-3">
            {points.map((p) => (
              <li key={p.text} className="flex items-center gap-3 text-sm text-emerald-100/90">
                <p.icon className="h-4 w-4 shrink-0 text-emerald-300" />
                {p.text}
              </li>
            ))}
          </ul>
        </motion.div>
        <p className="relative text-xs text-emerald-100/60">© 2026 VoltGrid Inc. All mock data — demo environment.</p>
      </div>

      {/* form panel */}
      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
