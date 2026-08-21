import { Link, useParams } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
} from 'recharts'
import {
  MapPin,
  Star,
  Clock,
  Building2,
  CalendarPlus,
  Navigation,
  Share2,
  Zap,
  Receipt,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
import { MapPlaceholder } from '@/components/shared/map-placeholder'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency, formatDate, initials } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchStation } from '@/lib/api/stations'
import { fetchReviews } from '@/lib/api/reviews'

/** Hourly utilization, 6am–10pm. */
const UTILIZATION_TODAY = [
  { hour: '6 AM', utilization: 18 },
  { hour: '7 AM', utilization: 34 },
  { hour: '8 AM', utilization: 56 },
  { hour: '9 AM', utilization: 71 },
  { hour: '10 AM', utilization: 64 },
  { hour: '11 AM', utilization: 58 },
  { hour: '12 PM', utilization: 67 },
  { hour: '1 PM', utilization: 73 },
  { hour: '2 PM', utilization: 62 },
  { hour: '3 PM', utilization: 55 },
  { hour: '4 PM', utilization: 68 },
  { hour: '5 PM', utilization: 84 },
  { hour: '6 PM', utilization: 91 },
  { hour: '7 PM', utilization: 76 },
  { hour: '8 PM', utilization: 52 },
  { hour: '9 PM', utilization: 37 },
  { hour: '10 PM', utilization: 22 },
]

const IDLE_FEE_PER_MIN = 0.3
const GRACE_PERIOD_MIN = 10

function Stars({ rating }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'h-3.5 w-3.5',
            n <= rating ? 'fill-current text-amber-500' : 'text-muted-foreground/40'
          )}
        />
      ))}
    </span>
  )
}

export default function StationDetails() {
  const { id } = useParams()
  const query = useQueries(
    {
      station: () => fetchStation(id),
      reviews: () => fetchReviews({ stationId: id }),
    },
    [id]
  )
  const station = query.data?.station ?? null
  const reviews = query.data?.reviews ?? []

  if (query.loading && !station) return <LoadingRows rows={6} />
  if (query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} title="Could not load this station" />
  }
  if (!station) {
    return (
      <EmptyState
        icon={MapPin}
        title="Station not found"
        description="This station is no longer on the network, or the link is out of date."
        action={
          <Button asChild variant="outline">
            <Link to="/driver/stations">All stations</Link>
          </Button>
        }
      />
    )
  }

  const totals = station.connectors.reduce(
    (acc, c) => ({ available: acc.available + c.available, total: acc.total + c.total }),
    { available: 0, total: 0 }
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={station.name}
        description={`${station.operator} · ${station.distance} mi away`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/driver/stations">All stations</Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <p className="text-lg font-semibold tracking-tight">{station.name}</p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" /> {station.address}, {station.city}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" /> {station.operator}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" /> {station.hours}
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                  <span className="font-medium">{station.rating}</span>
                  <span className="text-muted-foreground">({station.reviews} reviews)</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{station.distance} mi away</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(station.pricePerKwh)}/kWh
                </span>
              </p>
            </div>
            <StatusBadge status={station.status} />
          </div>

          <div className="flex flex-wrap gap-1">
            {station.amenities.map((a) => (
              <Badge key={a} variant="secondary" className="font-normal">
                {a}
              </Badge>
            ))}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`/driver/stations/${station.id}/book`}>
                <CalendarPlus /> Book a slot
              </Link>
            </Button>
            <Button variant="ghost">
              <Navigation /> Navigate
            </Button>
            <Button variant="ghost">
              <Share2 /> Share
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Connectors</CardTitle>
            <span className="text-sm text-muted-foreground">
              {totals.available} of {totals.total} available
            </span>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {station.connectors.map((c) => (
              <div key={c.type} className="space-y-3 rounded-xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.type}</p>
                      <p className="text-xs text-muted-foreground">Up to {c.power} kW</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {c.available}/{c.total}
                  </span>
                </div>
                <Progress value={(c.available / c.total) * 100} />
                <p className="text-xs text-muted-foreground">
                  {c.available === 0
                    ? 'All bays currently occupied'
                    : `${c.available} of ${c.total} bays free right now`}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Pricing</CardTitle>
            <Badge variant="outline" className="gap-1 font-normal">
              <Receipt className="h-3 w-3" />
              Pay as you go
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Energy</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(station.pricePerKwh)} / kWh
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Idle fee</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(IDLE_FEE_PER_MIN)} / min
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Grace period</span>
              <span className="font-medium tabular-nums">{GRACE_PERIOD_MIN} min</span>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Idle fees start once the {GRACE_PERIOD_MIN}-minute grace period ends after your session
              finishes.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title="Utilization today" description="Share of bays in use per hour" height={260}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={UTILIZATION_TODAY}>
                <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="hour" {...axisProps} interval={1} />
                <YAxis {...axisProps} width={40} />
                <RTooltip
                  content={<ChartTooltip formatter={(v) => `${v}%`} />}
                  cursor={{ stroke: 'var(--chart-axis)' }}
                />
                <Bar
                  dataKey="utilization"
                  name="Utilization"
                  fill={CHART_COLORS[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="space-y-2">
          <MapPlaceholder
            height={260}
            markers={[
              { id: station.id, name: station.name, x: station.x, y: station.y, status: station.status },
            ]}
            selectedId={station.id}
          />
          <p className="text-xs text-muted-foreground">
            {station.address}, {station.city}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Ratings &amp; reviews</CardTitle>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                {station.rating}
              </span>
              <span>· {station.reviews} reviews from drivers</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {reviews.length === 0 ? (
            <p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
              No reviews for this station yet.
            </p>
          ) : (
          <div className="divide-y border-t">
            {reviews.map((r) => (
              <div key={r.id} className="flex gap-3 px-5 py-4">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback>{initials(r.author)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{r.author}</span>
                    <Stars rating={r.rating} />
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDate(r.date)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.body}</p>
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
