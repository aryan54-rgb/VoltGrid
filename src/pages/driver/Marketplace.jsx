import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Cable,
  House,
  Plug,
  Package,
  BadgePercent,
  Sun,
  ShoppingCart,
  Star,
  Plus,
  Minus,
  X,
  CheckCircle2,
  PackageSearch,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { EmptyState } from '@/components/shared/empty-state'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import { fetchCategories, fetchProducts } from '@/lib/api/marketplace'
import { fetchWallet, purchase } from '@/lib/api/wallet'
import { cn, formatCurrency } from '@/lib/utils'

/** One icon per category so a listing reads at a glance. */
const CATEGORY_ICON = {
  Cables: Cable,
  'Home charging': House,
  Adapters: Plug,
  Accessories: Package,
  Memberships: BadgePercent,
  Services: Sun,
}

const LOW_STOCK = 25

function priceLabel(p) {
  if (p.price === 0) return 'Free'
  return `${formatCurrency(p.price)}${p.per ?? ''}`
}

/** Gradient banner used on cards and in the details dialog. */
function ProductArt({ product, className }) {
  const Icon = CATEGORY_ICON[product.category] ?? Package
  return (
    <div
      className={cn(
        'relative flex items-center justify-center bg-gradient-to-br',
        product.gradient,
        className
      )}
    >
      <Icon className="h-10 w-10 text-white" strokeWidth={1.5} />
      {product.badge && (
        <Badge variant="secondary" className="absolute left-2 top-2 bg-white/90 text-slate-800">
          {product.badge}
        </Badge>
      )}
      {typeof product.stock === 'number' && product.stock < LOW_STOCK && (
        <Badge variant="warning" className="absolute right-2 top-2 bg-white/90">
          Only {product.stock} left
        </Badge>
      )}
    </div>
  )
}

function Stars({ rating, reviews }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className="h-3.5 w-3.5 fill-status-warning text-status-warning" />
      <span className="font-medium text-foreground">{rating}</span>
      <span>({reviews})</span>
    </span>
  )
}

export default function Marketplace() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [cart, setCart] = useState([])
  const [detail, setDetail] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)
  const [checkoutError, setCheckoutError] = useState(null)

  const shop = useQueries({
    products: fetchProducts,
    categories: fetchCategories,
    wallet: fetchWallet,
  })
  const products = useMemo(() => shop.data?.products ?? [], [shop.data])
  const categories = shop.data?.categories ?? ['All']
  const wallet = shop.data?.wallet

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      const inCategory = category === 'All' || p.category === category
      const inSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.seller.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      return inCategory && inSearch
    })
  }, [products, query, category])

  const itemCount = cart.reduce((sum, line) => sum + line.qty, 0)

  const totals = useMemo(() => {
    const subtotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0)
    return { subtotal, total: subtotal }
  }, [cart])

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((line) => line.id === product.id)
      if (existing) {
        return prev.map((line) => (line.id === product.id ? { ...line, qty: line.qty + 1 } : line))
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          per: product.per,
          category: product.category,
          gradient: product.gradient,
          qty: 1,
        },
      ]
    })
  }

  function changeQty(id, delta) {
    setCart((prev) =>
      prev
        .map((line) => (line.id === id ? { ...line, qty: line.qty + delta } : line))
        .filter((line) => line.qty > 0)
    )
  }

  function removeLine(id) {
    setCart((prev) => prev.filter((line) => line.id !== id))
  }

  // Checkout is a real wallet debit plus a ledger entry, so the order shows up
  // in Transactions rather than only in this dialog.
  async function checkout() {
    if (!wallet?.userId) return
    const summary = cart.map((line) => `${line.qty}× ${line.name}`).join(', ')
    setCheckoutError(null)
    try {
      const updated = await purchase(wallet.userId, totals.total, `Marketplace · ${summary}`)
      setPlacedOrder({ items: itemCount, total: totals.total, balance: updated.balance })
      setCart([])
      shop.refetch()
    } catch (err) {
      setCheckoutError(err)
    }
  }

  function closeCart(open) {
    setCartOpen(open)
    if (!open) setPlacedOrder(null)
  }

  if (shop.loading && !shop.data) return <LoadingRows rows={6} />
  if (shop.error) {
    return <ErrorState error={shop.error} onRetry={shop.refetch} title="Could not load the marketplace" />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Charging hardware, accessories and memberships, billed straight to your VoltGrid wallet."
        actions={
          <SearchInput
            className="w-full sm:w-72"
            placeholder="Search products or sellers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        }
      />

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <Button
            key={c}
            size="sm"
            variant={category === c ? 'default' : 'outline'}
            onClick={() => setCategory(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No products match"
          description="Try a different search term, or switch back to All categories."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQuery('')
                setCategory('All')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -2 }}
            >
              <Card className="flex h-full flex-col overflow-hidden">
                <button
                  type="button"
                  className="flex flex-1 cursor-pointer flex-col text-left"
                  onClick={() => setDetail(p)}
                >
                  <ProductArt product={p} className="h-28 w-full" />
                  <div className="flex flex-1 flex-col gap-1.5 p-4">
                    <p className="line-clamp-2 font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.seller}</p>
                    <Stars rating={p.rating} reviews={p.reviews} />
                    <p className="mt-auto pt-2 text-base font-semibold">{priceLabel(p)}</p>
                  </div>
                </button>
                <div className="p-4 pt-0">
                  <Button className="w-full" onClick={() => addToCart(p)}>
                    {p.category === 'Memberships' ? 'Subscribe' : 'Add to cart'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product details */}
      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          {detail && (
            <>
              <ProductArt product={detail} className="-mx-6 -mt-6 h-32 rounded-t-xl" />
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
                <DialogDescription>Sold by {detail.seller}</DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-between">
                <Stars rating={detail.rating} reviews={detail.reviews} />
                <span className="text-lg font-semibold">{priceLabel(detail)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{detail.description}</p>
              <p className="text-xs text-muted-foreground">
                {typeof detail.stock === 'number'
                  ? `${detail.stock} in stock · ships in 2–4 days`
                  : 'Activates instantly on your account'}
              </p>
              <DialogFooter>
                <Button
                  onClick={() => {
                    addToCart(detail)
                    setDetail(null)
                  }}
                >
                  <ShoppingCart />
                  {detail.category === 'Memberships' ? 'Subscribe' : 'Add to cart'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Floating cart */}
      {itemCount > 0 && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full shadow-lg"
          onClick={() => setCartOpen(true)}
        >
          <ShoppingCart />
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-semibold text-white">
            {itemCount}
          </span>
        </Button>
      )}

      <Dialog open={cartOpen} onOpenChange={closeCart}>
        <DialogContent>
          {checkoutError && (
            <ErrorState error={checkoutError} title="Checkout did not go through" />
          )}
          {placedOrder ? (
            <div className="flex flex-col items-center py-4 text-center">
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <CheckCircle2 className="h-12 w-12 text-status-good" />
              </motion.div>
              <DialogTitle className="mt-4">Order placed</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {placedOrder.items} {placedOrder.items === 1 ? 'item' : 'items'} on the way.
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {formatCurrency(placedOrder.total)} paid from Wallet · balance now{' '}
                {formatCurrency(placedOrder.balance)}
              </p>
              <Button className="mt-5 w-full" onClick={() => closeCart(false)}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Your cart</DialogTitle>
                <DialogDescription>
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} ready to check out.
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-64 space-y-3 overflow-y-auto">
                {cart.map((line) => (
                  <div key={line.id} className="flex items-center gap-3">
                    <div
                      className={cn('h-10 w-10 shrink-0 rounded-md bg-gradient-to-br', line.gradient)}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.price === 0 ? 'Free' : `${formatCurrency(line.price)}${line.per ?? ''}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => changeQty(line.id, -1)}
                        aria-label="Decrease quantity"
                      >
                        <Minus />
                      </Button>
                      <span className="w-6 text-center text-sm">{line.qty}</span>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        onClick={() => changeQty(line.id, 1)}
                        aria-label="Increase quantity"
                      >
                        <Plus />
                      </Button>
                    </div>
                    <span className="w-16 text-right text-sm font-medium">
                      {formatCurrency(line.price * line.qty)}
                    </span>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => removeLine(line.id)}
                      aria-label={`Remove ${line.name}`}
                    >
                      <X />
                    </Button>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between pt-1 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(totals.total)}</span>
                </div>
                <p className="pt-1 text-xs text-muted-foreground">
                  Paid from your VoltGrid wallet. Hardware ships in 2–4 days; memberships and
                  services activate right away.
                </p>
              </div>

              <Button className="w-full" disabled={cart.length === 0} onClick={checkout}>
                Checkout
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
