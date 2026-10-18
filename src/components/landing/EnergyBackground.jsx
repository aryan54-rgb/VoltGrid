import { motion } from 'framer-motion'
import Particles from '@/components/Particles'

export function EnergyBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Deep Obsidian Canvas Gradient */}
      <div className="absolute inset-0 bg-[#090D16]/95 dark:bg-[#070A12]/95" />

      {/* Cyber Grid Layer */}
      <div className="bg-grid-pattern absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_30%,#000_70%,transparent_100%)]" />

      {/* Ambient Radial Glowing Orbs */}
      <div className="animate-pulse-slow absolute -top-48 left-1/2 h-[550px] w-[550px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[120px]" />
      <div className="absolute top-[28%] -left-32 h-[450px] w-[450px] rounded-full bg-cyan-500/12 blur-[130px]" />
      <div className="absolute top-[55%] -right-24 h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[140px]" />
      <div className="absolute bottom-10 left-1/3 h-[420px] w-[420px] rounded-full bg-cyan-500/10 blur-[130px]" />

      {/* Interactive WebGL2 Cyber Particle Grid from React Bits */}
      <div className="absolute inset-0 pointer-events-auto opacity-75">
        <Particles
          particleColors={['#10b981', '#06b6d4', '#34d399']}
          particleCount={80}
          particleSpread={11}
          speed={0.12}
          particleBaseSize={85}
          moveParticlesOnHover={true}
          hoverEffect="repel"
          hoverRadius={130}
          clickBurst={true}
          alphaParticles={true}
          glow={0.35}
        />
      </div>

      {/* Subtle Horizontal Scanlines / Beams */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none [background:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.4)_3px,transparent_4px)]" />
    </div>
  )
}
