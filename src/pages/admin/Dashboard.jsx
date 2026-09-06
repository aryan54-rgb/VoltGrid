import * as React from 'react'
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
} from 'recharts'
import { Users, DollarSign, Zap, Activity, Loader2, Mail, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard, ChartLegend } from '@/components/shared/chart'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchUsers } from '@/lib/api/users'
import { fetchPlatformGrowth, fetchRevenueBySegment } from '@/lib/api/analytics'
import { fetchStations } from '@/lib/api/stations'
import { fetchAdminInvitations, inviteAdmin } from '@/lib/api/admin-invitations'
import { formatDate, formatNumber } from '@/lib/utils'

/** Core platform services and their rolling 30-day availability. */
const SERVICES = [
  { name: 'API gateway', status: 'online', uptime: 99.98 },
  { name: 'Session telemetry', status: 'online', uptime: 99.94 },
  { name: 'Payments & wallet', status: 'online', uptime: 99.89 },
  { name: 'Reporting pipeline', status: 'maintenance', uptime: 98.2 },
]

const STATUS_DOT = {
  online: 'var(--status-good)',
  maintenance: 'var(--status-warning)',
  offline: 'var(--status-critical)',
}

export default function Dashboard() {
  const query = useQueries({
    users: fetchUsers,
    growth: fetchPlatformGrowth,
    segments: fetchRevenueBySegment,
    stations: fetchStations,
    invitations: fetchAdminInvitations,
  })
  const platformGrowth = query.data?.growth ?? []
  const revenueBySegment = query.data?.segments ?? []
  const stations = query.data?.stations ?? []
  const invitations = query.data?.invitations ?? []
  const [inviteOpen, setInviteOpen] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteBusy, setInviteBusy] = React.useState(false)
  const [inviteError, setInviteError] = React.useState(null)
  const [inviteSent, setInviteSent] = React.useState(null)

  async function sendInvite() {
    setInviteError(null)
    setInviteBusy(true)
    try {
      const invitation = await inviteAdmin(inviteEmail)
      setInviteSent(invitation.email)
      query.refetch()
    } catch (err) {
      setInviteError(err)
    } finally {
      setInviteBusy(false)
    }
  }

  function closeInvite(open) {
    setInviteOpen(open)
    if (!open) {
      setInviteEmail('')
      setInviteError(null)
      setInviteSent(null)
    }
  }

  /** Five newest accounts across the network. */
  const recentSignups = [...(query.data?.users ?? [])]
    .sort((a, b) => new Date(b.joined) - new Date(a.joined))
    .slice(0, 5)

  const latestGrowth = platformGrowth[platformGrowth.length - 1]
  const latestSegment = revenueBySegment[revenueBySegment.length - 1]
  const monthlyRevenue = latestSegment
    ? latestSegment.drivers + latestSegment.fleet + latestSegment.marketplace
    : null

  if (query.loading && !query.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={6} />
      </div>
    )
  }
  if (query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} title="Could not load the dashboard" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description="Network-wide growth, revenue and platform health."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite New Admin
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={latestGrowth ? formatNumber(latestGrowth.users) : '—'}
          delta={13.2}
          icon={Users}
          index={0}
        />
        <StatCard
          label="Monthly revenue"
          value={monthlyRevenue == null ? '—' : `$${monthlyRevenue}k`}
          delta={9.4}
          icon={DollarSign}
          index={1}
        />
        <StatCard label="Active stations" value={formatNumber(stations.length)} icon={Zap} index={2} />
        <StatCard label="Platform uptime" value="99.2%" icon={Activity} index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users and sessions sit on different scales — two charts, never a dual axis. */}
        <div className="space-y-6 lg:col-span-2">
          <ChartCard title="Platform growth" description="Registered accounts, month over month" height={250}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={platformGrowth}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => formatNumber(v)} />}
                  cursor={{ stroke: 'var(--chart-axis)' }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  name="Users"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Sessions" description="Charging sessions completed network-wide" height={180}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={platformGrowth}>
                <defs>
                  <linearGradient id="adminDashSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => formatNumber(v)} />}
                  cursor={{ stroke: 'var(--chart-axis)' }}
                />
                <Area
                  type="monotone"
                  dataKey="sessions"
                  name="Sessions"
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  fill="url(#adminDashSessions)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="space-y-3">
          <ChartCard
            title="Revenue by segment"
            description="Monthly revenue, $k"
            height={496}
            actions={
              <ChartLegend
                items={[
                  { label: 'Drivers', color: CHART_COLORS[0] },
                  { label: 'Fleet', color: CHART_COLORS[1] },
                  { label: 'Marketplace', color: CHART_COLORS[2] },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueBySegment}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} width={40} tickFormatter={(v) => `$${v}k`} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => `$${v}k`} />}
                  cursor={{ fill: 'var(--chart-grid)' }}
                />
                <Bar
                  dataKey="drivers"
                  name="Drivers"
                  stackId="rev"
                  fill={CHART_COLORS[0]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="fleet"
                  name="Fleet"
                  stackId="rev"
                  fill={CHART_COLORS[1]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="marketplace"
                  name="Marketplace"
                  stackId="rev"
                  fill={CHART_COLORS[2]}
                  stroke="var(--card)"
                  strokeWidth={2}
                  maxBarSize={28}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <p className="px-1 text-xs text-muted-foreground">
            Drivers pay from a prepaid wallet, fleets are invoiced monthly, and marketplace revenue comes
            from accessory sales.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent signups</CardTitle>
            <CardDescription>Newest accounts registered on the platform</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(u.joined)}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">System health</CardTitle>
            <CardDescription>Core services behind the VoltGrid platform</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SERVICES.map((s) => (
              <div
                key={s.name}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: STATUS_DOT[s.status] }}
                    aria-hidden="true"
                  />
                  <p className="truncate text-sm font-medium text-foreground">{s.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs tabular-nums text-muted-foreground">{s.uptime}%</span>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Availability measured over the last 30 days. The reporting pipeline is in a scheduled
              maintenance window.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin invitations</CardTitle>
          <CardDescription>Pending and accepted administrator invitations.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invitations.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">No admin invitations have been sent.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(invitation.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={invitation.status === 'ACCEPTED' ? 'secondary' : 'outline'}>
                        {invitation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={closeInvite}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite new admin</DialogTitle>
            <DialogDescription>
              We&rsquo;ll email a secure magic link that activates administrator access for this address.
            </DialogDescription>
          </DialogHeader>
          {inviteSent ? (
            <div className="rounded-lg border border-[var(--status-good)]/40 bg-[var(--status-good)]/5 p-4 text-sm">
              Invitation sent to <span className="font-medium">{inviteSent}</span>.
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-invite-email">Email address</Label>
              <Input
                id="admin-invite-email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              {inviteError && <p className="text-sm text-destructive">{inviteError.message}</p>}
            </div>
          )}
          <DialogFooter>
            {inviteSent ? (
              <Button onClick={() => closeInvite(false)}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => closeInvite(false)}>Cancel</Button>
                <Button disabled={!inviteEmail.includes('@') || inviteBusy} onClick={sendInvite}>
                  {inviteBusy ? <Loader2 className="animate-spin" /> : <Mail />}
                  Send invitation
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
