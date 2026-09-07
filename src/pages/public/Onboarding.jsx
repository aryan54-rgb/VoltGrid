import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Building2, Car, Check, Loader2, Truck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { homeForRole } from '@/components/auth/route-guards'
import { useAuth } from '@/context/auth'

/**
 * "Select your role" — the step a social sign-in skips.
 *
 * A Google or GitHub login never passes through the registration form, so its
 * profile row lands with a defaulted role and `onboarded = false`. The route
 * guards divert those accounts here before any portal, and the only way out is
 * `complete_onboarding()`, which writes the chosen role once and flips the flag.
 */
const roles = [
  {
    key: 'driver',
    label: 'EV Driver',
    icon: Zap,
    blurb: 'Find and book chargers, track sessions, manage your wallet.',
  },
  {
    key: 'fleet',
    label: 'Fleet Manager',
    icon: Truck,
    blurb: 'Run a vehicle roster, schedule depot charging, settle invoices.',
  },
  {
    key: 'operator',
    label: 'Station Operator',
    icon: Building2,
    blurb: 'Monitor stations and bays, work faults, watch revenue.',
  },
]

export default function Onboarding() {
  const { profile, user, completeOnboarding } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState('driver')
  // Providers usually send a name; fall back to letting them type one.
  const [name, setName] = useState(profile?.name ?? '')
  const [vehicle, setVehicle] = useState(profile?.vehicle ?? '')
  const [licensePlate, setLicensePlate] = useState(profile?.license_plate ?? '')
  const [company, setCompany] = useState(profile?.company ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter the name you want to appear under.')
      return
    }

    if (role === 'driver' && (!vehicle.trim() || !licensePlate.trim())) {
      setError('Please enter your vehicle name and number plate.')
      return
    }

    if (role === 'fleet' && (!company.trim() || !licensePlate.trim())) {
      setError('Please enter your fleet organization name and primary vehicle number plate.')
      return
    }

    setBusy(true)
    const { data, error: rpcError } = await completeOnboarding({
      role,
      name: name.trim(),
      vehicle: vehicle.trim(),
      licensePlate: licensePlate.trim().toUpperCase(),
      company: company.trim(),
    })

    if (rpcError) {
      setBusy(false)
      setError(rpcError.message)
      return
    }

    // Go straight to the portal rather than waiting for a guard to bounce us:
    // the profile in context is already the row the function returned.
    navigate(homeForRole(data?.role ?? role), { replace: true })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">One more step</h1>
        <p className="text-sm text-muted-foreground">
          You signed in as {user?.email}. Choose how you&rsquo;ll use VoltGrid — your role decides
          which portal opens and what you can see.
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
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            placeholder="Aryan Suryawanshi"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium leading-none">I&rsquo;m joining as</legend>
          <div className="space-y-2">
            {roles.map((opt) => {
              const selected = role === opt.key
              return (
                <label
                  key={opt.key}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                    selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.key}
                    checked={selected}
                    onChange={() => setRole(opt.key)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                      selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <opt.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      {opt.label}
                      {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {opt.blurb}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>

        {/* Dynamic Fields Based on Selected Role */}
        {role === 'driver' && (
          <div className="p-3.5 rounded-lg border bg-muted/20 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Car className="h-3.5 w-3.5 text-primary" />
              <span>Vehicle Information</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-vehicle">Vehicle Name / Model *</Label>
              <Input
                id="ob-vehicle"
                placeholder="e.g. Tata Nexon EV, MG ZS EV, Tesla Model 3"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-plate">Number Plate / Registration No. *</Label>
              <Input
                id="ob-plate"
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
              <span>Fleet Organization & Vehicle</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ob-fleet-company">Fleet Company Name *</Label>
              <Input
                id="ob-fleet-company"
                placeholder="e.g. Swift Logistics"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="ob-fleet-vehicle">Primary Vehicle Model</Label>
                <Input
                  id="ob-fleet-vehicle"
                  placeholder="e.g. Tata Ace EV, Ford E-Transit"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ob-fleet-plate">Vehicle Number Plate *</Label>
                <Input
                  id="ob-fleet-plate"
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
              Operator Details
            </p>
            <div className="space-y-2">
              <Label htmlFor="ob-op-company">Network / Organization Name</Label>
              <Input
                id="ob-op-company"
                placeholder="e.g. VoltGrid Pune Network"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Setting up your workspace…' : 'Continue'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          This choice is saved to your account and can only be made once. An admin can change it
          later.
        </p>
      </form>
    </motion.div>
  )
}
