import * as React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  MapPin,
  Star,
  SearchX,
  Zap,
  Building2,
  LayoutGrid,
  List,
  LocateFixed,
  LocateOff,
  LoaderCircle,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { MapPlaceholder } from '@/components/shared/map-placeholder'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useGeolocation } from '@/hooks/use-geolocation'
import { byDistance, toMarkers, withDistance } from '@/lib/geo'
import { fetchStations } from '@/lib/api/stations'

const STATUS_LABELS = {
  online: 'Online',
  'in-use': 'In use',
  maintenance: 'Maintenance',
  offline: 'Offline',
}

/**
 * What the browser had to say about where the driver is.
 *
 * The three outcomes each need a different sentence: still asking, refused (a
 * retry will not help until a browser setting changes, so the copy points
 * there), or a fix that came back. Everything else -- no GPS lock, a timeout --
 * is worth one more try, so those get a button.
 */
function LocationNotice({ location }) {
  const { status, error, coords, loading, request } = location

  if (loading) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
        Finding your location to work out how far away each station is…
      </p>
    )
  }

  if (status === 'ready') {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <LocateFixed className="h-3.5 w-3.5 text-status-good" />
        Distances measured from your current location
        {coords?.accuracy ? ` (accurate to about ${Math.round(coords.accuracy)} m)` : ''}.
      </p>
    )
  }

  if (!error) return null

  const retryable = status !== 'denied' && status !== 'unsupported'
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-status-warning/40 bg-status-warning/5 px-3 py-2 text-xs">
      <LocateOff className="h-3.5 w-3.5 shrink-0 text-status-warning" />
      <span className="text-muted-foreground">{error.message}</span>
      <span className="text-muted-foreground">Stations are listed without a distance.</span>
      {retryable && (
        <Button variant="outline" size="sm" className="ml-auto h-7" onClick={request}>
          Try again
        </Button>
      )}
    </div>
  )
}

function availabilityOf(station) {
  return station.connectors.reduce(
    (acc, c) => ({ available: acc.available + c.available, total: acc.total + c.total }),
    { available: 0, total: 0 }
  )
}

function ConnectorChips({ station }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {station.connectors.map((c) => (
        <Badge key={c.type} variant="outline" className="gap-1 font-normal">
          <Zap className="h-3 w-3 text-primary" />
          {c.type} · {c.power} kW · {c.available}/{c.total} free
        </Badge>
      ))}
    </div>
  )
}

function Amenities({ station }) {
  return (
    <div className="flex flex-wrap gap-1">
      {station.amenities.map((a) => (
        <Badge key={a} variant="secondary" className="px-1.5 py-0 text-[10px] font-normal">
          {a}
        </Badge>
      ))}
    </div>
  )
}

function Meta({ station }) {
  const { available, total } = availabilityOf(station)
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span className="flex items-center gap-1 font-medium text-foreground">
        <Star className="h-3.5 w-3.5 fill-current text-amber-500" /> {station.rating}
      </span>
      <span>({station.reviews} reviews)</span>
      <span>·</span>
      {/* Dropped entirely when there is no fix yet, or the site is unsurveyed --
          the notice above the list explains which, so a per-card apology would
          only repeat it. */}
      {station.distanceLabel && (
        <>
          <span className="flex items-center gap-1 font-medium text-foreground">
            <LocateFixed className="h-3.5 w-3.5" /> {station.distanceLabel} away
          </span>
          <span>·</span>
        </>
      )}
      <span className="font-medium text-foreground">
        {formatCurrency(station.pricePerKwh)}
        <span className="font-normal text-muted-foreground">/kWh</span>
      </span>
      <span>·</span>
      <span>
        {available}/{total} bays free
      </span>
    </div>
  )
}

function CardActions({ station, className }) {
  return (
    <div className={cn('flex gap-2', className)}>
      <Button asChild variant="outline" size="sm" className="flex-1">
        <Link to={`/driver/stations/${station.id}`}>Details</Link>
      </Button>
      <Button asChild size="sm" className="flex-1">
        <Link to={`/driver/stations/${station.id}/book`}>Book</Link>
      </Button>
    </div>
  )
}

export default function Stations() {
  const { data, loading, error, refetch } = useQuery(fetchStations, [])
  const rows = React.useMemo(() => data ?? [], [data])

  // The browser's own position, asked for once on mount. Until (or unless) it
  // arrives, every station's distance is null: the cards drop the phrase and
  // the notice under the map explains why, rather than inventing a number.
  const location = useGeolocation()

  const stations = React.useMemo(
    () => withDistance(rows, location.coords),
    [rows, location.coords]
  )

  const [query, setQuery] = React.useState('')
  const [connector, setConnector] = React.useState('all')
  const [status, setStatus] = React.useState('all')
  const [sortBy, setSortBy] = React.useState('distance')
  const [view, setView] = React.useState('grid')
  const [selectedId, setSelectedId] = React.useState(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = stations.filter((s) => {
      const matchesQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q)
      const matchesConnector =
        connector === 'all' || s.connectors.some((c) => c.type === connector)
      const matchesStatus = status === 'all' || s.status === status
      return matchesQuery && matchesConnector && matchesStatus
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'price') return a.pricePerKwh - b.pricePerKwh
      // Closest first; anything we could not measure sinks to the bottom rather
      // than sorting as if it were zero kilometres away.
      return byDistance(a, b)
    })
  }, [stations, query, connector, status, sortBy])

  // The filter lists follow whatever the network actually offers, so a new
  // connector type or station status appears without a code change.
  const connectorTypes = React.useMemo(
    () => [...new Set(stations.flatMap((s) => s.connectors.map((c) => c.type)))].sort(),
    [stations]
  )
  const statuses = React.useMemo(() => [...new Set(stations.map((s) => s.status))], [stations])

  // Pins come from the stations' own coordinates; an unsurveyed site has none.
  const markers = React.useMemo(() => toMarkers(stations), [stations])

  const clearFilters = () => {
    setQuery('')
    setConnector('all')
    setStatus('all')
    setSortBy('distance')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find charging stations"
        description={`${stations.length} stations nearby — search by name, address or city.`}
        actions={
          <SearchInput
            placeholder="Search name, address or city…"
            className="w-full sm:w-72"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      <div className="space-y-2">
        <MapPlaceholder
          height={320}
          markers={markers}
          selectedId={selectedId}
          onSelect={(m) => setSelectedId((cur) => (cur === m.id ? null : m.id))}
        />
        <p className="text-xs text-muted-foreground">
          Pin colour follows each station&apos;s current status. Select a pin to highlight its card
          below.
        </p>
        <LocationNotice location={location} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={connector} onValueChange={setConnector}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Connector type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All connectors</SelectItem>
            {connectorTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">
              {location.status === 'ready' ? 'Sort by distance' : 'Sort by distance (needs location)'}
            </SelectItem>
            <SelectItem value="price">Sort by price</SelectItem>
            <SelectItem value="rating">Sort by rating</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {stations.length} stations
          </span>
          <div className="flex items-center gap-1 rounded-lg border p-0.5">
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              onClick={() => setView('grid')}
            >
              <LayoutGrid />
            </Button>
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon-sm"
              aria-label="List view"
              aria-pressed={view === 'list'}
              onClick={() => setView('list')}
            >
              <List />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingRows rows={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Could not load stations" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No stations match your filters"
          description="Try a different connector type, widen the status filter, or search another name."
          action={
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : view === 'grid' ? (
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
              >
                <CardContent className="flex-1 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 shrink-0" /> {s.operator} · {s.hours}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" /> {s.address}, {s.city}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </div>
                  <Meta station={s} />
                  <ConnectorChips station={s} />
                  <Amenities station={s} />
                </CardContent>
                <CardFooter className="border-t pt-4">
                  <CardActions station={s} className="w-full" />
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 6) * 0.03 }}
            >
              <Card className={cn('transition-shadow', selectedId === s.id && 'ring-2 ring-ring/40')}>
                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{s.name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" /> {s.address}, {s.city} · {s.operator}
                    </p>
                    <Meta station={s} />
                    <ConnectorChips station={s} />
                    <Amenities station={s} />
                  </div>
                  <CardActions station={s} className="lg:w-56 lg:shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
