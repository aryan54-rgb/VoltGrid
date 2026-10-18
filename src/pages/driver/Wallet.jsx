import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  CheckCircle2,
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  RotateCcw,
  ShoppingBag,
  BadgePercent,
  ChevronRight,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQueries } from '@/hooks/use-query'
import {
  fetchTransactions,
  fetchWallet,
  createTopUpOrder,
  verifyTopUpPayment,
  loadRazorpayCheckout,
} from '@/lib/api/wallet'

const PRESETS = [25, 50, 100]

const TYPE_ICONS = {
  topup: ArrowDownLeft,
  charge: Zap,
  refund: RotateCcw,
  purchase: ShoppingBag,
  subscription: BadgePercent,
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? 'font-semibold tabular-nums' : 'font-medium tabular-nums'}>
        {value}
      </span>
    </div>
  )
}

const EMPTY_WALLET = { balance: 0, currency: 'INR', cards: [] }

export default function Wallet() {
  const query = useQueries({
    wallet: fetchWallet,
    transactions: () => fetchTransactions({ limit: 200 }),
  })
  const wallet = query.data?.wallet ?? EMPTY_WALLET
  const transactions = React.useMemo(() => query.data?.transactions ?? [], [query.data])

  const [addOpen, setAddOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('50')
  const [addedAmount, setAddedAmount] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState(null)

  const balance = wallet.balance

  // Scoped to the month of the most recent movement rather than the wall clock,
  // so the tiles still describe real activity between busy months.
  const thisMonth = React.useMemo(() => {
    const month = transactions[0]?.date?.slice(0, 7)
    const rows = month ? transactions.filter((t) => t.date.startsWith(month)) : []
    return {
      spent: rows.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      toppedUp: rows.filter((t) => t.type === 'topup').reduce((sum, t) => sum + t.amount, 0),
      sessions: rows.filter((t) => t.type === 'charge').length,
    }
  }, [transactions])

  const recent = transactions.slice(0, 6)
  const parsedAmount = Number(amount)
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 100000 && Math.abs(Math.round(parsedAmount * 100) - parsedAmount * 100) < 0.000001

  function toggleDialog(open) {
    setAddOpen(open)
    if (!open) {
      setAddedAmount(null)
      setAmount('50')
    }
  }

  async function confirmTopUp() {
    if (!amountValid || !wallet.userId) return
    setBusy(true)
    setActionError(null)
    try {
      await loadRazorpayCheckout()
      const order = await createTopUpOrder(parsedAmount)
      setAddOpen(false)
      const payment = await new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amountPaise,
          currency: order.currency,
          name: 'VoltGrid',
          description: 'Wallet top-up',
          handler: resolve,
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        })
        checkout.open()
      })
      await verifyTopUpPayment({
        orderId: order.orderId,
        paymentId: payment.razorpay_payment_id,
        signature: payment.razorpay_signature,
      })
      await query.refetch()
      setAddedAmount(parsedAmount)
      setAddOpen(true)
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  if (query.loading && !query.data) return <LoadingRows rows={7} />
  if (query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} title="Could not load your wallet" />
  }
  if (!query.data?.wallet) {
    return (
      <EmptyState
        icon={WalletIcon}
        title="No wallet yet"
        description="A wallet is created with your account. Sign out and back in if this persists."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Your prepaid balance and recent activity. Add funds securely with Razorpay."
      />

      {actionError && (
        <ErrorState error={actionError} title="That wallet change did not go through" />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="overflow-hidden border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-card to-card lg:col-span-2">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <WalletIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Available balance</span>
              </div>
              <p className="text-4xl font-semibold tabular-nums tracking-tight">
                {formatCurrency(balance)}
              </p>
              <p className="text-xs text-muted-foreground">
                Add funds before your balance runs out.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toggleDialog(true)}>
                <Plus /> Add funds
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">This month</CardTitle>
            <CardDescription>{transactions[0]?.date ? new Date(transactions[0].date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : 'No activity yet'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Spent" value={formatCurrency(thisMonth.spent)} />
            <Row label="Topped up" value={formatCurrency(thisMonth.toppedUp)} />
            <Row label="Charging sessions" value={thisMonth.sessions} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Razorpay Checkout</CardTitle>
            <CardDescription>Pay by a method available in your Razorpay test checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => toggleDialog(true)}><Plus /> Add funds</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Payment confirmation</CardTitle>
              <CardDescription>Your balance updates after Razorpay confirms a captured payment.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">If confirmation is delayed, refresh this page to see the updated balance and transaction.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Your last {recent.length} wallet movements.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/driver/transactions">
              View all <ChevronRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y p-2">
          {recent.map((t) => {
            const Icon = TYPE_ICONS[t.type] ?? ArrowUpRight
            const positive = t.amount > 0
            return (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(t.date)} · {t.method}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-medium tabular-nums',
                    positive && 'text-[var(--delta-good)]'
                  )}
                >
                  {positive ? '+' : '−'}
                  {formatCurrency(Math.abs(t.amount))}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={toggleDialog}>
        <DialogContent>
          {addedAmount == null ? (
            <>
              <DialogHeader>
                <DialogTitle>Add funds</DialogTitle>
                <DialogDescription>
                  Top up your wallet. Session costs are deducted from this balance automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant={Number(amount) === p ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setAmount(String(p))}
                    >
                      {formatCurrency(p)}
                    </Button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="topup-amount">Custom amount (INR)</Label>
                  <Input
                    id="topup-amount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Choose a payment method in Razorpay Checkout.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => toggleDialog(false)}>
                  Cancel
                </Button>
                <Button disabled={!amountValid || busy} onClick={confirmTopUp}>
                  Confirm {amountValid ? formatCurrency(parsedAmount) : ''}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Top-up complete</DialogTitle>
                <DialogDescription>
                  {formatCurrency(addedAmount)} added through Razorpay.
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center gap-3 rounded-lg border border-[var(--status-good)]/40 bg-[var(--status-good)]/5 p-4">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--status-good)]" />
                <div>
                  <p className="text-sm font-medium">New balance {formatCurrency(balance)}</p>
                  <p className="text-xs text-muted-foreground">
                    Available immediately for your next charging session.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => toggleDialog(false)}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
