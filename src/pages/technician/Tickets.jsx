import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Inbox, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn, formatDateTime, timeAgo } from '@/lib/utils'
import { tickets } from '@/data/tickets'

const SLA_NOW = new Date('2026-07-31T00:00:00')

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'OPEN', label: 'Open' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
]

const SOURCE_LABEL = {
  DRIVER_REPORT: 'Driver report',
  KIOSK_EMULATOR: 'Charger telemetry',
  PM_SCHEDULE: 'PM schedule',
  FIELD_INSPECTION: 'Field inspection',
}

const PRIORITY_BORDER = {
  CRITICAL: 'border-l-status-critical',
  HIGH: 'border-l-status-critical',
  MEDIUM: 'border-l-status-warning',
  LOW: 'border-l-border',
}

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

function TicketCard({ ticket, index }) {
  const overdue = ticket.status !== 'RESOLVED' && new Date(ticket.slaDueAt) < SLA_NOW
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.04 }}
      whileHover={{ y: -2 }}
    >
      <Card className={cn('flex h-full flex-col border-l-4', PRIORITY_BORDER[ticket.priority])}>
        <CardContent className="flex-1 space-y-3 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{ticket.id}</p>
              <p className="mt-0.5 text-sm font-medium">{ticket.title}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusBadge status={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {ticket.stationName} · {ticket.connectorLabel}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {ticket.faultCode && (
              <Badge variant="outline" className="font-mono font-normal">
                {ticket.faultCode}
              </Badge>
            )}
            <Badge variant="secondary">{SOURCE_LABEL[ticket.source] ?? ticket.source}</Badge>
          </div>

          <div className="space-y-0.5 text-xs text-muted-foreground">
            <p>Reported {timeAgo(ticket.reportedAt)}</p>
            <p className={cn(overdue && 'font-medium text-status-critical')}>
              SLA due {formatDateTime(ticket.slaDueAt)}
              {overdue && ' · overdue'}
            </p>
          </div>
        </CardContent>
        <CardFooter className="border-t px-5 py-3">
          <Button asChild variant="outline" size="sm">
            <Link to={`/technician/tickets/${ticket.id}`}>View details</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

export default function Tickets() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('sla')

  const filtered = tickets
    .filter((t) => {
      const q = query.trim().toLowerCase()
      return (
        !q ||
        t.id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.stationName.toLowerCase().includes(q)
      )
    })
    .sort((a, b) =>
      sortBy === 'priority'
        ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
        : new Date(a.slaDueAt) - new Date(b.slaDueAt)
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Maintenance and fault tickets assigned to you."
        actions={
          <SearchInput
            placeholder="Search ticket, title or station…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64"
          />
        }
      />

      <Tabs defaultValue="all">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            {TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sla">SLA due</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {TABS.map((tab) => {
          const list =
            tab.value === 'all' ? filtered : filtered.filter((t) => t.status === tab.value)
          return (
            <TabsContent key={tab.value} value={tab.value} className="mt-4">
              {list.length === 0 ? (
                <EmptyState
                  icon={Inbox}
                  title="No tickets here"
                  description="Nothing matches this status and search. Try another tab or clear the search."
                  action={
                    query ? (
                      <Button variant="outline" onClick={() => setQuery('')}>
                        Clear search
                      </Button>
                    ) : null
                  }
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {list.map((t, i) => (
                    <TicketCard key={t.id} ticket={t} index={i} />
                  ))}
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
