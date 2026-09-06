import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CircleDot, Inbox, MoreHorizontal, Timer, Radio } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { assignTicket, escalateTicket, fetchTickets } from '@/lib/api/tickets'
import { useKioskTelemetry, FAULT_DEFINITIONS } from '@/lib/kiosk-broadcast'

/**
 * SLA breaches are measured against the demo dataset's "now", not the wall
 * clock — the seeded tickets are dated July 2026 and would otherwise all read
 * as breached. Swap for `new Date()` once tickets are being filed live.
 */
const SLA_NOW = new Date('2026-07-31T00:00:00')

const SOURCE_LABEL = {
  DRIVER_REPORT: 'Driver report',
  KIOSK_EMULATOR: 'Charger telemetry',
  PM_SCHEDULE: 'PM schedule',
  FIELD_INSPECTION: 'Field inspection',
}

const PRIORITY_LADDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']
const STATUS_LABEL = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
}
const MAINTENANCE_CREW = ['Alex Turner', 'Omar Haddad']

export default function Faults() {
  const queue = useQuery(fetchTickets, [])
  const telemetry = useKioskTelemetry()
  const tickets = useMemo(() => {
    const raw = queue.data ?? []
    if (telemetry?.kioskState === 'FAULTED' && telemetry.faultState) {
      const simId = `TK-LIVE-${telemetry.connectorId}`
      if (!raw.some((t) => t.id === simId)) {
        const faultDef = FAULT_DEFINITIONS[telemetry.faultState] || {
          code: 'E-301',
          label: 'Hardware Fault',
          severity: 'CRITICAL',
          description: telemetry.faultDetails || 'Contactor safety trip.',
        }
        const liveTicket = {
          id: simId,
          title: `${faultDef.label} (${faultDef.code})`,
          stationId: telemetry.stationId,
          stationName: telemetry.stationName,
          connectorId: telemetry.connectorId,
          connectorLabel: telemetry.connectorLabel,
          faultCode: faultDef.code,
          priority: faultDef.severity,
          status: 'OPEN',
          source: 'KIOSK_EMULATOR',
          category: 'Hardware',
          reporter: 'VoltGrid Digital Twin Telemetry',
          reportedAt: new Date(telemetry.updatedAt).toISOString(),
          slaDueAt: new Date(Date.now() + 4 * 3600000).toISOString(),
          description: faultDef.description,
          parts: [],
          activity: [],
        }
        return [liveTicket, ...raw]
      }
    }
    return raw
  }, [queue.data, telemetry])

  const [actionError, setActionError] = useState(null)
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignee, setAssignee] = useState(MAINTENANCE_CREW[0])

  const unresolved = tickets.filter((t) => t.status !== 'RESOLVED')
  const criticalCount = unresolved.filter((t) => t.priority === 'CRITICAL').length
  const awaitingCount = tickets.filter((t) => t.status === 'OPEN').length
  const breachingCount = unresolved.filter((t) => new Date(t.slaDueAt) < SLA_NOW).length

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets.filter((t) => {
      const matchesQuery =
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.stationName.toLowerCase().includes(q)
      const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter
      const matchesStatus = statusFilter === 'all' || t.status === statusFilter
      const matchesSource = sourceFilter === 'all' || t.source === sourceFilter
      return matchesQuery && matchesPriority && matchesStatus && matchesSource
    })
  }, [tickets, query, priorityFilter, statusFilter, sourceFilter])

  const openAssign = (ticket) => {
    setAssignTarget(ticket)
    setAssignee(ticket.assignedTo ?? MAINTENANCE_CREW[0])
  }

  // Both actions also append a ticket_events row, so the activity trail on the
  // ticket explains who changed what.
  const confirmAssign = async () => {
    const id = assignTarget.id
    setAssignTarget(null)
    setActionError(null)
    try {
      await assignTicket(id, assignee)
      queue.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  const escalate = async (id) => {
    const ticket = tickets.find((t) => t.id === id)
    if (!ticket) return
    setActionError(null)
    try {
      await escalateTicket(id, ticket.priority)
      queue.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  if (queue.loading && !queue.data) return <LoadingRows rows={8} />
  if (queue.error) {
    return <ErrorState error={queue.error} onRetry={queue.refetch} title="Could not load the fault queue" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Fault queue"
        description="Reported faults across your network, triaged and assigned against an SLA."
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5 shadow-xs">
            <Link to="/operator/kiosk">
              <Radio className="h-3.5 w-3.5 text-primary animate-pulse" /> Kiosk Simulator
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open tickets" value={unresolved.length} icon={Inbox} index={0} />
        <StatCard label="Critical" value={criticalCount} deltaGoodWhen="down" icon={AlertTriangle} index={1} />
        <StatCard label="Awaiting assignment" value={awaitingCount} icon={CircleDot} index={2} />
        <StatCard label="Breaching SLA" value={breachingCount} deltaGoodWhen="down" icon={Timer} index={3} />
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput
              placeholder="Search ticket, title or station…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="lg:max-w-xs"
            />
            <div className="flex flex-wrap gap-3">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  {[...PRIORITY_LADDER].reverse().map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p.toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {Object.entries(SOURCE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground lg:ml-auto">
              {filtered.length} of {tickets.length} tickets
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead>SLA due</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const breaching = t.status !== 'RESOLVED' && new Date(t.slaDueAt) < SLA_NOW
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                    <TableCell className="max-w-64">
                      <span className="block truncate font-medium">{t.title}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="block">{t.stationName}</span>
                      <span className="text-xs">Bay {t.connectorLabel}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{SOURCE_LABEL[t.source] ?? t.source}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {timeAgo(t.reportedAt)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-sm text-muted-foreground',
                        breaching && 'font-medium text-status-critical'
                      )}
                    >
                      {formatDateTime(t.slaDueAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-sm">{t.assignedTo ?? 'Unassigned'}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label="Ticket actions">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openAssign(t)}>
                            Assign engineer
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={t.priority === 'CRITICAL'}
                            onClick={() => escalate(t.id)}
                          >
                            Escalate priority
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                    No tickets match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <p className="text-xs text-muted-foreground">
            Tickets are raised automatically from charger fault codes and from driver reports, then
            assigned against an SLA.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!assignTarget} onOpenChange={(open) => !open && setAssignTarget(null)}>
        <DialogContent>
          {assignTarget && (
            <>
              <DialogHeader>
                <DialogTitle>Assign engineer</DialogTitle>
                <DialogDescription>
                  {assignTarget.id} · {assignTarget.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Maintenance engineer</Label>
                  <Select value={assignee} onValueChange={setAssignee}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MAINTENANCE_CREW.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  SLA due {formatDateTime(assignTarget.slaDueAt)} · assignment moves the ticket to
                  ASSIGNED.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={confirmAssign}>Assign</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
