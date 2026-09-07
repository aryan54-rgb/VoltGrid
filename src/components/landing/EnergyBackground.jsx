import { motion } from 'framer-motion'

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

      {/* Subtle Horizontal Scanlines / Beams */}
      <div className="absolute inset-0 opacity-[0.03] [background:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.4)_3px,transparent_4px)]" />

      {/* Floating Cyber Particle Highlights */}
      {[
        { top: '15%', left: '20%', delay: 0 },
        { top: '35%', left: '80%', delay: 1.5 },
        { top: '65%', left: '15%', delay: 2.5 },
        { top: '80%', left: '75%', delay: 0.8 },
      ].map((dot, idx) => (
        <motion.div
          key={idx}
          className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"
          style={{ top: dot.top, left: dot.left }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
