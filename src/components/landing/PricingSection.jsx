import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, Sparkles, Zap, Building2, Truck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const TIERS = [
  {
    id: 'driver',
    name: 'EV Drivers',
    roleTag: 'Free Pay-Per-Charge',
    icon: Zap,
    monthlyPrice: 0,
    annualPrice: 0,
    period: 'forever',
    description: 'Find stations, reserve bays in transit, and pay seamlessly with in-app wallet.',
    features: [
      'Access 12,400+ chargers nationwide',
      'Guaranteed 15-minute slot reservation hold',
      'In-app digital wallet & automatic receipts',
      'Live charging curve and battery telemetry',
      'Community reviews and charger ratings',
      'No subscription or membership fees',
    ],
    cta: 'Start Free as Driver',
    to: '/register?role=driver',
    highlighted: false,
    color: 'emerald',
  },
  {
    id: 'operator',
    name: 'Station Operators',
    roleTag: 'Pro Network Tier',
    icon: Building2,
    monthlyPrice: 49,
    annualPrice: 39,
    period: 'per station / month',
    description: 'Digital twin telemetry, remote terminal control, and dynamic revenue optimization.',
    features: [
      'All Driver platform features included',
      'Live kiosk digital twin terminal control',
      'Dynamic surge & time-of-use kilowatt pricing',
      'Automated fault isolation & hardware alerts',
      'OCPP 2.0.1 & ISO 15118 native compliance',
      'Direct merchant settlement & financial analytics',
      'Priority 24/7 network technician support',
    ],
    cta: 'Deploy Operator Console',
    to: '/register?role=operator',
    highlighted: true,
    color: 'emerald',
  },
  {
    id: 'fleet',
    name: 'Fleet Enterprise',
    roleTag: 'Commercial Fleets',
    icon: Truck,
    monthlyPrice: 199,
    annualPrice: 159,
    period: 'per depot / month',
    description: 'Depot overnight scheduling, multi-vehicle dispatch, and consolidated kilowatt billing.',
    features: [
      'All Operator tier capabilities included',
      'Depot overnight charging schedule optimization',
      'Vehicle telemetry & cost-per-mile efficiency',
      'Consolidated monthly corporate invoicing',
      'Enterprise REST APIs and Webhook triggers',
      'Custom hardware vendor integrations',
      '99.9% guaranteed uptime SLA & dedicated manager',
    ],
    cta: 'Scale Enterprise Fleet',
    to: '/register?role=fleet',
    highlighted: false,
    color: 'cyan',
  },
]

export function PricingSection() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="relative scroll-mt-24 py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className="mb-3 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300"
          >
            Predictable & Transparent
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Simple Pricing for{' '}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Every Scale
            </span>
          </h2>
          <p className="mt-4 text-base text-slate-400 sm:text-lg">
            Choose the plan engineered for your operational role. Switch or cancel any time with zero lock-in contracts.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-xs font-medium ${!annual ? 'text-white' : 'text-slate-400'}`}>
              Monthly Billing
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className="relative h-7 w-14 rounded-full border border-emerald-500/40 bg-[#0C1526] p-1 transition-colors focus:outline-none"
            >
              <motion.div
                className="h-5 w-5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"
                animate={{ x: annual ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-xs font-medium ${annual ? 'text-white' : 'text-slate-400'}`}>
              Annual Billing
            </span>
            <Badge className="border-emerald-500/40 bg-emerald-500/20 text-[10px] text-emerald-300">
              Save 20%
            </Badge>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:items-stretch">
          {TIERS.map((tier) => {
            const Icon = tier.icon
            const price = annual ? tier.annualPrice : tier.monthlyPrice

            return (
              <motion.div
                key={tier.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3 }}
                className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 backdrop-blur-2xl transition-all duration-500 ${
                  tier.highlighted
                    ? 'border-2 border-emerald-500/60 bg-[#0B1424]/95 shadow-[0_0_50px_rgba(16,185,129,0.25)] lg:-translate-y-2'
                    : 'border border-white/10 bg-[#0A101C]/90 shadow-xl hover:border-emerald-500/30'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-0.5 text-xs font-bold text-slate-950 shadow-[0_0_15px_#10b981]">
                      <Sparkles className="mr-1 h-3 w-3" />
                      MOST POPULAR
                    </Badge>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                      <p className="text-xs text-emerald-400 font-medium">{tier.roleTag}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0E1728] text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  {/* Price display */}
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-mono text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                      {price === 0 ? '$0' : `$${price}`}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">/{tier.period}</span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-300">{tier.description}</p>

                  {/* Features List */}
                  <ul className="mt-6 space-y-3 border-t border-white/10 pt-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card CTA */}
                <div className="mt-8 border-t border-white/10 pt-6">
                  <Button
                    asChild
                    size="lg"
                    className={`w-full rounded-xl font-semibold transition-all duration-300 ${
                      tier.highlighted
                        ? 'border border-emerald-400/40 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-glow hover:shadow-[0_0_35px_rgba(16,185,129,0.5)]'
                        : 'border border-white/10 bg-[#0E1728] text-slate-200 hover:border-emerald-500/40 hover:bg-[#131f36] hover:text-white'
                    }`}
                  >
                    <Link to={tier.to} className="flex items-center justify-center gap-2">
                      {tier.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
