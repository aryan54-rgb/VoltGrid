import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  CreditCard,
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  topUp as topUpApi,
  updateAutoTopUp,
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

const EMPTY_WALLET = { balance: 0, currency: 'USD', autoTopUp: false, autoTopUpThreshold: 0, autoTopUpAmount: 0, cards: [] }

export default function Wallet() {
  const query = useQueries({
    wallet: fetchWallet,
    transactions: () => fetchTransactions({ limit: 200 }),
  })
  const wallet = query.data?.wallet ?? EMPTY_WALLET
  const transactions = React.useMemo(() => query.data?.transactions ?? [], [query.data])

  const [addOpen, setAddOpen] = React.useState(false)
  const [amount, setAmount] = React.useState('50')
  const [cardId, setCardId] = React.useState(null)
  const [addedAmount, setAddedAmount] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState(null)

  // Default the card picker to the primary card once the wallet has landed.
  React.useEffect(() => {
    if (cardId || !wallet.cards.length) return
    setCardId(wallet.cards.find((c) => c.primary)?.id ?? wallet.cards[0].id)
  }, [cardId, wallet.cards])

  const balance = wallet.balance
  const autoTopUp = wallet.autoTopUp

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
  const primaryCard = wallet.cards.find((c) => c.primary)
  const selectedCard = wallet.cards.find((c) => c.id === cardId)
  const parsedAmount = Number(amount)
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0

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
      await topUpApi(wallet.userId, parsedAmount, selectedCard ? `${selectedCard.brand} •••• ${selectedCard.last4}` : 'Wallet')
      setAddedAmount(parsedAmount)
      query.refetch()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function toggleAutoTopUp(enabled) {
    if (!wallet.userId) return
    setActionError(null)
    try {
      await updateAutoTopUp(wallet.userId, { enabled })
      query.refetch()
    } catch (err) {
      setActionError(err)
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
        description="Your prepaid balance, payment methods and recent activity."
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
                {autoTopUp
                  ? `Auto top-up on — ${formatCurrency(wallet.autoTopUpAmount)} is added whenever the balance falls below ${formatCurrency(wallet.autoTopUpThreshold)}.`
                  : 'Auto top-up is off — add funds before your balance runs out.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => toggleDialog(true)}>
                <Plus /> Add funds
              </Button>
              <Button variant="ghost">Withdraw</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">This month</CardTitle>
            <CardDescription>July 2026</CardDescription>
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
            <CardTitle className="text-base">Payment methods</CardTitle>
            <CardDescription>Used to top up your wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {wallet.cards.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {c.brand} •••• {c.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">Expires {c.expiry}</p>
                </div>
                {c.primary && <Badge variant="secondary">Primary</Badge>}
              </div>
            ))}
            <button
              type="button"
              onClick={() => toggleDialog(true)}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <Plus className="h-4 w-4" /> Add card
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Auto top-up</CardTitle>
              <CardDescription>Keeps your wallet funded between sessions.</CardDescription>
            </div>
            <Switch checked={autoTopUp} onCheckedChange={toggleAutoTopUp} aria-label="Auto top-up" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Row label="Threshold" value={formatCurrency(wallet.autoTopUpThreshold)} />
            <Row label="Top-up amount" value={formatCurrency(wallet.autoTopUpAmount)} />
            <Row
              label="Charged to"
              value={primaryCard ? `${primaryCard.brand} •••• ${primaryCard.last4}` : '—'}
            />
            <Separator />
            <p className="text-xs text-muted-foreground">
              When a session takes the balance below the threshold, a top-up runs automatically so
              your next charge is never declined.
            </p>
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
                  <Label htmlFor="topup-amount">Custom amount (USD)</Label>
                  <Input
                    id="topup-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment method</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a card" />
                    </SelectTrigger>
                    <SelectContent>
                      {wallet.cards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.brand} •••• {c.last4}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                  {formatCurrency(addedAmount)} added from {selectedCard?.brand} ••••{' '}
                  {selectedCard?.last4}.
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
