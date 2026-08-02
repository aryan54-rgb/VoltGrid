import * as React from 'react'
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Check,
  CircleDollarSign,
  Inbox,
  MoreHorizontal,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { StatCard } from '@/components/shared/stat-card'
import { EmptyState } from '@/components/shared/empty-state'
import { CHART_COLORS, ChartCard, ChartTooltip, GRID, axisProps } from '@/components/shared/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'
import { categories, products } from '@/data/marketplace'

const LOW_STOCK = 25

/** Seller submissions waiting on a reviewer. */
const PENDING_LISTINGS = [
  {
    id: 'mp-pending-1',
    name: 'DualPort 22kW Wallbox',
    seller: 'NordVolt',
    category: 'Home charging',
    price: 899,
    submitted: '2026-07-29',
    description:
      'Two-socket 22kW wallbox with dynamic load balancing across both ports and a built-in energy meter.',
  },
  {
    id: 'mp-pending-2',
    name: 'Coiled Type 2 Cable · 5m',
    seller: 'AutoNiche',
    category: 'Cables',
    price: 89,
    submitted: '2026-07-27',
    description:
      'Coiled 5m 16A Type 2 cable that retracts off the ground, with a moulded grip and storage strap.',
  },
]

/** Gross merchandise value per catalogue category, this month. */
const GMV_FIGURES = {
  'Home charging': 148200,
  Cables: 96400,
  Adapters: 61800,
  Accessories: 34500,
  Memberships: 28900,
  Services: 12300,
}

const GMV_BY_CATEGORY = categories
  .filter((c) => c !== 'All')
  .map((category) => ({ category, gmv: GMV_FIGURES[category] ?? 0 }))
  .sort((a, b) => b.gmv - a.gmv)

function priceLabel(p) {
  if (!p.price) return 'Free'
  return `${formatCurrency(p.price)}${p.per ? ` ${p.per}` : ''}`
}

export default function Marketplace() {
  const [items, setItems] = React.useState(products)
  const [queue, setQueue] = React.useState(PENDING_LISTINGS)
  const [query, setQuery] = React.useState('')
  const [category, setCategory] = React.useState('All')
  const [unlisted, setUnlisted] = React.useState([])
  const [featured, setFeatured] = React.useState([])
  const [notice, setNotice] = React.useState(null)
  const [removing, setRemoving] = React.useState(null)

  React.useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(null), 2000)
    return () => clearTimeout(timer)
  }, [notice])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((p) => {
      const matchesCategory = category === 'All' || p.category === category
      const matchesQuery =
        !q || p.name.toLowerCase().includes(q) || p.seller.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [items, query, category])

  const gmv = React.useMemo(() => GMV_BY_CATEGORY.reduce((sum, r) => sum + r.gmv, 0), [])
  const avgRating = React.useMemo(() => {
    const rated = items.filter((p) => p.rating > 0)
    if (!rated.length) return '0.0'
    return (rated.reduce((sum, p) => sum + p.rating, 0) / rated.length).toFixed(1)
  }, [items])

  function approve(listing) {
    setItems((prev) => [
      {
        id: listing.id,
        name: listing.name,
        category: listing.category,
        price: listing.price,
        rating: 0,
        reviews: 0,
        badge: null,
        seller: listing.seller,
        stock: null,
        gradient: 'from-slate-400 to-slate-600',
        description: listing.description,
      },
      ...prev,
    ])
    setQueue((prev) => prev.filter((l) => l.id !== listing.id))
    setNotice(`${listing.name} is now live`)
  }

  function reject(listing) {
    setQueue((prev) => prev.filter((l) => l.id !== listing.id))
    setNotice(`${listing.name} was rejected`)
  }

  function toggleFeatured(product) {
    setFeatured((prev) =>
      prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]
    )
    setNotice(
      featured.includes(product.id)
        ? `${product.name} removed from featured`
        : `${product.name} is now featured`
    )
  }

  function toggleUnlisted(product) {
    setUnlisted((prev) =>
      prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]
    )
  }

  function confirmRemove() {
    if (!removing) return
    setItems((prev) => prev.filter((p) => p.id !== removing.id))
    setNotice(`${removing.name} was removed`)
    setRemoving(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Moderate seller listings, keep the catalogue accurate and track merchandise value."
        actions={
          notice ? (
            <Badge variant="success">
              <Check /> {notice}
            </Badge>
          ) : (
            <Badge variant="secondary">{queue.length} awaiting review</Badge>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard index={0} label="Live listings" value={items.length} icon={Package} />
        <StatCard
          index={1}
          label="GMV this month"
          value={formatCurrency(gmv)}
          delta={11}
          icon={CircleDollarSign}
        />
        <StatCard index={2} label="Orders" value={formatNumber(1204)} icon={ShoppingBag} />
        <StatCard index={3} label="Average rating" value={avgRating} icon={Star} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending approvals</CardTitle>
          <CardDescription>
            New seller submissions stay hidden from shoppers until a reviewer approves them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {queue.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="Queue is clear"
              description="Every submitted listing has been reviewed. New submissions will appear here."
            />
          ) : (
            queue.map((l) => (
              <div
                key={l.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{l.name}</p>
                    <Badge variant="secondary">{l.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {l.seller} · {formatCurrency(l.price)} · submitted {formatDate(l.submitted)}
                  </p>
                  <p className="max-w-xl text-sm text-muted-foreground">{l.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button size="sm" onClick={() => approve(l)}>
                    <Check /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => reject(l)}>
                    <X /> Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search products or sellers…"
          className="w-full sm:w-72"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c === 'All' ? 'All categories' : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={Package}
              title="No listings match"
              description="Adjust the search term or pick a different category."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br ${p.gradient}`} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium">
                            {p.name}
                            {featured.includes(p.id) && (
                              <Badge variant="info">
                                <Star /> Featured
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{p.seller}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.category}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{priceLabel(p)}</TableCell>
                    <TableCell className="tabular-nums">
                      {p.stock == null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : p.stock < LOW_STOCK ? (
                        <Badge variant="warning">Low · {p.stock}</Badge>
                      ) : (
                        formatNumber(p.stock)
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 tabular-nums">
                        <Star className="h-3.5 w-3.5 text-muted-foreground" />
                        {p.rating ? p.rating.toFixed(1) : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {unlisted.includes(p.id) ? (
                        <Badge variant="outline">Unlisted</Badge>
                      ) : (
                        <Badge variant="success">Live</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${p.name}`}>
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleFeatured(p)}>
                            <Sparkles />
                            {featured.includes(p.id) ? 'Unfeature' : 'Feature'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleUnlisted(p)}>
                            <Package />
                            {unlisted.includes(p.id) ? 'Relist' : 'Unlist'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setRemoving(p)}>
                            <Trash2 /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Unlisting hides a product from shoppers without deleting its history, so an existing order
        still resolves to the listing it was bought from.
      </p>

      <ChartCard
        title="Category performance"
        description="Gross merchandise value this month"
        height={280}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={GMV_BY_CATEGORY} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <YAxis type="category" dataKey="category" {...axisProps} width={110} />
            <RTooltip
              content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
              cursor={{ stroke: 'var(--chart-axis)' }}
            />
            <Bar dataKey="gmv" name="GMV" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <Dialog open={Boolean(removing)} onOpenChange={(open) => !open && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove listing?</DialogTitle>
            <DialogDescription>
              {removing?.name} by {removing?.seller} will be taken off the marketplace. This cannot
              be undone from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRemove}>
              <Trash2 /> Remove listing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
