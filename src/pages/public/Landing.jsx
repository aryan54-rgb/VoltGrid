import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  Sun,
  Moon,
  ArrowRight,
  Cpu,
  Activity,
  Layers,
  Lock,
  Wallet,
  CalendarCheck,
  Quote,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/context/theme'

// Import our modular cyber-energy landing components
import { EnergyBackground } from '@/components/landing/EnergyBackground'
import { HeroSection } from '@/components/landing/HeroSection'
import { NetworkTicker } from '@/components/landing/NetworkTicker'
import { RoleTabsSection } from '@/components/landing/RoleTabsSection'
import { KioskTelemetryDemo } from '@/components/landing/KioskTelemetryDemo'
import { PricingSection } from '@/components/landing/PricingSection'

const LOGOS = ['Northwind Mobility', 'Helio Transit', 'Arcadia Logistics', 'Beacon Fleet', 'Orbit Rideshare']

const CORE_CAPABILITIES = [
  {
    icon: Cpu,
    title: 'OCPP 2.0.1 Native Gateway',
    description:
      'Universal hardware compatibility. Connect ABB, Tritium, Schneider, and custom EVSE kiosks without proprietary vendor lock-in.',
    badge: 'Hardware Agnostic',
  },
  {
    icon: Activity,
    title: 'Sub-Second Cloud Telemetry',
    description:
      'Stream voltage, current, power factor, and thermal dissipation metrics at millisecond frequencies directly to your monitoring dashboards.',
    badge: '< 150ms Latency',
  },
  {
    icon: Layers,
    title: 'Dynamic Phase Load Balancing',
    description:
      'Intelligent grid curtailment algorithm automatically redistributes power across active bays to prevent costly utility demand spikes.',
    badge: 'Eco-Grid Peak Shaving',
  },
  {
    icon: CalendarCheck,
    title: 'Contactor-Guaranteed Reservations',
    description:
      'Drivers hold bays in advance. Automated hardware relays lock out unreserved vehicles until the verified driver arrives and scans in.',
    badge: 'Zero Bay Collisions',
  },
  {
    icon: Wallet,
    title: 'Split-Settlement Wallet Engine',
    description:
      'Unified billing orchestrates driver wallet debits, operator revenue splits, and tax compliance automatically on session completion.',
    badge: 'Instant Payouts',
  },
  {
    icon: Lock,
    title: 'ISO 15118 Encrypted Handshake',
    description:
      'End-to-end TLS 1.3 cryptographic key exchange ensures Plug & Charge vehicle authentication with zero risk of connector spoofing.',
    badge: 'Bank-Grade Security',
  },
]

const TESTIMONIALS = [
  {
    quote:
      'We migrated 90 delivery vans onto VoltGrid and slashed our depot electricity bill by 28%. The automated off-peak night scheduling alone paid for the system within two months.',
    name: 'Sofia Marino',
    role: 'Head of Fleet Operations, Swift Logistics',
    metric: '-28% Fleet Energy Cost',
  },
  {
    quote:
      'Real-time digital twin monitoring transformed our portfolio. We now catch connector latch faults before drivers even report them, maintaining a 99.8% uptime across all our fast hubs.',
    name: 'Amara Diallo',
    role: 'Managing Director, CityCharge Infrastructure',
    metric: '99.8% Station Availability',
  },
  {
    quote:
      'I commute 40 miles daily. Reserving my bay on the way into the city guarantees I never waste time queuing. The live battery curve on my phone is unbelievably responsive.',
    name: 'Jordan Lee',
    role: 'EV Driver & Daily Commuter, San Francisco',
    metric: 'Zero Queuing Time',
  },
]

const FOOTER_COLUMNS = [
  {
    title: 'Platform',
    links: [
      { label: 'Network Map', href: '/driver/stations' },
      { label: 'Kiosk Simulator', href: '/operator/kiosk' },
      { label: 'Role Features', href: '#solutions' },
      { label: 'Pricing Plans', href: '#pricing' },
      { label: 'Architecture Modules', href: '/modules' },
    ],
  },
  {
    title: 'Stakeholders',
    links: [
      { label: 'For EV Drivers', href: '/register?role=driver' },
      { label: 'For Station Operators', href: '/register?role=operator' },
      { label: 'For Commercial Fleets', href: '/register?role=fleet' },
      { label: 'For Hardware Manufacturers', href: '#features' },
    ],
  },
  {
    title: 'Standards & Protocols',
    links: [
      { label: 'OCPP 2.0.1 & 1.6J', href: '#features' },
      { label: 'ISO 15118 Plug & Charge', href: '#features' },
      { label: 'OpenADR 2.0b Demand Response', href: '#features' },
      { label: 'API & Webhooks', href: '/modules' },
    ],
  },
  {
    title: 'Company & Trust',
    links: [
      { label: 'System Status (99.9%)', href: '#' },
      { label: 'Security & Encryption', href: '#' },
      { label: 'Privacy Policy', href: '#' },
      { label: 'Contact Engineering', href: '#' },
    ],
  },
]

function Navbar() {
  const { theme, setTheme } = useTheme()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/10 bg-[#060A14]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-transform group-hover:scale-105">
            <Zap className="h-5 w-5 font-black fill-current" />
          </span>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1">
              VoltGrid <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">SaaS</span>
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden items-center gap-7 md:flex">
          <a href="#solutions" className="text-xs font-medium text-slate-300 transition-colors hover:text-emerald-400">
            Solutions
          </a>
          <a href="#telemetry-demo" className="text-xs font-medium text-slate-300 transition-colors hover:text-cyan-400">
            Hardware Sandbox
          </a>
          <a href="#features" className="text-xs font-medium text-slate-300 transition-colors hover:text-emerald-400">
            Capabilities
          </a>
          <a href="#pricing" className="text-xs font-medium text-slate-300 transition-colors hover:text-emerald-400">
            Pricing
          </a>
          <Link to="/modules" className="text-xs font-medium text-slate-300 transition-colors hover:text-emerald-400">
            Modules
          </Link>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="text-slate-300 hover:text-white hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" asChild className="hidden text-xs font-medium text-slate-200 hover:text-white hover:bg-white/5 sm:inline-flex">
            <Link to="/login">Sign In</Link>
          </Button>

          <Button
            asChild
            className="rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-teal-600 px-4 text-xs font-semibold text-white shadow-emerald-glow hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
          >
            <Link to="/register">Launch Console</Link>
          </Button>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-white/10 bg-[#070D1A] px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 py-1"
            >
              Solutions
            </a>
            <a
              href="#telemetry-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-cyan-300 py-1"
            >
              Hardware Sandbox
            </a>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 py-1"
            >
              Capabilities
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 py-1"
            >
              Pricing
            </a>
            <Link
              to="/modules"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium text-slate-200 py-1"
            >
              Modules
            </Link>
            <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
              <Button asChild variant="outline" className="flex-1 text-xs">
                <Link to="/login">Sign In</Link>
              </Button>
              <Button asChild className="flex-1 bg-emerald-500 text-xs font-bold text-slate-950">
                <Link to="/register">Get Started</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}

export default function Landing() {
  return (
    <div className="relative min-h-screen bg-[#070A12] text-slate-100 selection:bg-emerald-500/30 selection:text-white">
      {/* Sticky Translucent Navbar */}
      <Navbar />

      {/* Ambient Electric Energy Background */}
      <EnergyBackground />

      <main className="relative z-10">
        {/* Section 1: Hero Section with Live SaaS Preview */}
        <HeroSection />

        {/* Section 2: Continuous Auto-scrolling Network Stats Ticker */}
        <NetworkTicker />

        {/* Brand Logos Bar */}
        <section className="relative border-b border-white/10 bg-[#060911]/60 py-8 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-center font-mono text-[11px] uppercase tracking-widest text-slate-500">
              Trusted by Progressive Fleet & Charging Networks
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {LOGOS.map((name, i) => (
                <span
                  key={i}
                  className="font-mono text-xs font-semibold text-slate-400/80 transition-colors hover:text-emerald-400"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Role-Based Feature Tabs (Drivers, Operators, Fleet Managers) */}
        <RoleTabsSection />

        {/* Section 4: Live Kiosk & Telemetry Interactive Hardware Twin Widget */}
        <KioskTelemetryDemo />

        {/* Section 5: Core Enterprise Capabilities Grid */}
        <section id="features" className="relative scroll-mt-24 py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <Badge
                variant="outline"
                className="mb-3 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
              >
                Core Architecture
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                Engineered for High-Voltage{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  Reliability
                </span>
              </h2>
              <p className="mt-4 text-base text-slate-400 sm:text-lg">
                VoltGrid bridges cloud software with mission-critical power electronics. Built on open standards with
                zero vendor lock-in.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CORE_CAPABILITIES.map((cap, i) => {
                const Icon = cap.icon
                return (
                  <motion.div
                    key={i}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A101D]/90 p-6 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge className="border-white/10 bg-[#0E1626] font-mono text-[10px] text-slate-400">
                        {cap.badge}
                      </Badge>
                    </div>

                    <h3 className="mt-5 text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {cap.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">{cap.description}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Section 6: Customer Testimonials & Verified Metrics */}
        <section className="relative border-y border-white/10 bg-[#060911]/80 py-20 lg:py-28 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <Badge
                variant="outline"
                className="mb-3 border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300"
              >
                Validated Impact
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Trusted Across Kilowatts & Miles
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {TESTIMONIALS.map((t, idx) => (
                <div
                  key={idx}
                  className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B1220]/90 p-6 backdrop-blur-xl shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <Quote className="h-6 w-6 text-emerald-400/40" />
                      <Badge className="border-emerald-500/40 bg-emerald-950/40 text-[10px] font-mono text-emerald-300">
                        {t.metric}
                      </Badge>
                    </div>
                    <p className="mt-4 text-xs leading-relaxed text-slate-300 italic sm:text-sm">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>

                  <div className="mt-6 border-t border-white/10 pt-4">
                    <p className="text-xs font-bold text-white">{t.name}</p>
                    <p className="text-[11px] text-slate-400">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 7: Modern Pricing & Role Onboarding Cards */}
        <PricingSection />

        {/* Section 8: High-Impact Conversion Banner */}
        <section className="relative py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-[#0C172B] to-[#070D18] p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-14">
              {/* Internal glowing orbs */}
              <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

              <div className="relative z-10 mx-auto max-w-2xl">
                <Badge className="mb-4 border-emerald-400/40 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  ⚡ 5-Minute Onboarding
                </Badge>
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Ready to Plug Into the Cyber Grid?
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                  Join thousands of drivers, station operators, and fleet managers orchestrating high-voltage charging
                  with guaranteed reliability.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Button
                    size="lg"
                    asChild
                    className="h-12 rounded-xl border border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-teal-600 px-7 font-bold text-white shadow-emerald-glow hover:shadow-[0_0_35px_rgba(16,185,129,0.55)]"
                  >
                    <Link to="/register" className="flex items-center gap-2">
                      Launch Console / Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-12 rounded-xl border border-white/10 bg-[#0C1527] px-6 font-medium text-slate-200 hover:border-cyan-500/40 hover:text-cyan-300"
                  >
                    <Link to="/driver/stations">Explore Live Stations</Link>
                  </Button>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Free driver accounts
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> Instant operator deployment
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> 24/7 technical hotline
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Comprehensive Modern Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[#050811] text-xs text-slate-400">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-10 md:grid-cols-5">
            {/* Brand column */}
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-black">
                  <Zap className="h-4 w-4 fill-current" />
                </span>
                <span className="text-base font-extrabold tracking-tight text-white">VoltGrid</span>
              </Link>
              <p className="mt-3 max-w-sm text-xs leading-relaxed text-slate-400">
                The next-generation smart charging infrastructure network. Seamless EV charging telemetry, guaranteed
                bay reservations, and commercial fleet optimization.
              </p>

              {/* Status Ping */}
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/30 px-3 py-1 text-[11px] text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>All 42 SuperHubs Operational · 99.9% Uptime</span>
              </div>
            </div>

            {/* Links Columns */}
            {FOOTER_COLUMNS.slice(0, 3).map((col) => (
              <div key={col.title}>
                <p className="font-semibold text-white">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link to={link.href} className="transition-colors hover:text-emerald-400">
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className="transition-colors hover:text-emerald-400">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} VoltGrid Infrastructure Technologies Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-slate-400">OCPP 2.0.1 Ready</span>
              <span className="hover:text-slate-400">ISO 15118 Certified</span>
              <span className="hover:text-slate-400">SOC 2 Type II Audited</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
