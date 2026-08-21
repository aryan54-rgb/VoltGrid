import * as React from 'react'
import {
  ArrowDownLeft,
  BadgePercent,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  RotateCcw,
  ShoppingBag,
  Clock,
  Wallet as WalletIcon,
  Zap,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { SearchInput } from '@/components/shared/search-input'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'
import { ErrorState, LoadingCards, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { fetchTransactions } from '@/lib/api/wallet'

const PAGE_SIZE = 8

const TYPE_ICONS = {
  charge: Zap,
  topup: ArrowDownLeft,
  refund: RotateCcw,
  purchase: ShoppingBag,
  subscription: BadgePercent,
}

const TYPE_LABELS = {
  charge: 'Charging',
  topup: 'Top-up',
  refund: 'Refund',
  purchase: 'Purchase',
  subscription: 'Subscription',
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'charge', label: 'Charging' },
  { value: 'topup', label: 'Top-up' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'refund', label: 'Refund' },
  { value: 'subscription', label: 'Subscription' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
]

function TypeIcon({ type, className }) {
  const Icon = TYPE_ICONS[type] ?? Zap
  return <Icon className={cn('h-4 w-4 shrink-0 text-muted-foreground', className)} />
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  )
}

export default function Transactions() {
  const [query, setQuery] = React.useState('')
  const [type, setType] = React.useState('all')
  const [status, setStatus] = React.useState('all')
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState(null)
  const [exported, setExported] = React.useState(false)

  React.useEffect(() => {
    if (!exported) return undefined
    const timer = setTimeout(() => setExported(false), 2000)
    return () => clearTimeout(timer)
  }, [exported])

  const ledger = useQuery(() => fetchTransactions({ limit: 500 }), [])
  const transactions = React.useMemo(() => ledger.data ?? [], [ledger.data])

  // Summarised over the month of the newest movement, not the wall clock.
  const summary = React.useMemo(() => {
    const month = transactions[0]?.date?.slice(0, 7)
    const rows = month ? transactions.filter((t) => t.date.startsWith(month)) : []
    return {
      spent: rows.filter((t) => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0),
      toppedUp: rows.filter((t) => t.type === 'topup').reduce((sum, t) => sum + t.amount, 0),
      refunded: rows.filter((t) => t.type === 'refund').reduce((sum, t) => sum + t.amount, 0),
      pending: rows.filter((t) => t.status === 'pending').length,
    }
  }, [transactions])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions.filter((t) => {
      const matchesType = type === 'all' || t.type === type
      const matchesStatus = status === 'all' || t.status === status
      const matchesQuery =
        !q ||
        t.description.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.method.toLowerCase().includes(q)
      return matchesType && matchesStatus && matchesQuery
    })
  }, [transactions, query, type, status])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const rows = filtered.slice(start, start + PAGE_SIZE)

  if (ledger.loading && !ledger.data) {
    return (
      <div className="space-y-6">
        <LoadingCards />
        <LoadingRows rows={8} />
      </div>
    )
  }
  if (ledger.error) {
    return (
      <ErrorState error={ledger.error} onRetry={ledger.refetch} title="Could not load your transactions" />
    )
  }

  function resetPage(setter) {
    return (value) => {
      setter(value)
      setPage(1)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        description="Every wallet movement on your account — session charges, top-ups, refunds and purchases."
        actions={
          <Button variant="outline" onClick={() => setExported(true)}>
            {exported ? <Check /> : <Download />}
            {exported ? 'Exported' : 'Export CSV'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          label="Spent this month"
          value={formatCurrency(summary.spent)}
          icon={Zap}
          delta={6.2}
          deltaGoodWhen="down"
        />
        <StatCard
          index={1}
          label="Topped up"
          value={formatCurrency(summary.toppedUp)}
          icon={WalletIcon}
        />
        <StatCard
          index={2}
          label="Refunded"
          value={formatCurrency(summary.refunded)}
          icon={RotateCcw}
        />
        <StatCard index={3} label="Pending" value={summary.pending} icon={Clock} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          placeholder="Search by description, ID or method…"
          className="w-full sm:w-72"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(1)
          }}
        />
        <Select value={type} onValueChange={resetPage(setType)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={resetPage(setStatus)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <EmptyState
              className="border-0"
              icon={WalletIcon}
              title="No transactions found"
              description="Try a different search term, or clear the type and status filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setSelected(t)}>
                    <TableCell className="font-mono text-xs">{t.id}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 font-medium">
                        <TypeIcon type={t.type} />
                        {t.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t.method}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(t.date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium tabular-nums',
                        t.amount > 0 && 'text-[var(--delta-good)]'
                      )}
                    >
                      {t.amount > 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(t.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm tabular-nums text-muted-foreground">
          {filtered.length === 0
            ? '0 of 0'
            : `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft /> Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Next <ChevronRight />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Session charges settle against your wallet the moment a charge ends, so the balance you see
        is always the balance you can spend.
      </p>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TypeIcon type={selected.type} className="text-foreground" />
                  {selected.id}
                </DialogTitle>
                <DialogDescription>{selected.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <DetailRow label="Type">
                  <Badge variant="secondary">{TYPE_LABELS[selected.type] ?? selected.type}</Badge>
                </DetailRow>
                <DetailRow label="Method">{selected.method}</DetailRow>
                <DetailRow label="Date">{formatDateTime(selected.date)}</DetailRow>
                <DetailRow label="Status">
                  <StatusBadge status={selected.status} />
                </DetailRow>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      selected.amount > 0 && 'text-[var(--delta-good)]'
                    )}
                  >
                    {selected.amount > 0 ? '+' : '−'}
                    {formatCurrency(Math.abs(selected.amount))}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
