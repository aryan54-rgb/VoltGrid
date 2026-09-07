import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Car,
  Building2,
  Truck,
  CheckCircle2,
  Clock,
  BatteryCharging,
  Sliders,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const ROLES = [
  {
    id: 'driver',
    label: 'EV Drivers',
    icon: Car,
    badge: 'On The Road',
    color: 'from-emerald-500 to-teal-500',
    tagline: 'Guaranteed Bays, Zero Range Anxiety',
    description:
      'Search live high-power chargers with real-time connector telemetry, lock in your charging bay before you arrive, and pay smoothly with in-app wallet integration.',
    features: [
      'Live bay status filter (CCS2, Type 2, CHAdeMO)',
      'Guaranteed 15-minute reservation hold window',
      'Live charging curve & battery telemetry streaming',
      'One-tap wallet billing with automated digital receipts',
    ],
    demoLink: '/driver/stations',
    demoCta: 'Explore Driver Map',
  },
  {
    id: 'operator',
    label: 'Station Operators',
    icon: Building2,
    badge: 'Infrastructure Owners',
    color: 'from-cyan-500 to-blue-500',
    tagline: 'Digital Twin Terminal & Revenue Optimization',
    description:
      'Turn chargers into high-yield profit centers. Monitor hardware telemetry, deploy dynamic time-of-use pricing rules, and run automated fault diagnosis over OCPP 2.0.1.',
    features: [
      'Digital twin kiosk control with real-time telemetry',
      'Dynamic kilowatt surge & off-peak pricing rules',
      'Remote solenoid latch release and emergency contactor control',
      'Real-time automated fault isolation & technician dispatch alerts',
    ],
    demoLink: '/operator/kiosk',
    demoCta: 'Launch Operator Twin',
  },
  {
    id: 'fleet',
    label: 'Fleet Managers',
    icon: Truck,
    badge: 'Depot & Enterprise',
    color: 'from-teal-400 to-emerald-500',
    tagline: 'Depot Scheduling & Cost-Per-Mile Telemetry',
    description:
      'Orchestrate 50 to 5,000 electric vans. Automate overnight depot charging to maximize off-peak tariff savings, eliminate peak demand charges, and streamline invoicing.',
    features: [
      'Smart depot schedule planner with priority sequencing',
      'Up to 34% cost savings via off-peak night scheduling',
      'Vehicle energy efficiency tracking (kWh per mile)',
      'Consolidated monthly corporate billing & tax-ready exports',
    ],
    demoLink: '/fleet',
    demoCta: 'View Fleet Analytics',
  },
]

export function RoleTabsSection() {
  const [activeTab, setActiveTab] = useState('driver')
  const [driverReserved, setDriverReserved] = useState(false)
  const [tariffRate, setTariffRate] = useState(0.42)
  const [fleetOptimized, setFleetOptimized] = useState(true)

  const currentRole = ROLES.find((r) => r.id === activeTab) || ROLES[0]

  return (
    <section id="solutions" className="relative scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
          >
            Built for Every Stakeholder
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Tailored Experiences for{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Every Persona
            </span>
          </h2>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Whether you are at the plug, running an infrastructure portfolio, or dispatching an electric logistics fleet,
            VoltGrid delivers specialized workspaces.
          </p>
        </div>

        {/* Tab Selection Navigation */}
        <div className="mt-12 flex justify-center">
          <div className="flex w-full max-w-xl items-center rounded-2xl border border-white/10 bg-[#090F1C]/90 p-1.5 backdrop-blur-xl shadow-xl">
            {ROLES.map((role) => {
              const Icon = role.icon
              const isActive = activeTab === role.id
              return (
                <button
                  key={role.id}
                  onClick={() => setActiveTab(role.id)}
                  className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 px-3 text-xs font-semibold transition-all sm:text-sm ${
                    isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeRoleGlow"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <Icon className={`relative z-10 h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span className="relative z-10">{role.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Interactive Showcase Container */}
        <div className="mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4 }}
              className="grid gap-8 rounded-3xl border border-white/10 bg-[#0B1220]/90 p-6 shadow-2xl backdrop-blur-2xl lg:grid-cols-12 lg:p-10"
            >
              {/* Left Column: Feature Highlights */}
              <div className="flex flex-col justify-between lg:col-span-5">
                <div>
                  <Badge className="border-emerald-500/30 bg-emerald-950/40 text-xs font-semibold text-emerald-300">
                    {currentRole.badge}
                  </Badge>
                  <h3 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{currentRole.tagline}</h3>
                  <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                    {currentRole.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {currentRole.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 border-t border-white/10 pt-6">
                  <Button
                    asChild
                    className="group border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 hover:text-white hover:shadow-emerald-glow"
                  >
                    <Link to={currentRole.demoLink} className="flex items-center gap-2 font-medium">
                      {currentRole.demoCta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Column: Interactive Role Mockup Widget */}
              <div className="lg:col-span-7">
                {activeTab === 'driver' && (
                  <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-[#070D18]/90 p-5 sm:p-6 shadow-inner">
                    {/* Mockup Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">
                          Nearby Superhub · 350kW DC Fast
                        </span>
                        <h4 className="text-base font-bold text-white sm:text-lg">Metro UltraCharge Bay 03</h4>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                        ● 3 Bays Available
                      </Badge>
                    </div>

                    {/* Driver Mini Card */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/10 bg-[#0E1626] p-3">
                        <p className="text-[11px] text-slate-400">Connector</p>
                        <p className="mt-1 font-semibold text-white">CCS2 Combo</p>
                        <p className="text-[10px] text-emerald-400">Up to 350 kW</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-[#0E1626] p-3">
                        <p className="text-[11px] text-slate-400">Distance</p>
                        <p className="mt-1 font-semibold text-white">1.8 miles</p>
                        <p className="text-[10px] text-slate-400">~4 mins away</p>
                      </div>
                      <div className="col-span-2 sm:col-span-1 rounded-xl border border-white/10 bg-[#0E1626] p-3">
                        <p className="text-[11px] text-slate-400">Energy Tariff</p>
                        <p className="mt-1 font-semibold text-white">$0.38 / kWh</p>
                        <p className="text-[10px] text-cyan-400">Wallet Supported</p>
                      </div>
                    </div>

                    {/* Interactive Reservation Trigger */}
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {driverReserved ? '⚡ Bay Held for You: Bay #A03' : 'Reserve Charging Bay Now'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {driverReserved
                              ? 'Slot guaranteed for the next 15:00 minutes. Contactor armed.'
                              : 'Lock your slot while in transit so no one takes it before you arrive.'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setDriverReserved(!driverReserved)}
                          className={
                            driverReserved
                              ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'border border-emerald-500/40 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold'
                          }
                        >
                          {driverReserved ? 'Cancel Hold' : 'Lock Bay in 1-Click'}
                        </Button>
                      </div>

                      {driverReserved && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-[#070C16] px-3 py-2 text-xs"
                        >
                          <span className="flex items-center gap-1.5 text-emerald-300">
                            <Clock className="h-3.5 w-3.5 animate-pulse" />
                            Reservation countdown: 14:38 remaining
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">PIN: 8492</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Live Battery Telemetry Bar */}
                    <div className="rounded-xl border border-white/10 bg-[#0E1626] p-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                          <BatteryCharging className="h-4 w-4 text-emerald-400" />
                          Vehicle: Porsche Taycan 4S
                        </span>
                        <span className="font-mono font-bold text-emerald-400">76% charged</span>
                      </div>
                      <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 shadow-[0_0_12px_#10b981]"
                          initial={{ width: '22%' }}
                          animate={{ width: '76%' }}
                          transition={{ duration: 1.5, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Speed: 146 kW</span>
                        <span>Estimated: 6 mins to 80%</span>
                        <span>Cost: $16.42</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'operator' && (
                  <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-[#070D18]/90 p-5 sm:p-6 shadow-inner">
                    {/* Mockup Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                          Digital Twin Console · Station #ST-402
                        </span>
                        <h4 className="text-base font-bold text-white sm:text-lg">Financial District Fast Hub</h4>
                      </div>
                      <Badge className="border-cyan-500/40 bg-cyan-950/40 text-cyan-300">OCPP 2.0.1 Connected</Badge>
                    </div>

                    {/* 4 Bay Status Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { bay: 'Bay 01', status: 'CHARGING', kw: '124 kW', color: 'text-emerald-400', border: 'border-emerald-500/40' },
                        { bay: 'Bay 02', status: 'AVAILABLE', kw: '350 kW Ready', color: 'text-cyan-400', border: 'border-cyan-500/40' },
                        { bay: 'Bay 03', status: 'RESERVED', kw: 'Holding (9m)', color: 'text-amber-400', border: 'border-amber-500/40' },
                        { bay: 'Bay 04', status: 'CHARGING', kw: '88 kW', color: 'text-emerald-400', border: 'border-emerald-500/40' },
                      ].map((b) => (
                        <div key={b.bay} className={`rounded-xl border ${b.border} bg-[#0E1626] p-3 text-center`}>
                          <p className="text-xs font-bold text-white">{b.bay}</p>
                          <p className={`mt-1 font-mono text-[10px] font-semibold ${b.color}`}>{b.status}</p>
                          <p className="mt-0.5 text-[10px] text-slate-400">{b.kw}</p>
                        </div>
                      ))}
                    </div>

                    {/* Interactive Tariff Tuning Engine */}
                    <div className="rounded-xl border border-white/10 bg-[#0E1626] p-4">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                          <Sliders className="h-4 w-4 text-cyan-400" />
                          Dynamic Surge Pricing Engine
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-400">
                          ${tariffRate.toFixed(2)} / kWh
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="0.65"
                        step="0.01"
                        value={tariffRate}
                        onChange={(e) => setTariffRate(parseFloat(e.target.value))}
                        className="mt-3 w-full accent-emerald-400 cursor-pointer"
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>Off-Peak ($0.25)</span>
                        <span>Estimated Daily Revenue: ${Math.round(tariffRate * 4200)}</span>
                        <span>High-Surge ($0.65)</span>
                      </div>
                    </div>

                    {/* Remote Operations Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0A111F] p-3 text-xs">
                      <span className="text-slate-400 font-mono text-[11px]">Remote Contactor Override:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-white/10 bg-[#0E1726] text-[11px] text-slate-300 hover:text-white"
                        >
                          <RefreshCw className="mr-1 h-3 w-3" /> Reboot Bay
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-emerald-500/30 bg-emerald-950/20 text-[11px] text-emerald-300 hover:text-emerald-200"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3" /> Diagnostics OK
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'fleet' && (
                  <div className="space-y-4 rounded-2xl border border-teal-500/20 bg-[#070D18]/90 p-5 sm:p-6 shadow-inner">
                    {/* Mockup Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div>
                        <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider">
                          Central Depot Logistics · Fleet ID #FL-88
                        </span>
                        <h4 className="text-base font-bold text-white sm:text-lg">Swift Courier East Depot (48 Vans)</h4>
                      </div>
                      <Badge className="border-teal-500/40 bg-teal-950/40 text-teal-300">All Vehicles Ready by 06:00</Badge>
                    </div>

                    {/* Fleet Stats Banner */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border border-white/10 bg-[#0E1626] p-3">
                        <p className="text-[11px] text-slate-400">Total Fleet</p>
                        <p className="mt-1 font-mono text-lg font-bold text-white">48 / 48</p>
                        <p className="text-[10px] text-emerald-400">100% Scheduled</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-[#0E1626] p-3">
                        <p className="text-[11px] text-slate-400">Avg Cost / Mile</p>
                        <p className="mt-1 font-mono text-lg font-bold text-emerald-400">$0.07</p>
                        <p className="text-[10px] text-slate-400">vs $0.28 Diesel</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-[#0E1626] p-3">
                        <p className="text-[11px] text-slate-400">Depot Savings</p>
                        <p className="mt-1 font-mono text-lg font-bold text-cyan-400">$4,820</p>
                        <p className="text-[10px] text-slate-400">This month</p>
                      </div>
                    </div>

                    {/* Depot Scheduling Engine */}
                    <div className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-white">Smart Night-Window Optimization</p>
                          <p className="text-xs text-slate-400">
                            Charges automatically staggered across 11:00 PM – 05:00 AM off-peak window.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setFleetOptimized(!fleetOptimized)}
                          className={
                            fleetOptimized
                              ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : 'border border-white/20 bg-slate-800 text-slate-300'
                          }
                        >
                          <TrendingDown className="mr-1.5 h-3.5 w-3.5 text-emerald-400" />
                          {fleetOptimized ? 'Optimized (-34% Tariff)' : 'Standard Immediate'}
                        </Button>
                      </div>

                      {/* Scheduled Van Timeline preview */}
                      <div className="mt-4 space-y-2">
                        {[
                          { unit: 'Van #01 - #16 (Morning Route)', time: '23:00 - 01:30', status: 'Priority Slot' },
                          { unit: 'Van #17 - #32 (Midday Route)', time: '01:30 - 03:45', status: 'Super Off-Peak' },
                          { unit: 'Van #33 - #48 (Afternoon Route)', time: '03:45 - 05:45', status: 'Pre-conditioned' },
                        ].map((van, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-white/5 bg-[#080D18] px-3 py-2 text-xs"
                          >
                            <span className="font-medium text-slate-300">{van.unit}</span>
                            <span className="font-mono text-cyan-400">{van.time}</span>
                            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                              {van.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
