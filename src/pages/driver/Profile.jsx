import { useEffect, useState } from 'react'
import { Car, Plus, ShieldAlert, Check, KeyRound } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useTheme } from '@/context/theme'
import { ErrorState } from '@/components/shared/query-state'
import { useAuth } from '@/context/auth'
import { ROLE_META } from '@/lib/nav'
import { formatDate, initials } from '@/lib/utils'


export default function Profile() {
  const { theme, setTheme } = useTheme()
  const { profile, updateProfile } = useAuth()

  const roleLabel = ROLE_META[profile?.role]?.label ?? 'EV Driver'
  const vehicle = profile?.vehicle ?? 'No vehicle on file'

  const [account, setAccount] = useState({
    name: profile?.name ?? '',
    email: profile?.email ?? '',
    phone: '+91 98220 41783',
  })
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [registration, setRegistration] = useState('MH 12 QR 4821')
  const [prefs, setPrefs] = useState({ autoTopUp: true, reservationReminders: true })
  const [connector, setConnector] = useState('CCS2')
  const [twoFactor, setTwoFactor] = useState(true)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  // The profile arrives a round-trip after the session, so seed the form from
  // it the first time it lands rather than on mount only.
  useEffect(() => {
    if (!profile) return
    setAccount((a) => ({ ...a, name: profile.name ?? '', email: profile.email ?? '' }))
  }, [profile])

  async function saveAccount() {
    setSaveError(null)
    // Only `name` is writable here. `email` belongs to auth.users and `role` is
    // blocked by column-level grants, which is what stops a driver from
    // promoting themselves.
    const { error } = await updateProfile({ name: account.name })
    if (error) {
      setSaveError(error)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  function changePassword() {
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 1800)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account, vehicle, preferences and security." />

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {initials(account.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{account.name}</h2>
              <Badge variant="secondary">{roleLabel}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{account.email}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {profile?.joined ? `Member since ${formatDate(profile.joined)}` : 'Member'} · {vehicle}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Account */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account details</CardTitle>
              <CardDescription>
                This account is bound to the {roleLabel} role, which decides the portal and
                permissions you see.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={account.name}
                    onChange={(e) => setAccount((a) => ({ ...a, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={account.email} readOnly className="text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={account.phone}
                    onChange={(e) => setAccount((a) => ({ ...a, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" value={roleLabel} readOnly className="text-muted-foreground" />
                </div>
              </div>
              <div>
                <Button onClick={saveAccount}>
                  {saved ? (
                    <>
                      <Check /> Saved
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </div>
              {saveError && <ErrorState error={saveError} title="Could not save your profile" />}
              <p className="text-xs text-muted-foreground">
                Roles are assigned by an administrator; a driver cannot change their own role. Your
                sign-in email is managed by the authentication service and cannot be edited here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle */}
        <TabsContent value="vehicle" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{vehicle}</CardTitle>
                <CardDescription>Primary vehicle</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Battery capacity</span>
                <span className="font-medium tabular-nums">75 kWh</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Connector</span>
                <span className="font-medium">CCS2</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="registration" className="text-muted-foreground">
                  Registration number
                </Label>
                <Input
                  id="registration"
                  value={registration}
                  onChange={(e) => setRegistration(e.target.value)}
                  className="w-44 text-right uppercase"
                />
              </div>
            </CardContent>
          </Card>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" /> Add vehicle
          </button>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preferences</CardTitle>
              <CardDescription>App behaviour and defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Dark mode</p>
                  <p className="text-xs text-muted-foreground">Use the dark theme across the app.</p>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Auto top-up</p>
                  <p className="text-xs text-muted-foreground">
                    Refill the wallet automatically when the balance runs low.
                  </p>
                </div>
                <Switch
                  checked={prefs.autoTopUp}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, autoTopUp: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Reservation reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Remind me before a booked slot starts.
                  </p>
                </div>
                <Switch
                  checked={prefs.reservationReminders}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, reservationReminders: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Preferred connector type</p>
                  <p className="text-xs text-muted-foreground">
                    Used to pre-filter station discovery results.
                  </p>
                </div>
                <Select value={connector} onValueChange={setConnector}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CCS2">CCS2</SelectItem>
                    <SelectItem value="Type 2">Type 2</SelectItem>
                    <SelectItem value="CHAdeMO">CHAdeMO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change password</CardTitle>
              <CardDescription>Use at least 12 characters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="current-pw">Current password</Label>
                  <Input id="current-pw" type="password" placeholder="••••••••" />
                </div>
                <div className="hidden sm:block" />
                <div className="space-y-2">
                  <Label htmlFor="new-pw">New password</Label>
                  <Input id="new-pw" type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-pw">Confirm new password</Label>
                  <Input id="confirm-pw" type="password" placeholder="••••••••" />
                </div>
              </div>
              <Button variant="outline" onClick={changePassword}>
                {passwordSaved ? (
                  <>
                    <Check /> Password changed
                  </>
                ) : (
                  <>
                    <KeyRound /> Change password
                  </>
                )}
              </Button>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Two-factor authentication</p>
                  <p className="text-xs text-muted-foreground">
                    Verify sign-ins with an authenticator app.
                  </p>
                </div>
                <Switch checked={twoFactor} onCheckedChange={setTwoFactor} />
              </div>
              <p className="text-xs text-muted-foreground">
                Sign-in issues a JWT bearer token and passwords are always stored hashed. This is an
                interactive demo — credentials stay on your device and sign-in is simulated.
              </p>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <ShieldAlert className="h-5 w-5" /> Danger zone
              </CardTitle>
              <CardDescription>
                Deleting your account removes your charging history, reservations and remaining
                wallet balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                Delete account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
            <DialogDescription>
              This permanently removes your VoltGrid account, charging history and remaining wallet
              balance. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(false)}>
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
