import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Check, CheckCircle2, Clock, MapPin, Zap } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDateTime } from '@/lib/utils'
import { tickets } from '@/data/tickets'
import { stations } from '@/data/stations'

const NOW = new Date('2026-07-31T00:00:00')

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

function TicketView({ ticket }) {
  const [timeline, setTimeline] = useState(ticket.activity)
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(ticket.status)
  const [pendingStatus, setPendingStatus] = useState(ticket.status)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [flash, setFlash] = useState(false)
  const [checkedParts, setCheckedParts] = useState({})

  const station = stations.find((s) => s.name === ticket.station)

  const addNote = () => {
    if (!note.trim()) return
    setTimeline((prev) => [
      ...prev,
      { time: NOW.toISOString().slice(0, 19), who: 'Alex Turner', what: note.trim() },
    ])
    setNote('')
  }

  const applyStatus = () => {
    setStatus(pendingStatus)
    setFlash(true)
    setTimeout(() => setFlash(false), 2500)
  }

  const created = new Date(ticket.created)
  const due = new Date(ticket.due)
  const totalMs = due - created
  const leftMs = due - NOW
  const hours = Math.round(Math.abs(leftMs) / 3600000)
  const overdue = leftMs <= 0
  const slaUsed = Math.min(100, Math.max(0, Math.round(((totalMs - leftMs) / totalMs) * 100)))

  const details = [
    { label: 'Station', value: ticket.station },
    { label: 'Charger', value: ticket.charger },
    { label: 'Reporter', value: ticket.reporter },
    { label: 'Created', value: formatDateTime(ticket.created) },
    { label: 'Due', value: formatDateTime(ticket.due) },
  ]

  return (
    <div className="space-y-6">
      <Link
        to="/technician/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to tickets
      </Link>

      <PageHeader title={ticket.title} description={`Ticket ${ticket.id}`} />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{ticket.id}</span>
            <span className="text-sm font-medium">{ticket.title}</span>
            <StatusBadge status={ticket.priority} />
            <StatusBadge status={status} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {details.map((d) => (
              <div key={d.label}>
                <p className="text-xs text-muted-foreground">{d.label}</p>
                <p className="mt-0.5 text-sm font-medium">{d.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
              <CardDescription>Every update recorded against this ticket</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {timeline.map((a, i) => (
                  <div key={`${a.time}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < timeline.length - 1 && (
                      <span className="absolute left-[5px] top-4 h-full w-px bg-border" />
                    )}
                    <span className="relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full border-2 border-primary bg-card" />
                    <div className="min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">{a.who}</span>{' '}
                        <span className="text-muted-foreground">{a.what}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(a.time)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 space-y-2 border-t pt-4">
                <Textarea
                  placeholder="Add a note to the timeline…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button size="sm" onClick={addNote} disabled={!note.trim()}>
                  Add note
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resolution</CardTitle>
              <CardDescription>Update the ticket status and record what was done</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={pendingStatus} onValueChange={setPendingStatus}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={applyStatus}>Update</Button>
                {flash && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-good">
                    <CheckCircle2 className="h-4 w-4" />
                    Status updated
                  </span>
                )}
              </div>
              <Textarea
                placeholder="Resolution notes — parts fitted, tests performed, follow-up needed…"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required parts</CardTitle>
              <CardDescription>Check off parts loaded in the van</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.parts.length === 0 && (
                <p className="text-sm text-muted-foreground">No parts required for this job.</p>
              )}
              {ticket.parts.map((part) => {
                const done = !!checkedParts[part]
                return (
                  <button
                    key={part}
                    type="button"
                    onClick={() => setCheckedParts((prev) => ({ ...prev, [part]: !prev[part] }))}
                    className={cn(
                      'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                      done && 'bg-primary/5'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        done
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-input bg-card'
                      )}
                    >
                      {done && <Check className="h-3 w-3" />}
                    </span>
                    <span className={cn(done && 'text-muted-foreground line-through')}>{part}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SLA</CardTitle>
              <CardDescription>Response window from creation to due time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                {overdue ? (
                  <span className="font-semibold text-status-critical">Overdue by {hours}h</span>
                ) : (
                  <>
                    <span className="font-semibold tabular-nums">{hours}h</span>{' '}
                    <span className="text-muted-foreground">remaining</span>
                  </>
                )}
              </p>
              <Progress
                value={slaUsed}
                indicatorClassName={overdue ? 'bg-status-critical' : undefined}
              />
              <p className="text-xs text-muted-foreground">{slaUsed}% of the SLA window elapsed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Station info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{ticket.station}</p>
                  <p className="text-muted-foreground">
                    {station ? `${station.address}, ${station.city}` : 'Address on file'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Access hours</p>
                  <p className="text-muted-foreground">{station?.hours ?? 'Contact site manager'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">Charger</p>
                  <p className="text-muted-foreground">{ticket.charger}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function TicketDetails() {
  const { id } = useParams()
  const ticket = tickets.find((t) => t.id === id) ?? tickets[0]
  return <TicketView key={ticket.id} ticket={ticket} />
}
