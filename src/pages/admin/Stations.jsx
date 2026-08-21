import { useMemo, useState } from 'react'
import { Zap, CheckCircle2, Wrench, WifiOff, MoreHorizontal, Plus, Star } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { SearchInput } from '@/components/shared/search-input'
import { StatusBadge } from '@/components/shared/status-badge'
import { MapPlaceholder } from '@/components/shared/map-placeholder'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { createStation, fetchStations, updateStation } from '@/lib/api/stations'
import { formatNumber } from '@/lib/utils'

const FALLBACK_OPERATOR = 'VoltGrid Network'

const STATUS_OPTIONS = [
  { key: 'online', label: 'Online' },
  { key: 'in-use', label: 'In use' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'offline', label: 'Offline' },
]

const EMPTY_FORM = { name: '', operator: '', address: '', city: '', price: '0.42' }

/** Total connector bays installed at a site. */
const bayCount = (station) => station.connectors.reduce((sum, c) => sum + c.total, 0)

export default function Stations() {
  const network = useQuery(fetchStations, [])
  const rows = useMemo(() => network.data ?? [], [network.data])

  const [actionError, setActionError] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [operatorFilter, setOperatorFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)

  const [onboardOpen, setOnboardOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY_FORM)

  const OPERATORS = useMemo(
    () => [...new Set(rows.map((s) => s.operator))].filter(Boolean),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !s.address.toLowerCase().includes(q)) return false
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (operatorFilter !== 'all' && s.operator !== operatorFilter) return false
      return true
    })
  }, [rows, query, statusFilter, operatorFilter])

  const onlineCount = rows.filter((s) => s.status === 'online').length
  const maintenanceCount = rows.filter((s) => s.status === 'maintenance').length
  const offlineCount = rows.filter((s) => s.status === 'offline').length

  const setStatus = async (id, status) => {
    setActionError(null)
    try {
      await updateStation(id, { status })
      setDetail((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
      network.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  // Step 3 of the wizard used to be a confirmation with nothing behind it. The
  // site is now really commissioned, with one bay per the default group.
  const submitOnboarding = async () => {
    setActionError(null)
    try {
      await createStation({
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        operator: form.operator || OPERATORS[0] || FALLBACK_OPERATOR,
        connectorCount: 4,
      })
      setStep(3)
      network.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  const closeOnboard = (open) => {
    setOnboardOpen(open)
    if (!open) {
      setStep(1)
      setForm(EMPTY_FORM)
    }
  }

  if (network.loading && !network.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={8} />
      </div>
    )
  }
  if (network.error) {
    return <ErrorState error={network.error} onRetry={network.refetch} title="Could not load stations" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Stations"
        description="Every charging site on the network, across all operators."
        actions={
          <Button onClick={() => setOnboardOpen(true)}>
            <Plus /> Onboard station
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total stations" value={formatNumber(rows.length)} delta={5.6} icon={Zap} index={0} />
        <StatCard label="Online" value={formatNumber(onlineCount)} delta={2.1} icon={CheckCircle2} index={1} />
        <StatCard label="Under maintenance" value={formatNumber(maintenanceCount)} icon={Wrench} index={2} />
        <StatCard label="Offline" value={formatNumber(offlineCount)} delta={-1.2} deltaGoodWhen="down" icon={WifiOff} index={3} />
      </div>

      <MapPlaceholder
        markers={rows.map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y, status: s.status }))}
        selectedId={selectedId}
        onSelect={(m) => setSelectedId(m.id === selectedId ? null : m.id)}
        height={320}
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput
              placeholder="Search by name or address…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Operator" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All operators</SelectItem>
                  {OPERATORS.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {filtered.length} of {rows.length} stations
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Station</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead className="text-right">Connectors</TableHead>
                <TableHead>Utilization</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Price $/kWh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.address}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.operator}</TableCell>
                  <TableCell className="text-right tabular-nums">{bayCount(s)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={s.utilization} className="w-20" />
                      <span className="text-xs tabular-nums text-muted-foreground">{s.utilization}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Star className="h-3.5 w-3.5 fill-current text-muted-foreground" />
                      {s.rating}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">${s.pricePerKwh.toFixed(2)}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Row actions">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetail(s)}>View details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setStatus(s.id, 'online')}>Approve</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatus(s.id, 'maintenance')}>Suspend</DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setStatus(s.id, 'offline')}
                        >
                          Decommission
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No stations match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Station details */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>{detail.address}, {detail.city}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Operator</p>
                  <p className="font-medium">{detail.operator}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <div className="mt-1"><StatusBadge status={detail.status} /></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Price</p>
                  <p className="font-medium tabular-nums">${detail.pricePerKwh.toFixed(2)} / kWh</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Utilization</p>
                  <p className="font-medium tabular-nums">{detail.utilization}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="font-medium tabular-nums">{detail.rating} ({detail.reviews} reviews)</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Hours</p>
                  <p className="font-medium">{detail.hours}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Distance from city centre</p>
                  <p className="font-medium tabular-nums">{detail.distance} mi</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Station ID</p>
                  <p className="font-mono text-xs">{detail.id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Amenities</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {detail.amenities.map((a) => (
                      <Badge key={a} variant="outline">{a}</Badge>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Connectors ({bayCount(detail)} bays)
                </p>
                <div className="max-h-56 space-y-2 overflow-y-auto">
                  {detail.connectors.map((c) => (
                    <div
                      key={c.type}
                      className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{c.type}</span>
                      <span className="tabular-nums text-muted-foreground">{c.power} kW</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.available} of {c.total} free
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetail(null)}>Close</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Onboard station — details, review, done */}
      <Dialog open={onboardOpen} onOpenChange={closeOnboard}>
        <DialogContent>
          {step === 1 && (
            <>
              <DialogHeader>
                <DialogTitle>Onboard station</DialogTitle>
                <DialogDescription>Step 1 of 2 — site details</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="ob-name">Station name</Label>
                  <Input
                    id="ob-name"
                    placeholder="e.g. Bayview Charge Point"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-operator">Operator</Label>
                  <Input
                    id="ob-operator"
                    placeholder="Operator name"
                    value={form.operator}
                    onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ob-address">Address</Label>
                    <Input
                      id="ob-address"
                      placeholder="Street address"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ob-city">City</Label>
                    <Input
                      id="ob-city"
                      placeholder="San Francisco, CA"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ob-price">Price ($/kWh)</Label>
                  <Input
                    id="ob-price"
                    inputMode="decimal"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => closeOnboard(false)}>Cancel</Button>
                <Button disabled={!form.name.trim() || !form.address.trim()} onClick={() => setStep(2)}>
                  Continue
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 2 && (
            <>
              <DialogHeader>
                <DialogTitle>Review station</DialogTitle>
                <DialogDescription>Step 2 of 2 — confirm before submitting for commissioning</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 rounded-lg border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Operator</span>
                  <span className="font-medium">{form.operator || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium">{form.address}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">City</span>
                  <span className="font-medium">{form.city || '—'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium tabular-nums">${form.price || '0.00'} / kWh</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={submitOnboarding}>Submit for onboarding</Button>
              </DialogFooter>
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle>Station submitted</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {form.name} is queued for commissioning at ${form.price || '0.00'}/kWh. It appears on the
                network map once its connectors report in.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => closeOnboard(false)}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
