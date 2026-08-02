import { useMemo, useState } from 'react'
import {
  Users as UsersIcon, UserCheck, UserX, Sparkles, UserPlus, MoreHorizontal,
  ChevronLeft, ChevronRight, Mail, CheckCircle2,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import { adminUsers } from '@/data/users'
import { formatCurrency, formatDate, formatNumber, initials } from '@/lib/utils'

const PAGE_SIZE = 8

/** Roles actually present on the platform, derived from the account list. */
const ROLE_OPTIONS = [...new Set(adminUsers.map((u) => u.role))]
const STATUS_OPTIONS = ['active', 'suspended', 'pending']

const label = (value) => value.charAt(0).toUpperCase() + value.slice(1)

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

export default function Users() {
  const [users, setUsers] = useState(adminUsers)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [profileTarget, setProfileTarget] = useState(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState(ROLE_OPTIONS[0])
  const [inviteSent, setInviteSent] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter((u) => {
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (statusFilter !== 'all' && u.status !== statusFilter) return false
      return true
    })
  }, [users, query, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeCount = users.filter((u) => u.status === 'active').length
  const suspendedCount = users.filter((u) => u.status === 'suspended').length
  const newCount = users.filter((u) => Date.now() - new Date(u.joined).getTime() < THIRTY_DAYS).length

  const toggleSuspend = (id) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' } : u
      )
    )
  }

  const confirmDelete = () => {
    setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  const closeInvite = (open) => {
    setInviteOpen(open)
    if (!open) {
      setInviteSent(false)
      setInviteEmail('')
      setInviteRole(ROLE_OPTIONS[0])
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Every account on the VoltGrid platform."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus /> Invite user
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={formatNumber(users.length)} delta={13.2} icon={UsersIcon} index={0} />
        <StatCard label="Active" value={formatNumber(activeCount)} delta={11.8} icon={UserCheck} index={1} />
        <StatCard label="Suspended" value={formatNumber(suspendedCount)} delta={-0.4} deltaGoodWhen="down" icon={UserX} index={2} />
        <StatCard label="New this month" value={formatNumber(newCount)} icon={Sparkles} index={3} />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Search by name or email…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              className="sm:max-w-xs"
            />
            <div className="flex gap-3">
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>{label(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>{label(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {filtered.length} of {users.length} accounts
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Lifetime spend</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials(u.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{u.name}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(u.sessions)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(u.spend)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.joined)}</TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setProfileTarget(u)}>View profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleSuspend(u.id)}>
                          {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {pageRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No users match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {pageRows.length} of {filtered.length} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage <= 1}
                onClick={() => setPage(currentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(currentPage + 1)}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!profileTarget} onOpenChange={(open) => !open && setProfileTarget(null)}>
        <DialogContent>
          {profileTarget && (
            <>
              <DialogHeader>
                <DialogTitle>{profileTarget.name}</DialogTitle>
                <DialogDescription>{profileTarget.email}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <Badge variant="secondary" className="mt-1 capitalize">{profileTarget.role}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1"><StatusBadge status={profileTarget.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="font-medium tabular-nums">{formatNumber(profileTarget.sessions)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lifetime spend</p>
                  <p className="font-medium tabular-nums">{formatCurrency(profileTarget.spend)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-medium">{formatDate(profileTarget.joined)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs">{profileTarget.id}</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProfileTarget(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This permanently removes {deleteTarget?.name} ({deleteTarget?.email}) along with their
              bookings, sessions and wallet history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inviteOpen} onOpenChange={closeInvite}>
        <DialogContent>
          {inviteSent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle>Invite sent</DialogTitle>
              <p className="text-sm text-muted-foreground">
                An invitation is on its way to{' '}
                <span className="font-medium text-foreground">{inviteEmail}</span> for the{' '}
                <span className="capitalize">{inviteRole}</span> role.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => closeInvite(false)}>Done</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Invite user</DialogTitle>
                <DialogDescription>
                  The new account is created with the access that comes with the chosen role.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="name@company.com"
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
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{label(r)}</SelectItem>
                      ))}
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
