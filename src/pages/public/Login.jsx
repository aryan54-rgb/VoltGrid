import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Car, Truck, Building2, Wrench, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ROLE_META } from '@/lib/nav'

const roleIcons = {
  driver: Car,
  fleet: Truck,
  operator: Building2,
  technician: Wrench,
  admin: ShieldCheck,
}

const roles = Object.entries(ROLE_META).map(([key, meta]) => ({ key, ...meta, icon: roleIcons[key] }))

export default function Login() {
  const navigate = useNavigate()
  const [step, setStep] = useState('form')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setStep('roles')
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
              <p className="text-sm text-muted-foreground">
                This is an interactive demo — sign-in is simulated. Pick any role to explore its portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don&rsquo;t have an account?{' '}
              <Link to="/register" className="font-medium text-primary hover:underline">
                Create one
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="roles"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Choose a demo workspace</h1>
              <p className="text-sm text-muted-foreground">
                Each role gets its own portal, scoped to what that role needs.
              </p>
            </div>

            <div className="mt-8 space-y-2.5">
              {roles.map((role, i) => (
                <motion.button
                  key={role.key}
                  type="button"
                  onClick={() => navigate(role.home)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.05 }}
                  className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3.5 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <role.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{role.label}</span>
                    <span className="block text-xs text-muted-foreground">{role.blurb}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </motion.button>
              ))}
            </div>

            <Button
              variant="ghost"
              type="button"
              className="mt-6 w-full text-muted-foreground"
              onClick={() => setStep('form')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
