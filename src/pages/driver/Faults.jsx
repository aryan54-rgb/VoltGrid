import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Wrench, Plus, Camera, Info, CheckCircle2, ClipboardList } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
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
import { tickets as seedTickets, faultCategories, SLA_HOURS } from '@/data/tickets'
import { stations, connectorsFor } from '@/data/stations'
import { FAULT_CODES } from '@/lib/kiosk-emulator'
import { formatDateTime, timeAgo } from '@/lib/utils'

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const REPORTER = 'Jordan Lee (driver)'

function stationName(stationId) {
  return stations.find((s) => s.id === stationId)?.name ?? '—'
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 3600 * 1000)
}

/** Local ISO string without the timezone suffix, matching the stored ticket shape. */
function localIso(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:00`
}

const emptyDraft = {
  stationId: '',
  connectorId: '',
  category: '',
  severity: 'MEDIUM',
  description: '',
}

export default function Faults() {
  const [myTickets, setMyTickets] = useState(() =>
    seedTickets.filter((t) => t.source === 'DRIVER_REPORT')
  )
  const [nextTicketNo, setNextTicketNo] = useState(1043)
  const [draft, setDraft] = useState(emptyDraft)
  const [confirmation, setConfirmation] = useState(null)

  const bays = useMemo(
    () => (draft.stationId ? connectorsFor(draft.stationId) : []),
    [draft.stationId]
  )

  const canSubmit =
    draft.stationId && draft.connectorId && draft.category && draft.description.trim().length > 0

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function pickStation(stationId) {
    setDraft((d) => ({ ...d, stationId, connectorId: '' }))
  }

  function resetForm() {
    setDraft(emptyDraft)
  }

  function submitReport() {
    const now = new Date()
    const slaHours = SLA_HOURS[draft.severity]
    const bay = bays.find((c) => c.id === draft.connectorId)
    const nextId = `TK-${nextTicketNo}`
    setNextTicketNo((n) => n + 1)

    const ticket = {
      id: nextId,
      title: draft.category,
      stationId: draft.stationId,
      stationName: stationName(draft.stationId),
      connectorId: draft.connectorId,
      connectorLabel: bay?.label ?? '—',
      faultCode: null,
      priority: draft.severity,
      status: 'OPEN',
      source: 'DRIVER_REPORT',
      reporter: REPORTER,
      assignedTo: 'Awaiting dispatch',
      reportedAt: localIso(now),
      slaDueAt: localIso(addHours(now, slaHours)),
      description: draft.description.trim(),
      parts: [],
      activity: [{ at: localIso(now), who: 'Jordan Lee', what: 'Fault reported from the driver app' }],
    }

    setMyTickets((list) => [ticket, ...list])
    setConfirmation(ticket)
    resetForm()
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report a fault"
        description="Tell us what went wrong at a charging bay and track the repair until it is resolved."
        actions={
          <Button
            onClick={() =>
              document.getElementById('fault-form')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <Plus /> New fault report
          </Button>
        }
      />

      {/* Report form — deliberately on the page, not behind a dialog */}
      <Card id="fault-form">
        <CardHeader>
          <CardTitle className="text-base">New fault report</CardTitle>
          <CardDescription>
            Reporting a fault opens a ticket, sets an SLA from its severity and routes it to the
            maintenance team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Station</Label>
              <Select value={draft.stationId} onValueChange={pickStation}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Connector / bay</Label>
              <Select
                value={draft.connectorId}
                onValueChange={(v) => setField('connectorId', v)}
                disabled={!draft.stationId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={draft.stationId ? 'Choose a bay' : 'Select a station first'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {bays.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{c.label}</span>
                        <span className="text-muted-foreground">
                          {c.type} · {c.powerKw} kW
                        </span>
                        <StatusBadge status={c.status} />
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>What went wrong</Label>
              <Select value={draft.category} onValueChange={(v) => setField('category', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {faultCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={draft.severity} onValueChange={(v) => setField('severity', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} · {SLA_HOURS[p]}h response SLA
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fault-description">Description</Label>
            <Textarea
              id="fault-description"
              rows={4}
              placeholder="What happened, what the screen showed, how many times you retried…"
              value={draft.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </div>

          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Camera className="h-4 w-4" /> Attach photo
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submitReport} disabled={!canSubmit}>
              <Wrench /> Submit fault report
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Clear
            </Button>
            <span className="text-xs text-muted-foreground">
              SLA window is set automatically from severity: CRITICAL {SLA_HOURS.CRITICAL}h · HIGH{' '}
              {SLA_HOURS.HIGH}h · MEDIUM {SLA_HOURS.MEDIUM}h · LOW {SLA_HOURS.LOW}h.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Automatic fault handling */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex gap-3 pt-6">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-2 text-sm">
            <p className="font-medium">Some faults raise a ticket without you doing anything.</p>
            <p className="text-muted-foreground">
              Chargers report fault codes straight to VoltGrid, and a ticket is created
              automatically the moment one appears — no driver action required.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(FAULT_CODES).map(([code, label]) => (
                <Badge key={code} variant="outline">
                  <span className="font-mono">{code}</span> · {label}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My reports */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">My fault reports</h2>
          <p className="text-xs text-muted-foreground">
            Tickets raised from charger fault codes are generated automatically; driver reports enter
            the same queue.
          </p>
        </div>

        {myTickets.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={ClipboardList}
                title="No fault reports yet"
                description="Anything you report from this page will appear here with its status and SLA."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myTickets.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.04 }}
              >
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                          <span className="text-sm font-semibold">{t.title}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t.stationName} · bay {t.connectorLabel} · reported {timeAgo(t.reportedAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge status={t.priority} />
                        <StatusBadge status={t.status} />
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">{t.description}</p>

                    <Separator />

                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Assigned to <span className="text-foreground">{t.assignedTo}</span>
                      </span>
                      <span>
                        SLA due <span className="text-foreground">{formatDateTime(t.slaDueAt)}</span>
                      </span>
                      {t.faultCode && (
                        <span>
                          Fault code <span className="font-mono text-foreground">{t.faultCode}</span>
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Success dialog */}
      <Dialog open={!!confirmation} onOpenChange={(v) => !v && setConfirmation(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-status-good" /> Fault report submitted
            </DialogTitle>
            <DialogDescription>
              Ticket <span className="font-mono text-foreground">{confirmation?.id}</span> has been
              created and added to the maintenance queue.
            </DialogDescription>
          </DialogHeader>

          {confirmation && (
            <div className="space-y-3 rounded-xl border p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Severity</span>
                <StatusBadge status={confirmation.priority} />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">SLA window</span>
                <span className="font-medium tabular-nums">
                  {SLA_HOURS[confirmation.priority]} hours
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Response due by</span>
                <span className="font-medium">{formatDateTime(confirmation.slaDueAt)}</span>
              </div>
              <Separator />
              <p className="text-xs text-muted-foreground">
                Routed to the station operator for {confirmation.stationName} and queued for
                maintenance. You will get a notification when the status changes.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setConfirmation(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
