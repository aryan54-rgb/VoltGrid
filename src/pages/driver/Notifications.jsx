import { useMemo, useState } from 'react'
import {
  Zap,
  CalendarClock,
  Wallet,
  MessagesSquare,
  Megaphone,
  Bell,
  MoreHorizontal,
  Check,
  Trash2,
  CheckCheck,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { ErrorState, LoadingRows } from '@/components/shared/query-state'
import { useQuery } from '@/hooks/use-query'
import { useAuth } from '@/context/auth'
import { fetchNotifications, markAllRead as markAllReadApi, markRead as markReadApi } from '@/lib/api/notifications'
import { cn, timeAgo } from '@/lib/utils'

const TYPE_ICONS = {
  charging: Zap,
  booking: CalendarClock,
  wallet: Wallet,
  community: MessagesSquare,
  promo: Megaphone,
}

const TYPE_LABELS = {
  charging: 'Charging',
  booking: 'Bookings',
  wallet: 'Wallet',
  community: 'Community',
  promo: 'Offers',
}

const TYPE_EMPTY = {
  charging: 'No charging updates right now.',
  booking: 'No booking confirmations or reminders.',
  wallet: 'No balance or billing alerts.',
  community: 'No replies or mentions yet.',
  promo: 'No offers at the moment.',
}

/** Category tabs follow whatever types actually came back for this user. */
function tabsFor(items) {
  return [
    { value: 'all', label: 'All' },
    { value: 'unread', label: 'Unread' },
    ...[...new Set(items.map((n) => n.type))].map((t) => ({ value: t, label: TYPE_LABELS[t] ?? t })),
  ]
}

const PREFS = [
  { key: 'push', label: 'Push', desc: 'Alerts on this device while you are charging.' },
  { key: 'email', label: 'Email', desc: 'Receipts, confirmations and account notices by email.' },
  {
    key: 'chargingUpdates',
    label: 'Charging updates',
    desc: 'Progress milestones and session start or stop events.',
  },
  {
    key: 'promotions',
    label: 'Promotions',
    desc: 'Bonus points weekends and partner offers.',
  },
]

export default function Notifications() {
  const { user } = useAuth()
  const { data, loading, error, refetch, setData } = useQuery(fetchNotifications, [])
  const [tab, setTab] = useState('all')
  const [dismissed, setDismissed] = useState(() => new Set())
  const [prefs, setPrefs] = useState({
    push: true,
    email: true,
    chargingUpdates: true,
    promotions: false,
  })

  const items = useMemo(
    () => (data ?? []).filter((n) => !dismissed.has(n.id)),
    [data, dismissed]
  )
  const tabs = useMemo(() => tabsFor(items), [items])

  const visible = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.time.localeCompare(a.time))
    if (tab === 'all') return sorted
    if (tab === 'unread') return sorted.filter((n) => !n.read)
    return sorted.filter((n) => n.type === tab)
  }, [items, tab])

  const unreadCount = items.filter((n) => !n.read).length

  // Read state is written optimistically: the receipt table is the source of
  // truth, but there is nothing useful to show the user if the insert is slow.
  async function markAllRead() {
    if (!user) return
    const unread = items.filter((n) => !n.read)
    setData((list) => (list ?? []).map((n) => ({ ...n, read: true })))
    try {
      await markAllReadApi(unread, user.id)
    } catch {
      refetch()
    }
  }

  async function markRead(id) {
    if (!user) return
    setData((list) => (list ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await markReadApi(id, user.id)
    } catch {
      refetch()
    }
  }

  // Most rows are broadcasts nobody owns, so there is no row to delete. Hiding
  // it locally and recording the read receipt is the honest equivalent.
  function remove(id) {
    setDismissed((prev) => new Set(prev).add(id))
    markRead(id)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread — charging, bookings, wallet and community updates.`
            : 'You are all caught up.'
        }
        actions={
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            <CheckCheck /> Mark all read
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-2">
          {loading ? (
            <LoadingRows rows={5} className="p-3" />
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} title="Could not load notifications" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nothing here"
              description={
                tab === 'all'
                  ? 'You have no notifications right now.'
                  : tab === 'unread'
                    ? 'Everything has been read.'
                    : (TYPE_EMPTY[tab] ?? 'No notifications in this category.')
              }
            />
          ) : (
            <div className="divide-y">
              {visible.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Bell
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-3 rounded-lg p-3 transition-colors',
                      !n.read && 'bg-primary/5'
                    )}
                  >
                    <div className="relative mt-0.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {!n.read && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cn('text-sm', !n.read ? 'font-semibold' : 'font-medium')}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {timeAgo(n.time)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="shrink-0">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => markRead(n.id)} disabled={n.read}>
                          <Check className="mr-2 h-4 w-4" /> Mark read
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => remove(n.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notification preferences</CardTitle>
          <CardDescription>Choose what VoltGrid sends you and where it arrives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PREFS.map((row, i) => (
            <div key={row.key}>
              {i > 0 && <Separator className="mb-4" />}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <Switch
                  checked={prefs[row.key]}
                  onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
                  aria-label={row.label}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-muted-foreground">
            In-app notifications are always on.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
