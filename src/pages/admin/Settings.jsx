import { useState } from 'react'
import { Check, Copy, RefreshCw, Send, UserPlus, Download, Trash2, Mail } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { initials } from '@/lib/utils'

const DESTRUCTIVE_OUTLINE =
  'border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive'

/** Pricing defaults new stations inherit. */
const DEFAULT_RATE_PER_KWH = '0.42'
const DEFAULT_IDLE_FEE_PER_MIN = '0.35'
const DEFAULT_MEMBER_DISCOUNT = '10'

const NOTIFICATION_ROWS = [
  { key: 'incidents', label: 'Incident alerts', description: 'Page the on-call team when a station or service goes down.' },
  { key: 'dailyRevenue', label: 'Daily revenue digest', description: 'A morning summary of yesterday’s revenue and sessions.' },
  { key: 'weeklyReport', label: 'Weekly report', description: 'Network performance and growth, delivered every Monday.' },
  { key: 'marketing', label: 'Product & marketing updates', description: 'New features, release notes and occasional offers.' },
]

export default function Settings() {
  // General
  const [orgName, setOrgName] = useState('VoltGrid Inc.')
  const [supportEmail, setSupportEmail] = useState('support@voltgrid.com')
  const [currency, setCurrency] = useState('USD')
  const [timezone, setTimezone] = useState('America/Los_Angeles')
  const [generalSaved, setGeneralSaved] = useState(false)

  // Pricing
  const [ratePerKwh, setRatePerKwh] = useState(DEFAULT_RATE_PER_KWH)
  const [idleFeePerMin, setIdleFeePerMin] = useState(DEFAULT_IDLE_FEE_PER_MIN)
  const [memberDiscount, setMemberDiscount] = useState(DEFAULT_MEMBER_DISCOUNT)
  const [dynamicPricing, setDynamicPricing] = useState(true)
  const [pricingSaved, setPricingSaved] = useState(false)

  // Notifications
  const [notifications, setNotifications] = useState({
    incidents: true,
    dailyRevenue: true,
    weeklyReport: true,
    marketing: false,
  })

  // Team
  const [team, setTeam] = useState([
    { id: 't-1', name: 'Ravi Patel', email: 'ravi@voltgrid.com', role: 'owner' },
    { id: 't-2', name: 'Elena Sokolova', email: 'elena@voltgrid.com', role: 'admin' },
    { id: 't-3', name: 'James Whitfield', email: 'james@voltgrid.com', role: 'analyst' },
  ])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('admin')
  const [inviteSent, setInviteSent] = useState(false)

  // API
  const [apiKey, setApiKey] = useState('vg_live_9f4c2ab8e7d14f06b3a1')
  const [copied, setCopied] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('https://hooks.voltgrid.com/telemetry')
  const [webhookTested, setWebhookTested] = useState(false)

  // Danger zone
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const flash = (setter) => {
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const copyKey = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(apiKey).catch(() => {})
    flash(setCopied)
  }

  const regenerate = () => {
    setApiKey(`vg_live_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`)
    setRegenOpen(false)
  }

  const closeInvite = (open) => {
    setInviteOpen(open)
    if (!open) {
      setInviteSent(false)
      setInviteEmail('')
      setInviteRole('admin')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Organisation, pricing defaults, notifications, team and API configuration."
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">General</CardTitle>
              <CardDescription>Organisation identity and locale defaults</CardDescription>
            </CardHeader>
            <CardContent className="max-w-xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organisation name</Label>
                <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-email">Support email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GBP">GBP — Pound Sterling</SelectItem>
                      <SelectItem value="INR">INR — Indian Rupee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/Los_Angeles">Pacific (Los Angeles)</SelectItem>
                      <SelectItem value="America/New_York">Eastern (New York)</SelectItem>
                      <SelectItem value="Europe/Berlin">Central Europe (Berlin)</SelectItem>
                      <SelectItem value="Asia/Kolkata">India Standard (Kolkata)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => flash(setGeneralSaved)}>
                {generalSaved ? <><Check /> Saved</> : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
              <CardDescription>
                Defaults that newly onboarded stations inherit; operators may override them per site.
              </CardDescription>
            </CardHeader>
            <CardContent className="max-w-xl space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="rate-kwh">Default rate ($/kWh)</Label>
                  <Input id="rate-kwh" inputMode="decimal" value={ratePerKwh} onChange={(e) => setRatePerKwh(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="idle-fee">Idle fee ($/min)</Label>
                  <Input id="idle-fee" inputMode="decimal" value={idleFeePerMin} onChange={(e) => setIdleFeePerMin(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="member-discount">Member discount (%)</Label>
                  <Input id="member-discount" inputMode="numeric" value={memberDiscount} onChange={(e) => setMemberDiscount(e.target.value)} />
                </div>
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Dynamic pricing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Moves the rate within ±15% of the default based on demand at each station. The rate in
                    force when a session starts is the one billed.
                  </p>
                </div>
                <Switch checked={dynamicPricing} onCheckedChange={setDynamicPricing} aria-label="Toggle dynamic pricing" />
              </div>
              <Button onClick={() => flash(setPricingSaved)}>
                {pricingSaved ? <><Check /> Saved</> : 'Save changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
              <CardDescription>What the platform sends to your admin team</CardDescription>
            </CardHeader>
            <CardContent className="max-w-2xl space-y-3">
              {NOTIFICATION_ROWS.map((n) => (
                <div key={n.key} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.description}</p>
                  </div>
                  <Switch
                    checked={notifications[n.key]}
                    onCheckedChange={(v) => setNotifications((prev) => ({ ...prev, [n.key]: v }))}
                    aria-label={`Toggle ${n.label}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                In-app alerts are always on. Email delivery is optional per channel.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-base">Team</CardTitle>
                <CardDescription>People with access to this admin console</CardDescription>
              </div>
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus /> Invite
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="w-[170px]">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {team.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials(m.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{m.name}</span>
                            <span className="text-xs text-muted-foreground">{m.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: v } : x)))
                          }
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">Owner</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="analyst">Analyst</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API</CardTitle>
              <CardDescription>Keys and webhooks for integrating with VoltGrid</CardDescription>
            </CardHeader>
            <CardContent className="max-w-xl space-y-6">
              <div className="space-y-2">
                <Label htmlFor="api-key">API key</Label>
                <div className="flex gap-2">
                  <Input id="api-key" readOnly value={apiKey} className="font-mono text-xs" />
                  <Button variant="outline" onClick={copyKey}>
                    {copied ? <><Check /> Copied</> : <><Copy /> Copy</>}
                  </Button>
                </div>
                <Button variant="outline" className={DESTRUCTIVE_OUTLINE} onClick={() => setRegenOpen(true)}>
                  <RefreshCw /> Regenerate key
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input id="webhook-url" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                  <Button variant="outline" onClick={() => flash(setWebhookTested)}>
                    {webhookTested ? <><Check /> 200 OK</> : <><Send /> Test</>}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Receives session, billing and connector events as signed JSON payloads.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions — proceed with caution</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" className={DESTRUCTIVE_OUTLINE}>
            <Download /> Export all data
          </Button>
          <Button variant="outline" className={DESTRUCTIVE_OUTLINE} onClick={() => setDeleteOpen(true)}>
            <Trash2 /> Delete organisation
          </Button>
        </CardContent>
      </Card>

      <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate API key</DialogTitle>
            <DialogDescription>
              The current key stops working immediately. Every integration using it will need the new key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={regenerate}>Regenerate key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) setDeleteConfirm('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete organisation</DialogTitle>
            <DialogDescription>
              This permanently deletes {orgName}, all stations, users and billing history. Type{' '}
              <span className="font-medium text-foreground">{orgName}</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder={orgName}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            aria-label="Type the organisation name to confirm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteConfirm !== orgName} onClick={() => setDeleteOpen(false)}>
              Delete organisation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={closeInvite}>
        <DialogContent>
          {inviteSent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle>Invite sent</DialogTitle>
              <p className="text-sm text-muted-foreground">
                An invitation was sent to{' '}
                <span className="font-medium text-foreground">{inviteEmail}</span> with the {inviteRole} role.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => closeInvite(false)}>Done</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite team member</DialogTitle>
                <DialogDescription>Grant access to the VoltGrid admin console.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="team-email">Email address</Label>
                  <Input
                    id="team-email"
                    type="email"
                    placeholder="name@voltgrid.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="analyst">Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => closeInvite(false)}>Cancel</Button>
                <Button disabled={!inviteEmail.includes('@')} onClick={() => setInviteSent(true)}>
                  <Mail /> Send invite
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
