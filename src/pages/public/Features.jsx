import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Sun, Moon, ArrowLeft, ChevronRight, Gauge, ShieldCheck, Monitor, Server, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/context/theme'
import { SRS_MODULES } from '@/lib/nav'

const nfrs = [
  { icon: Gauge, label: 'Performance', value: 'REST responses < 200 ms p95; WebSocket telemetry < 100 ms' },
  { icon: ShieldCheck, label: 'Security', value: 'JWT authentication, role-based access control, TLS in transit' },
  { icon: Monitor, label: 'Usability', value: 'Responsive layouts for desktop and mobile' },
  { icon: Server, label: 'Reliability', value: '99% service uptime target' },
  { icon: Layers, label: 'Scalability', value: 'Horizontal scaling of Docker containers' },
]

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
}

function Header() {
  const { theme, setTheme } = useTheme()
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm">
              <Zap className="h-4 w-4" fill="currentColor" />
            </span>
            <span className="text-base font-semibold tracking-tight text-foreground">VoltGrid</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}

export default function Modules() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-normal">
            Traceability view
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Module traceability</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            This page maps each of the nine functional modules from SRS §2.2 to the screens in this prototype
            that demonstrate them. Follow any link to open that screen directly — every module below has at
            least one working screen, so the whole specification can be walked end to end.
          </p>
        </motion.div>

        <div className="mt-10 space-y-4">
          {SRS_MODULES.map((mod, i) => (
            <motion.section
              key={mod.id}
              {...fadeUp}
              transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.05 }}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-medium">{mod.name}</h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{mod.summary}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 rounded-md font-normal tabular-nums">
                  Module {i + 1} of {SRS_MODULES.length}
                </Badge>
              </div>

              <ul className="mt-4 divide-y rounded-lg border">
                {mod.screens.map((screen) => (
                  <li key={screen.to + screen.label}>
                    <Link
                      to={screen.to}
                      className="group flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <span className="min-w-0 truncate">{screen.label}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <code className="hidden text-xs text-muted-foreground sm:inline">{screen.to}</code>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.section>
          ))}
        </div>

        {/* Non-functional requirements */}
        <motion.section {...fadeUp} transition={{ duration: 0.4 }} className="mt-12">
          <h2 className="text-lg font-semibold tracking-tight">Non-functional requirements (SRS §5)</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            These are design targets of the full VoltGrid system — a frontend-only prototype cannot demonstrate
            them, so they are listed here for traceability only.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {nfrs.map((n) => (
              <div key={n.label} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <n.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium">{n.label}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{n.value}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  )
}
