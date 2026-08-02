import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wallet, CheckCircle2, Receipt, CalendarClock, CreditCard, Download, Check, Building2 } from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
} from 'recharts'
import { PageHeader } from '@/components/shared/page-header'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { CHART_COLORS, GRID, axisProps, ChartTooltip, ChartCard } from '@/components/shared/chart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { invoices } from '@/data/fleet'
import { currentUsers } from '@/data/users'
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils'

export default function Billing() {
  const [rows, setRows] = useState(invoices)
  const [payInvoice, setPayInvoice] = useState(null)
  const [payDone, setPayDone] = useState(false)
  const [downloaded, setDownloaded] = useState({})

  const manager = currentUsers.fleet

  const outstanding = rows
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .reduce((s, i) => s + i.amount, 0)
  const paidYtd = rows.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const avgInvoice = rows.reduce((s, i) => s + i.amount, 0) / (rows.length || 1)
  const nextDue = rows
    .filter((i) => i.status === 'pending' || i.status === 'overdue')
    .map((i) => i.due)
    .sort()[0]

  const spendTrend = useMemo(
    () => [...rows].reverse().map((i) => ({ period: i.period.split(' ')[0].slice(0, 3), amount: i.amount })),
    [rows]
  )

  function markDownloaded(id) {
    setDownloaded((d) => ({ ...d, [id]: true }))
    setTimeout(() => setDownloaded((d) => ({ ...d, [id]: false })), 1500)
  }

  function confirmPayment() {
    setPayDone(true)
    setTimeout(() => {
      setRows((prev) => prev.map((i) => (i.id === payInvoice.id ? { ...i, status: 'paid' } : i)))
      setPayInvoice(null)
      setPayDone(false)
    }, 1300)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description={`Monthly consolidated invoices for the ${manager.company} fleet account`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} delta={12.6} deltaGoodWhen="down" icon={Wallet} index={0} />
        <StatCard label="Paid year-to-date" value={formatCurrency(paidYtd)} icon={CheckCircle2} index={1} />
        <StatCard label="Average invoice" value={formatCurrency(avgInvoice)} delta={2.3} deltaGoodWhen="down" icon={Receipt} index={2} />
        <StatCard label="Next due date" value={nextDue ? formatDate(nextDue) : '—'} icon={CalendarClock} index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment method</CardTitle>
            <CardDescription>Charged automatically on the invoice due date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-14 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Visa •••• 4821</p>
                  <p className="text-xs text-muted-foreground">Expires 08 / 2028</p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Update
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing contact</CardTitle>
            <CardDescription>Where invoices and payment receipts are sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{manager.company}</p>
                <p className="text-xs text-muted-foreground">
                  {manager.name} · {manager.role}
                </p>
                <p className="text-xs text-muted-foreground">{manager.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoices</CardTitle>
          <CardDescription>Consolidated monthly charging invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Energy kWh</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.id}</TableCell>
                  <TableCell className="text-muted-foreground">{inv.period}</TableCell>
                  <TableCell className="tabular-nums">{inv.sessions}</TableCell>
                  <TableCell className="tabular-nums">{formatNumber(inv.energy)}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(inv.due)}</TableCell>
                  <TableCell>
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => markDownloaded(inv.id)}>
                        {downloaded[inv.id] ? <Check className="text-status-good" /> : <Download />}
                        {downloaded[inv.id] ? 'Downloaded' : 'Download'}
                      </Button>
                      {inv.status !== 'paid' && (
                        <Button size="sm" onClick={() => setPayInvoice(inv)}>
                          Pay now
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ChartCard title="Spend trend" description="Invoice totals by billing period" height={220}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spendTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="period" {...axisProps} />
            <YAxis {...axisProps} width={48} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <RTooltip
              content={<ChartTooltip formatter={(v) => formatCurrency(v)} />}
              cursor={{ fill: 'var(--chart-grid)', opacity: 0.4 }}
            />
            <Bar dataKey="amount" name="Amount" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Pay now */}
      <Dialog open={!!payInvoice} onOpenChange={(open) => !open && !payDone && setPayInvoice(null)}>
        <DialogContent className="sm:max-w-md">
          {payInvoice && (
            <AnimatePresence mode="wait">
              {payDone ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-10"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-status-good/15 text-status-good"
                  >
                    <CheckCircle2 className="h-7 w-7" />
                  </motion.div>
                  <p className="text-sm font-medium">Payment confirmed</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(payInvoice.amount)} charged to Visa •••• 4821
                  </p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <DialogHeader>
                    <DialogTitle>Pay invoice {payInvoice.id}</DialogTitle>
                    <DialogDescription>Review the invoice before confirming payment.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-2.5 py-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Billing period</span>
                      <span className="font-medium">{payInvoice.period}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Charging sessions</span>
                      <span className="font-medium tabular-nums">{payInvoice.sessions}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Energy delivered</span>
                      <span className="font-medium tabular-nums">{formatNumber(payInvoice.energy)} kWh</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Due date</span>
                      <span className="font-medium">{formatDate(payInvoice.due)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Payment method</span>
                      <span className="font-medium">Visa •••• 4821</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-base">
                      <span className="font-medium">Total due</span>
                      <span className="font-semibold tabular-nums">{formatCurrency(payInvoice.amount)}</span>
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={confirmPayment}>Confirm payment</Button>
                  </DialogFooter>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
