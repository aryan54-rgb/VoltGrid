import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Car, Loader2, MailCheck, Truck } from 'lucide-react'
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
  const [vehicle, setVehicle] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [company, setCompany] = useState('')
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
    if (role === 'driver' && (!vehicle.trim() || !licensePlate.trim())) {
      setError('Please provide your EV vehicle name and number plate.')
      return
    }
    if (role === 'fleet' && (!company.trim() || !licensePlate.trim())) {
      setError('Please provide your fleet company name and primary vehicle number plate.')
      return
    }

    setBusy(true)
    const { error: signUpError, needsEmailConfirmation } = await signUp({
      email,
      password,
      name: name.trim(),
      role,
      vehicle: vehicle.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      company: company.trim(),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              placeholder="Re-enter password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
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

        {/* Dynamic Fields Based on Role */}
        {role === 'driver' && (
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Car className="h-3.5 w-3.5 text-primary" />
              <span>Vehicle Information</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle-name">Vehicle Name / Model *</Label>
              <Input
                id="vehicle-name"
                placeholder="e.g. Tata Nexon EV, MG ZS EV, Tesla Model 3"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="number-plate">Number Plate / Registration No. *</Label>
              <Input
                id="number-plate"
                placeholder="e.g. MH 12 AB 1234"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                required
                className="uppercase"
              />
            </div>
          </div>
        )}

        {role === 'fleet' && (
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Truck className="h-3.5 w-3.5 text-primary" />
              <span>Fleet & Initial Vehicle Details</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fleet-company">Fleet Company / Organization *</Label>
              <Input
                id="fleet-company"
                placeholder="e.g. Swift Logistics, Pune Express"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="fleet-vehicle">Primary Vehicle Model</Label>
                <Input
                  id="fleet-vehicle"
                  placeholder="e.g. Tata Ace EV, Ford E-Transit"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fleet-plate">Vehicle Number Plate *</Label>
                <Input
                  id="fleet-plate"
                  placeholder="e.g. MH 12 VN 1001"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  required
                  className="uppercase"
                />
              </div>
            </div>
          </div>
        )}

        {role === 'operator' && (
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Operator Organization
            </p>
            <div className="space-y-2">
              <Label htmlFor="op-company">Network / Organization Name</Label>
              <Input
                id="op-company"
                placeholder="e.g. VoltGrid Pune Network"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>
        )}

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
