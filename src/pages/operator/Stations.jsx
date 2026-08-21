import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, CheckCircle2, MapPin, Plus, Star, Zap } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { MapPlaceholder } from '@/components/shared/map-placeholder'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cn, formatCurrency } from '@/lib/utils'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { createStation, fetchStations, updateStation } from '@/lib/api/stations'

const FALLBACK_OPERATOR = 'VoltGrid Network'
const STATUSES = [
  { value: 'online', label: 'Online' },
  { value: 'in-use', label: 'All bays busy' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
]

export default function Stations() {
  const query_ = useQuery(fetchStations, [])
  const stations = useMemo(() => query_.data ?? [], [query_.data])

  const [selectedId, setSelectedId] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [operatorFilter, setOperatorFilter] = useState('all')

  // Add-station dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addDone, setAddDone] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', connectors: '4' })

  // Manage dialog
  const [managing, setManaging] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editStatus, setEditStatus] = useState('online')
  const [savedId, setSavedId] = useState(null)
  const [actionError, setActionError] = useState(null)

  // The operator filter offers whoever actually runs a site on the network.
  const OPERATORS = useMemo(
    () => [...new Set(stations.map((s) => s.operator))].filter(Boolean),
    [stations]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return stations.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter
      const matchesOperator = operatorFilter === 'all' || s.operator === operatorFilter
      return matchesQuery && matchesStatus && matchesOperator
    })
  }, [stations, query, statusFilter, operatorFilter])

  const closeAdd = (open) => {
    setAddOpen(open)
    if (!open) {
      setAddDone(false)
      setForm({ name: '', address: '', connectors: '4' })
    }
  }

  const addStation = async () => {
    if (!form.name.trim()) return
    setActionError(null)
    try {
      await createStation({
        name: form.name.trim(),
        address: form.address.trim(),
        operator: OPERATORS[0] ?? FALLBACK_OPERATOR,
        connectorCount: Math.max(1, parseInt(form.connectors, 10) || 1),
      })
      setAddDone(true)
      query_.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  const openManage = (station) => {
    setManaging(station)
    setEditPrice(String(station.pricePerKwh))
    setEditStatus(station.status)
    setSavedId(null)
  }

  const saveManage = async () => {
    const price = parseFloat(editPrice)
    setActionError(null)
    try {
      await updateStation(managing.id, {
        pricePerKwh: Number.isFinite(price) ? price : undefined,
        status: editStatus,
      })
      setSavedId(managing.id)
      query_.refetch()
    } catch (err) {
      setActionError(err)
    }
  }

  if (query_.loading && !query_.data) return <LoadingRows rows={6} />
  if (query_.error) {
    return <ErrorState error={query_.error} onRetry={query_.refetch} title="Could not load stations" />
  }

  return (
    <div className="space-y-6">
      {actionError && <ErrorState error={actionError} title="That change did not go through" />}
      <PageHeader
        title="Stations"
        description="Add sites, set pricing and publish availability."
        actions={
          <>
            <SearchInput
              placeholder="Search name, address or city…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-64"
            />
            <Button onClick={() => setAddOpen(true)}>
              <Plus />
              Add station
            </Button>
          </>
        }
      />

      <div className="space-y-2">
        <MapPlaceholder
          height={320}
          markers={stations.map((s) => ({
            id: s.id,
            name: s.name,
            x: s.x,
            y: s.y,
            status: s.status,
          }))}
          selectedId={selectedId}
          onSelect={(m) => setSelectedId(m.id === selectedId ? null : m.id)}
        />
        <p className="text-xs text-muted-foreground">
          Pin colour follows each site&apos;s status. Select a pin to highlight its card.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={operatorFilter} onValueChange={setOperatorFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Operator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All operators</SelectItem>
            {OPERATORS.map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} of {stations.length} stations
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No stations match"
          description="Try a different search term, status or operator."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
                setOperatorFilter('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.04 }}
              whileHover={{ y: -2 }}
            >
              <Card
                className={cn(
                  'flex h-full flex-col transition-shadow',
                  selectedId === s.id && 'ring-2 ring-ring/40'
                )}
                onClick={() => setSelectedId(s.id)}
              >
                <CardContent className="flex-1 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" /> {s.operator}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" /> {s.address}, {s.city}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress value={s.utilization} className="h-1.5 flex-1" />
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {s.utilization}% utilised
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {s.connectors.map((c) => (
                      <Badge key={c.type} variant="outline" className="gap-1 font-normal">
                        <Zap className="h-3 w-3 text-primary" />
                        {c.type} · {c.power} kW · {c.available}/{c.total}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatCurrency(s.pricePerKwh)}
                      <span className="font-normal text-muted-foreground">/kWh</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                      {s.rating > 0 ? s.rating.toFixed(1) : 'New'}
                    </span>
                    {s.reviews > 0 && <span>({s.reviews} reviews)</span>}
                  </div>
                </CardContent>

                <CardFooter className="justify-between border-t px-5 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openManage(s)
                    }}
                  >
                    Manage
                  </Button>
                  <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                    <Link to="/operator/chargers">
                      View chargers
                      <ArrowRight />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add station */}
      <Dialog open={addOpen} onOpenChange={closeAdd}>
        <DialogContent>
          {addDone ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle>Station added</DialogTitle>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{form.name}</span> is now on the network.
                Configure its chargers next.
              </p>
              <Button variant="outline" className="mt-2" onClick={() => closeAdd(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add station</DialogTitle>
                <DialogDescription>Add a new charging site to your network.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="st-name">Station name</Label>
                  <Input
                    id="st-name"
                    placeholder="e.g. Bayview Charge Hub"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-address">Address</Label>
                  <Input
                    id="st-address"
                    placeholder="Street address"
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="st-connectors">Connectors</Label>
                  <Input
                    id="st-connectors"
                    type="number"
                    min="1"
                    value={form.connectors}
                    onChange={(e) => setForm((f) => ({ ...f, connectors: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Added as 150 kW CCS2 bays — you can change the mix later.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => closeAdd(false)}>
                  Cancel
                </Button>
                <Button onClick={addStation} disabled={!form.name.trim()}>
                  Add station
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage pricing & status */}
      <Dialog open={!!managing} onOpenChange={(open) => !open && setManaging(null)}>
        <DialogContent>
          {managing && (
            <>
              <DialogHeader>
                <DialogTitle>Manage {managing.name}</DialogTitle>
                <DialogDescription>Set pricing and published status for this site.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mg-price">Price (USD per kWh)</Label>
                  <Input
                    id="mg-price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Published status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  Changes apply to every charger at this site as soon as you save.
                </p>
              </div>
              <DialogFooter className="items-center">
                {savedId === managing.id && (
                  <span className="mr-auto inline-flex items-center gap-1.5 text-sm font-medium text-status-good">
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </span>
                )}
                <Button variant="outline" onClick={() => setManaging(null)}>
                  Close
                </Button>
                <Button onClick={saveManage}>Save changes</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
