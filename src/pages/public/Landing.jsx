import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, CartesianGrid,
} from 'recharts'
import {
  Zap,
  Sun,
  Moon,
  ArrowRight,
  Car,
  Truck,
  Building2,
  ShieldCheck,
  MapPin,
  CalendarClock,
  Wallet,
  BarChart3,
  LifeBuoy,
  Search,
  PlugZap,
  Check,
  Quote,
  TrendingUp,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CHART_COLORS, GRID, axisProps } from '@/components/shared/chart'
import { useTheme } from '@/context/theme'
import { ROLE_META } from '@/lib/nav'
import { cn } from '@/lib/utils'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
}

const heroSeries = [
  { label: 'Mon', energy: 32 },
  { label: 'Tue', energy: 41 },
  { label: 'Wed', energy: 38 },
  { label: 'Thu', energy: 52 },
  { label: 'Fri', energy: 61 },
  { label: 'Sat', energy: 54 },
  { label: 'Sun', energy: 68 },
]

const logos = ['Northwind Mobility', 'Helio Transit', 'Arcadia Logistics', 'Beacon Fleet', 'Orbit Rideshare']

const features = [
  {
    icon: MapPin,
    title: 'Live availability',
    body: 'See which bays are free right now, with connector type, power output and price before you drive over.',
  },
  {
    icon: CalendarClock,
    title: 'Slot booking',
    body: 'Reserve a charger for a time window and arrive knowing the bay is held for you.',
  },
  {
    icon: Truck,
    title: 'Fleet management',
    body: 'Schedule depot charging, track cost per vehicle and keep every van on the road.',
  },
  {
    icon: Wallet,
    title: 'Wallet payments',
    body: 'Top up once and pay per session, or move a business account onto consolidated monthly invoicing.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    body: 'Revenue, utilisation and energy mix across every site, refreshed as sessions complete.',
  },
  {
    icon: LifeBuoy,
    title: '24/7 support',
    body: 'Report a fault from the charger screen and reach a real engineer at any hour.',
  },
]

const steps = [
  {
    icon: Search,
    title: 'Find a charger',
    body: 'Search the map by connector, speed and price, and filter to what your car actually supports.',
  },
  {
    icon: CalendarClock,
    title: 'Book your slot',
    body: 'Pick a time that suits you. We hold the bay and send a reminder before it starts.',
  },
  {
    icon: PlugZap,
    title: 'Plug in and go',
    body: 'Start the session from your phone, watch it live, and pay automatically when it ends.',
  },
]

const stats = [
  { value: '12,400+', label: 'Chargers on the network' },
  { value: '99.2%', label: 'Average network uptime' },
  { value: '45M', label: 'kWh delivered' },
  { value: '120k', label: 'Drivers charging monthly' },
]

const roleIcons = {
  driver: Car,
  fleet: Truck,
  operator: Building2,
  admin: ShieldCheck,
}

const roleBlurbs = {
  driver: 'Find stations, book a slot, run a session and pay from your wallet.',
  fleet: 'Schedule vehicle charging, watch cost per mile and settle one monthly invoice.',
  operator: 'Run your sites: connector health, reservations, pricing and revenue.',
  admin: 'Oversee the whole network — users, stations, growth and platform health.',
}

const testimonials = [
  {
    quote:
      'We moved 90 vans onto VoltGrid and cut our energy bill by 18% in a quarter. Depot scheduling alone paid for it.',
    name: 'Sofia Marino',
    role: 'Head of Fleet, Swift Logistics',
  },
  {
    quote:
      'Utilisation across our twelve sites is finally visible in one place. Pricing changes that used to take a week now take an afternoon.',
    name: 'Amara Diallo',
    role: 'Network Operator, CityCharge',
  },
  {
    quote:
      'I book a bay on the way home and it is always free when I arrive. I have not queued for a charger in months.',
    name: 'Jordan Lee',
    role: 'EV driver, San Francisco',
  },
]

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For drivers who charge now and then.',
    features: [
      'Search every station on the network',
      'One active reservation at a time',
      'Pay per session from your wallet',
      'Charging history and receipts',
    ],
    cta: 'Get started',
    to: '/register',
    highlighted: false,
  },
  {
    name: 'Plus',
    price: '$9.99',
    period: 'per month',
    description: 'For people who drive electric every day.',
    features: [
      'Everything in Free',
      'Unlimited advance bookings',
      '10% off every kWh you charge',
      'Priority support and free cancellations',
      'Member pricing in the marketplace',
    ],
    cta: 'Start free trial',
    to: '/register',
    highlighted: true,
  },
  {
    name: 'Business',
    price: 'Custom',
    period: 'billed annually',
    description: 'For fleets and station operators.',
    features: [
      'Fleet dashboard and depot scheduling',
      'Consolidated monthly invoicing',
      'Role-based access for your team',
      'API access and webhooks',
      'Dedicated account manager',
    ],
    cta: 'Contact sales',
    to: '/register',
    highlighted: false,
  },
]

const footerColumns = [
  { title: 'Product', links: ['Features', 'Network map', 'Pricing', 'Mobile app', 'Changelog'] },
  { title: 'Solutions', links: ['For drivers', 'For fleets', 'For operators', 'For property owners'] },
  { title: 'Company', links: ['About', 'Careers', 'Press', 'Contact'] },
  { title: 'Resources', links: ['Documentation', 'API reference', 'Support centre', 'Status', 'Privacy'] },
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
        <Zap className="h-4 w-4" fill="currentColor" />
      </span>
      <span className="text-base font-semibold tracking-tight text-foreground">VoltGrid</span>
    </Link>
  )
}

function Navbar() {
  const { theme, setTheme } = useTheme()
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#network" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Network
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Pricing
            </a>
            <Link to="/modules" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Modules
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Get started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}

function HeroPreview() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-emerald-500/5">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </span>
        <span className="mx-auto rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
          app.voltgrid.com/network
        </span>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Network overview</p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
          <Badge variant="success" className="text-[11px]">
            <TrendingUp /> +12.4%
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Energy', value: '346 MWh' },
            { label: 'Sessions', value: '18,204' },
            { label: 'Uptime', value: '99.2%' },
          ].map((tile) => (
            <div key={tile.label} className="rounded-lg border bg-background/60 p-3">
              <p className="text-[11px] text-muted-foreground">{tile.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums sm:text-base">{tile.value}</p>
            </div>
          ))}
        </div>

        <div className="h-[150px] w-full [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={heroSeries} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
              <defs>
                <linearGradient id="landingHeroEnergy" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="label" {...axisProps} />
              <Area
                type="monotone"
                dataKey="energy"
                name="Energy"
                stroke={CHART_COLORS[0]}
                strokeWidth={2}
                fill="url(#landingHeroEnergy)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description, className }) {
  return (
    <motion.div {...fadeUp} transition={{ duration: 0.5 }} className={cn('mx-auto max-w-2xl text-center', className)}>
      {eyebrow && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>}
    </motion.div>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 lg:pb-24 lg:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="outline" className="mb-5 rounded-full px-3 py-1 text-xs font-normal">
              <Sparkles /> Now live in 40 cities
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Charging that keeps every EV moving
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              VoltGrid connects drivers, fleets and station operators on one network. Find a charger, reserve
              the bay, run the session and settle up — without leaving the app.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" asChild>
                <Link to="/register">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/login">Log in</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">No card required · Cancel any time</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-14 max-w-4xl"
          >
            <HeroPreview />
          </motion.div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <motion.p {...fadeUp} transition={{ duration: 0.4 }} className="text-center text-xs uppercase tracking-wider text-muted-foreground">
            Powering charging for
          </motion.p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {logos.map((name, i) => (
              <motion.span
                key={name}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="text-sm font-semibold tracking-tight text-muted-foreground/70"
              >
                {name}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="Features"
          title="Everything a charging network needs"
          description="One platform for the driver at the plug, the manager watching the depot and the operator running the sites."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              {...fadeUp}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ y: -2 }}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-sm font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="How it works"
            title="Charged in three steps"
            description="From opening the app to unplugging, the whole trip takes a couple of taps."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium tabular-nums text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-medium">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats band */}
      <section id="network" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-8 rounded-2xl border bg-card p-8 shadow-sm sm:grid-cols-2 lg:grid-cols-4 lg:p-10">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="text-center"
              >
                <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{s.value}</p>
                <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <SectionHeading
          eyebrow="Built for every role"
          title="One network, four ways to use it"
          description="Each role gets a workspace scoped to what it needs. Open any of them and look around."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(ROLE_META).map(([key, role], i) => {
            const Icon = roleIcons[key]
            return (
              <motion.div
                key={key}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -2 }}
                className="flex flex-col rounded-xl border bg-card p-5 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 text-sm font-medium">{role.label}</h3>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground">{roleBlurbs[key]}</p>
                <Link
                  to={role.home}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  View demo dashboard
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-y bg-muted/30 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="Customers" title="Trusted on the road and at the depot" />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.figure
                key={t.name}
                {...fadeUp}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="flex h-full flex-col rounded-xl border bg-card p-6 shadow-sm"
              >
                <Quote className="h-5 w-5 text-primary/60" />
                <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 border-t pt-4">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          eyebrow="Pricing"
          title="Simple plans, no surprises"
          description="Charge pay-as-you-go, or subscribe for cheaper kWh and unlimited bookings."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              {...fadeUp}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={cn(
                'flex flex-col rounded-xl border bg-card p-6 shadow-sm',
                tier.highlighted && 'border-primary/50 shadow-lg ring-1 ring-primary/20 lg:-mt-4 lg:pb-10'
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{tier.name}</h3>
                {tier.highlighted && <Badge>Most popular</Badge>}
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight">{tier.price}</span>
                <span className="text-xs text-muted-foreground">{tier.period}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{tier.description}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={tier.highlighted ? 'default' : 'outline'} className="mt-6 w-full">
                <Link to={tier.to}>{tier.cta}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-2xl border bg-card px-6 py-12 text-center shadow-sm sm:px-12"
          >
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent"
              aria-hidden="true"
            />
            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to plug into the network?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Create an account in under a minute and start charging today. Fleets and operators can talk to
                us about rolling out across every site.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.5fr_repeat(4,1fr)]">
            <div>
              <Logo />
              <p className="mt-3 max-w-xs text-sm text-muted-foreground">
                The charging network for drivers, fleets and station operators.
              </p>
            </div>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-medium">{col.title}</p>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t pt-6">
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} VoltGrid Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
