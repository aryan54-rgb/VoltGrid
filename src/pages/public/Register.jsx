import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/auth'

const roleOptions = [
  { key: 'driver', label: 'EV Driver' },
  { key: 'operator', label: 'Station Operator' },
  { key: 'fleet', label: 'Fleet Manager' },
]

export default function Register() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('driver')
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('The two passwords don’t match.')
      return
    }

    setBusy(true)
    const { error: signUpError, needsEmailConfirmation } = await signUp({
      email,
      password,
      name: name.trim(),
      role,
    })

    if (signUpError) {
      setBusy(false)
      setError(signUpError.message)
      return
    }

    if (needsEmailConfirmation) {
      setBusy(false)
      setAwaitingConfirmation(true)
      return
    }
    // Session issued straight away — PublicOnlyRoute takes it from here.
  }

  if (awaitingConfirmation) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full text-center"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <MailCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Confirm your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a confirmation link to {email}. Open it to activate your account, then sign in.
        </p>
        <Button variant="outline" className="mt-8 w-full" asChild>
          <Link to="/login">Back to sign in</Link>
        </Button>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Your role decides which portal opens and what you can see.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input
            id="name"
            placeholder="Aryan Suryawanshi"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="Re-enter your password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Register as</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger aria-label="Select a role">
              <SelectValue placeholder="Select a user class" />
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-3 rounded-lg border p-3">
          <Switch id="terms" checked={agreed} onCheckedChange={setAgreed} className="mt-0.5" />
          <Label htmlFor="terms" className="text-sm font-normal leading-relaxed text-muted-foreground">
            I accept the VoltGrid terms of use and privacy policy.
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={!agreed || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  )
}
