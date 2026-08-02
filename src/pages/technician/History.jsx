import { useState } from 'react'
import { CheckCircle2, Route, Target, Timer } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { ChartCard, CHART_COLORS, GRID, axisProps, ChartTooltip } from '@/components/shared/chart'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDate } from '@/lib/utils'
import { maintenanceHistory, tickets } from '@/data/tickets'

const jobsPerWeek = [
  { week: 'Jun 8', jobs: 4 },
  { week: 'Jun 15', jobs: 6 },
  { week: 'Jun 22', jobs: 5 },
  { week: 'Jun 29', jobs: 7 },
  { week: 'Jul 6', jobs: 5 },
  { week: 'Jul 13', jobs: 6 },
  { week: 'Jul 20', jobs: 8 },
  { week: 'Jul 27', jobs: 6 },
]

function partsFor(ticketId) {
  const ticket = tickets.find((t) => t.id === ticketId)
  return ticket?.parts?.length ? ticket.parts : null
}

export default function History() {
  const [query, setQuery] = useState('')
  const [outcome, setOutcome] = useState('all')
  const [selected, setSelected] = useState(null)

  const filtered = maintenanceHistory.filter((job) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      job.id.toLowerCase().includes(q) ||
      job.stationName.toLowerCase().includes(q) ||
      job.task.toLowerCase().includes(q) ||
      job.ticketId.toLowerCase().includes(q)
    const matchesOutcome = outcome === 'all' || job.outcome === outcome
    return matchesQuery && matchesOutcome
  })

  return (
    <div className="space-y-6">
      <PageHeader title="Work history" description="Completed jobs and field performance." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Jobs completed" value="47" icon={CheckCircle2} index={0} />
        <StatCard label="Average duration" value="2.6 h" icon={Timer} index={1} />
        <StatCard label="Resolution rate" value="94%" icon={Target} index={2} />
        <StatCard label="Distance driven" value="1,240 km" icon={Route} index={3} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search station, task or ticket…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full sm:w-72"
        />
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {maintenanceHistory.length} jobs
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Ticket ref</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer" onClick={() => setSelected(job)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{job.id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(job.date)}
                    </TableCell>
                    <TableCell className="text-sm">{job.stationName}</TableCell>
                    <TableCell className="max-w-56">
                      <span className="block truncate">{job.task}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{job.ticketId}</TableCell>
                    <TableCell className="text-right tabular-nums">{job.durationHours} h</TableCell>
                    <TableCell>
                      <StatusBadge status={job.outcome} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No jobs match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <ChartCard title="Jobs per week" description="Last 8 weeks" height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={jobsPerWeek} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
              <XAxis dataKey="week" {...axisProps} interval={1} />
              <YAxis {...axisProps} width={40} allowDecimals={false} />
              <RTooltip
                content={<ChartTooltip formatter={(v) => `${v} jobs`} />}
                cursor={{ fill: 'var(--chart-grid)' }}
              />
              <Bar
                dataKey="jobs"
                name="Jobs"
                fill={CHART_COLORS[0]}
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Job report — {selected.id}</DialogTitle>
                <DialogDescription>
                  {selected.stationName} · {formatDate(selected.date)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Task</p>
                    <p className="mt-0.5 font-medium">{selected.task}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ticket ref</p>
                    <p className="mt-0.5 font-mono">{selected.ticketId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration on site</p>
                    <p className="mt-0.5 font-medium tabular-nums">{selected.durationHours} h</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outcome</p>
                    <div className="mt-0.5">
                      <StatusBadge status={selected.outcome} />
                    </div>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Summary</p>
                  <p className="mt-1 text-muted-foreground">
                    Work completed per procedure. Functional test passed on all affected bays and the
                    site was returned to service. No follow-up visit required.
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parts used</p>
                  {partsFor(selected.ticketId) ? (
                    <ul className="mt-1 list-inside list-disc text-muted-foreground">
                      {partsFor(selected.ticketId).map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-muted-foreground">—</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Technician signature</p>
                  <div className="mt-2 flex h-14 items-end rounded-lg border border-dashed px-3 pb-2">
                    <span className="font-serif text-lg italic text-muted-foreground">
                      Alex Turner
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
