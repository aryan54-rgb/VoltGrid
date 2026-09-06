import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, CheckCircle2, Crosshair, Loader2, MapPin, Plus, Radio, Star, Zap } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { StationMap } from '@/components/shared/station-map'
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
import { parseLatitude, parseLongitude, toMarkers } from '@/lib/geo'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { createStation, fetchStations, updateStation } from '@/lib/api/stations'

const FALLBACK_OPERATOR = 'VoltGrid Network'
const BLANK_FORM = { name: '', address: '', connectors: '4', latitude: '', longitude: '' }

const STATUSES = [
  { value: 'online', label: 'Online' },
  { value: 'in-use', label: 'All bays busy' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
]

/**
 * Coordinates are optional -- a site can be commissioned before it is surveyed
 * -- but half a pair is never useful, and a transposed pair is the mistake a
 * hand-typed coordinate actually makes, so the two ranges are checked apart.
 *
 * Returns a message to show, or null when the pair is fine.
 */
function coordinateError(latitude, longitude) {
  const lat = latitude.trim()
  const lng = longitude.trim()
  if (!lat && !lng) return null
  if (!lat || !lng) return 'Enter both latitude and longitude, or leave both blank.'
  if (parseLatitude(lat) === null) return 'Latitude must be a number between -90 and 90.'
  if (parseLongitude(lng) === null) return 'Longitude must be a number between -180 and 180.'
  return null
}

/** The two coordinate fields, shared by the add and the manage dialog. */
function CoordinateFields({
  idPrefix,
  latitude,
  longitude,
  onChange,
  error,
  onUseCurrentLocation,
  isDetecting = false,
  geoError = null,
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${idPrefix}-lat`}>Coordinates</Label>
        {onUseCurrentLocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
            onClick={onUseCurrentLocation}
            disabled={isDetecting}
          >
            {isDetecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MapPin className="h-3.5 w-3.5" />}
            {isDetecting ? 'Detecting...' : 'Use current location'}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          id={`${idPrefix}-lat`}
          type="number"
          step="0.00000001"
          min="-90"
          max="90"
          inputMode="decimal"
          placeholder="Latitude e.g. 18.52043210"
          aria-label="Latitude"
          aria-invalid={!!error}
          value={latitude}
          onChange={(e) => onChange({ latitude: e.target.value })}
        />
        <Input
          id={`${idPrefix}-lng`}
          type="number"
          step="0.00000001"
          min="-180"
          max="180"
          inputMode="decimal"
          placeholder="Longitude e.g. 73.85674321"
          aria-label="Longitude"
          aria-invalid={!!error}
          value={longitude}
          onChange={(e) => onChange({ longitude: e.target.value })}
        />
      </div>
      {error ? (
        <p className="text-xs text-status-critical">{error}</p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Decimal degrees. Drivers measure their own distance from this pair, so it is worth
          getting right -- leave both blank until the site has been surveyed.
        </p>
      )}
      {geoError && <p className="text-xs text-rose-500 dark:text-rose-400">{geoError}</p>}
    </div>
  )
}

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
  const [form, setForm] = useState(BLANK_FORM)
  const [isDetecting, setIsDetecting] = useState(false)
  const [geoError, setGeoError] = useState(null)

  // Manage dialog
  const [managing, setManaging] = useState(null)
  const [editPrice, setEditPrice] = useState('')
  const [editStatus, setEditStatus] = useState('online')
  const [editCoords, setEditCoords] = useState({ latitude: '', longitude: '' })
  const [savedId, setSavedId] = useState(null)
  const [actionError, setActionError] = useState(null)

  // The operator filter offers whoever actually runs a site on the network.
  const OPERATORS = useMemo(
    () => [...new Set(stations.map((s) => s.operator))].filter(Boolean),
    [stations]
  )

  // Pins are projected from the stations' own coordinates, so an unsurveyed
  // site simply has none rather than being parked somewhere invented.
  const markers = useMemo(() => toMarkers(stations), [stations])
  const unlocatedCount = stations.length - markers.length

  const addCoordError = useMemo(
    () => coordinateError(form.latitude, form.longitude),
    [form.latitude, form.longitude]
  )
  const editCoordError = useMemo(
    () => coordinateError(editCoords.latitude, editCoords.longitude),
    [editCoords.latitude, editCoords.longitude]
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
      setForm(BLANK_FORM)
      setIsDetecting(false)
      setGeoError(null)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Location detection is not supported by this browser.')
      return
    }

    setGeoError(null)
    setIsDetecting(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((f) => ({
          ...f,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7),
        }))
        setIsDetecting(false)
      },
      (error) => {
        const messages = {
          1: 'Location access was denied. Allow location access and try again.',
          2: 'Your location could not be determined. Please try again or enter coordinates manually.',
          3: 'Location detection timed out. Please try again or enter coordinates manually.',
        }
        setGeoError(messages[error.code] ?? 'Location detection failed. Please enter coordinates manually.')
        setIsDetecting(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const addStation = async () => {
    if (!form.name.trim() || addCoordError) return
    setActionError(null)
    try {
      await createStation({
        name: form.name.trim(),
        address: form.address.trim(),
        operator: OPERATORS[0] ?? FALLBACK_OPERATOR,
        connectorCount: Math.max(1, parseInt(form.connectors, 10) || 1),
        // A blank field parses to null, which is exactly what the column means
        // by "not surveyed yet".
        latitude: parseLatitude(form.latitude),
        longitude: parseLongitude(form.longitude),
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
    setEditCoords({
      latitude: station.latitude === null ? '' : String(station.latitude),
      longitude: station.longitude === null ? '' : String(station.longitude),
    })
    setSavedId(null)
  }

  const saveManage = async () => {
    if (editCoordError) return
    const price = parseFloat(editPrice)
    setActionError(null)
    try {
      await updateStation(managing.id, {
        pricePerKwh: Number.isFinite(price) ? price : undefined,
        status: editStatus,
        // Clearing both fields sends null and puts the site back to unsurveyed.
        latitude: parseLatitude(editCoords.latitude),
        longitude: parseLongitude(editCoords.longitude),
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
            <Button asChild variant="outline" className="gap-1.5 shadow-xs">
              <Link to="/operator/kiosk">
                <Radio className="h-4 w-4 text-primary animate-pulse" />
                Kiosk Simulator
              </Link>
            </Button>
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
        <StationMap
          stations={stations}
          height={320}
          selectedId={selectedId}
          onSelect={(m) => setSelectedId(m.id === selectedId ? null : m.id)}
        />
        <p className="text-xs text-muted-foreground">
          Pin colour follows each site&apos;s status. Select a pin to highlight its card.
          {unlocatedCount > 0 &&
            ` ${unlocatedCount} ${unlocatedCount === 1 ? 'site has' : 'sites have'} no coordinates yet and cannot be pinned \u2014 add them from Manage.`}
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
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Crosshair className="h-3 w-3 shrink-0" />
                        {s.latitude === null || s.longitude === null ? (
                          <span className="text-status-warning">Coordinates not set</span>
                        ) : (
                          <span className="tabular-nums">
                            {s.latitude.toFixed(6)}, {s.longitude.toFixed(6)}
                          </span>
                        )}
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
                <CoordinateFields
                  idPrefix="st"
                  latitude={form.latitude}
                  longitude={form.longitude}
                  error={addCoordError}
                  onChange={(patch) => {
                    setGeoError(null)
                    setForm((f) => ({ ...f, ...patch }))
                  }}
                  onUseCurrentLocation={handleUseCurrentLocation}
                  isDetecting={isDetecting}
                  geoError={geoError}
                />
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
                <Button onClick={addStation} disabled={!form.name.trim() || !!addCoordError}>
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
                <CoordinateFields
                  idPrefix="mg"
                  latitude={editCoords.latitude}
                  longitude={editCoords.longitude}
                  error={editCoordError}
                  onChange={(patch) => setEditCoords((c) => ({ ...c, ...patch }))}
                />
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
                <Button onClick={saveManage} disabled={!!editCoordError}>
                  Save changes
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
