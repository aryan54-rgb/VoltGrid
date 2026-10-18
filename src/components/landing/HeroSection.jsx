import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  MapPin,
  Sparkles,
  Zap,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SaaSPreviewCard } from './SaaSPreviewCard'
import SplitText from '@/components/SplitText'
import ShinyText from '@/components/ShinyText'
import StarBorder from '@/components/StarBorder'
import DecryptedText from '@/components/DecryptedText'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 lg:pt-32 lg:pb-24">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero Copy Block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Animated Glow Pill Badge with ShinyText */}
          <div className="inline-block">
            <div className="relative inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-[#0c1626]/90 px-4 py-1.5 text-xs font-medium text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)] backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <ShinyText text="Next-Gen EV Infrastructure Network" color="#6ee7b7" shineColor="#ffffff" speed={2.5} />
              <span className="hidden text-slate-500 sm:inline">|</span>
              <span className="hidden items-center gap-1 sm:inline-flex">
                <Sparkles className="h-3 w-3 text-cyan-400" />
                <ShinyText text="Live in 40+ Cities" color="#67e8f9" shineColor="#ffffff" speed={3} />
              </span>
            </div>
          </div>

          {/* Dynamic Heading with SplitText animation */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
            <SplitText
              text="Powering the Future of"
              className="inline-block"
              delay={35}
              duration={0.8}
              splitType="words"
              effect="rise"
              trigger="load"
            />{' '}
            <span className="inline-block bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(16,185,129,0.35)]">
              <SplitText
                text="Smart Charging"
                className="inline-block"
                delay={60}
                duration={1}
                splitType="chars"
                effect="flip"
                trigger="load"
              />
            </span>
          </h1>

          {/* Value Proposition Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg lg:text-xl">
            The unified SaaS operating system for the electric transition. Connect drivers with guaranteed bay
            reservations, monitor station digital twins in real time, and orchestrate commercial fleet charging at scale.
          </p>

          {/* Interactive CTAs with StarBorder */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <StarBorder
              as={Link}
              to="/register"
              color="#10b981"
              trailColor="#06b6d4"
              duration={3.5}
              thickness={1.5}
              radius={12}
              backgroundColor="linear-gradient(135deg, #059669 0%, #0d9488 100%)"
              textColor="#ffffff"
              borderColor="rgba(16, 185, 129, 0.4)"
              className="relative group h-12 px-7 font-semibold shadow-emerald-glow transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(16,185,129,0.55)] cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch Console / Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </StarBorder>

            <Button
              size="lg"
              variant="outline"
              asChild
              className="h-12 rounded-xl border border-cyan-500/30 bg-[#0B1220]/80 px-6 font-medium text-slate-200 backdrop-blur-md transition-all duration-300 hover:border-cyan-400/60 hover:bg-[#101b30] hover:text-cyan-300 hover:shadow-cyan-glow"
            >
              <Link to="/driver/stations">
                <MapPin className="mr-2 h-4 w-4 text-cyan-400" />
                Explore Map Network
              </Link>
            </Button>
          </div>

          {/* Micro Trust Indicators with DecryptedText on hover */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 cursor-default">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <DecryptedText
                text="No hardware lock-in"
                speed={35}
                maxIterations={8}
                animateOn="hover"
                className="text-slate-300"
                encryptedClassName="text-emerald-400 font-mono"
              />
            </span>
            <span className="flex items-center gap-1.5 cursor-default">
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
              <DecryptedText
                text="OCPP 2.0.1 compliant"
                speed={35}
                maxIterations={8}
                animateOn="hover"
                className="text-slate-300"
                encryptedClassName="text-cyan-400 font-mono"
              />
            </span>
            <span className="flex items-center gap-1.5 cursor-default">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <DecryptedText
                text="Zero setup fees"
                speed={35}
                maxIterations={8}
                animateOn="hover"
                className="text-slate-300"
                encryptedClassName="text-emerald-400 font-mono"
              />
            </span>
          </div>
        </motion.div>


        {/* Hero Interactive SaaS Preview */}
        <motion.div
          initial={{ opacity: 0, y: 35 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-14"
        >
          <SaaSPreviewCard />
        </motion.div>
      </div>
    </section>
  )
}
