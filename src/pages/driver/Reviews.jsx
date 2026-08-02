import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Plus, ThumbsUp, MessageSquare, BadgeCheck, Check } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { reviews as seedReviews, ratingBreakdown } from '@/data/reviews'
import { stations } from '@/data/stations'
import { currentUsers } from '@/data/users'
import { cn, formatDate, initials } from '@/lib/utils'

const ME = currentUsers.driver.name

function stationName(stationId) {
  return stations.find((s) => s.id === stationId)?.name ?? 'Unknown station'
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/** Read-only star row. */
function Stars({ value, className }) {
  return (
    <span className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            'h-3.5 w-3.5',
            n <= value ? 'fill-status-warning text-status-warning' : 'text-muted-foreground/40'
          )}
        />
      ))}
    </span>
  )
}

/** Clickable 1–5 picker with hover preview. */
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              n <= shown
                ? 'fill-status-warning text-status-warning'
                : 'text-muted-foreground/40'
            )}
          />
        </button>
      ))}
      <span className="ml-2 text-sm text-muted-foreground">
        {shown ? `${shown} of 5` : 'Select a rating'}
      </span>
    </div>
  )
}

const SORTS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'helpful', label: 'Most helpful' },
]

export default function Reviews() {
  const [items, setItems] = useState(seedReviews)
  const [tab, setTab] = useState('all')
  const [stationFilter, setStationFilter] = useState('all')
  const [ratingFilter, setRatingFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [helpfulVotes, setHelpfulVotes] = useState({})

  const [open, setOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [draft, setDraft] = useState({ stationId: '', rating: 0, title: '', body: '' })

  const average = useMemo(() => {
    if (items.length === 0) return 0
    return items.reduce((sum, r) => sum + r.rating, 0) / items.length
  }, [items])

  const breakdown = useMemo(() => ratingBreakdown(items), [items])

  const visible = useMemo(() => {
    let list = tab === 'mine' ? items.filter((r) => r.author === ME) : items
    if (stationFilter !== 'all') list = list.filter((r) => r.stationId === stationFilter)
    if (ratingFilter !== 'all') list = list.filter((r) => r.rating === Number(ratingFilter))

    const sorted = [...list]
    if (sort === 'highest') sorted.sort((a, b) => b.rating - a.rating || b.date.localeCompare(a.date))
    else if (sort === 'helpful')
      sorted.sort((a, b) => helpfulCount(b) - helpfulCount(a))
    else sorted.sort((a, b) => b.date.localeCompare(a.date))
    return sorted

    function helpfulCount(r) {
      return r.helpful + (helpfulVotes[r.id] ? 1 : 0)
    }
  }, [items, tab, stationFilter, ratingFilter, sort, helpfulVotes])

  function toggleHelpful(id) {
    setHelpfulVotes((v) => ({ ...v, [id]: !v[id] }))
  }

  function openDialog() {
    setDraft({ stationId: '', rating: 0, title: '', body: '' })
    setSubmitted(false)
    setOpen(true)
  }

  function submitReview() {
    const review = {
      id: `RV-${Math.floor(Math.random() * 200) + 720}`,
      stationId: draft.stationId,
      author: ME,
      rating: draft.rating,
      date: todayIso(),
      title: draft.title.trim() || 'Review',
      body: draft.body.trim(),
      helpful: 0,
      verifiedSession: true,
    }
    setItems((list) => [review, ...list])
    setSubmitted(true)
    setTimeout(() => setOpen(false), 1400)
  }

  const canSubmit = draft.stationId && draft.rating > 0 && draft.body.trim().length > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reviews & ratings"
        description="Rate the stations you have charged at and read what other drivers found."
        actions={
          <Button onClick={openDialog}>
            <Plus /> Write a review
          </Button>
        }
      />

      {/* Summary */}
      <Card>
        <CardContent className="grid gap-6 pt-6 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted/50 p-6 text-center">
            <p className="text-4xl font-semibold tabular-nums">{average.toFixed(1)}</p>
            <Stars value={Math.round(average)} className="mt-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              {items.length} review{items.length === 1 ? '' : 's'} across the network
            </p>
          </div>
          <div className="space-y-2">
            {breakdown.map((row) => {
              const pct = items.length ? (row.count / items.length) * 100 : 0
              return (
                <div key={row.stars} className="flex items-center gap-3">
                  <span className="flex w-10 shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    {row.stars} <Star className="h-3 w-3 fill-current" />
                  </span>
                  <Progress value={pct} className="h-2 flex-1" />
                  <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {row.count}
                  </span>
                </div>
              )
            })}
            <p className="pt-2 text-xs text-muted-foreground">
              Rate and review the stations you use. Every review is tied to a charging session you
              actually completed, so ratings stay trustworthy.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs + filters */}
      <div className="flex flex-col gap-3">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All reviews</TabsTrigger>
            <TabsTrigger value="mine">My reviews</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Select value={stationFilter} onValueChange={setStationFilter}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="All stations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stations</SelectItem>
              {stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ratingFilter} onValueChange={setRatingFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All ratings" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ratings</SelectItem>
              {[5, 4, 3, 2, 1].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} stars
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={MessageSquare}
              title="No reviews match these filters"
              description="Try a different station or rating, or write the first review for this station."
              action={
                <Button onClick={openDialog}>
                  <Plus /> Write a review
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((r, i) => {
            const voted = !!helpfulVotes[r.id]
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i, 8) * 0.03 }}
              >
                <Card>
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex flex-wrap items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(r.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{r.author}</span>
                          <Stars value={r.rating} />
                          {r.verifiedSession && (
                            <Badge variant="secondary">
                              <BadgeCheck /> Verified session
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {stationName(r.stationId)} · {formatDate(r.date)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                    </div>

                    <Button
                      variant={voted ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => toggleHelpful(r.id)}
                    >
                      <ThumbsUp /> Helpful ({r.helpful + (voted ? 1 : 0)})
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Write a review */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-status-good/15">
                <Check className="h-6 w-6 text-status-good" />
              </div>
              <DialogHeader className="items-center">
                <DialogTitle>Review published</DialogTitle>
                <DialogDescription>
                  Thanks — your rating is now part of this station&apos;s score.
                </DialogDescription>
              </DialogHeader>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Write a review</DialogTitle>
                <DialogDescription>
                  Rate a station you have charged at. Reviews are public to other drivers.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Station</Label>
                  <Select
                    value={draft.stationId}
                    onValueChange={(v) => setDraft((d) => ({ ...d, stationId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a station" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Your rating</Label>
                  <StarPicker
                    value={draft.rating}
                    onChange={(n) => setDraft((d) => ({ ...d, rating: n }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-title">Title</Label>
                  <Input
                    id="review-title"
                    placeholder="Sum it up in a few words"
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review-body">Your review</Label>
                  <Textarea
                    id="review-body"
                    rows={4}
                    placeholder="Speed, reliability, access, amenities…"
                    value={draft.body}
                    onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Marked as a verified session because this account has a completed session at the
                  selected station.
                </p>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={submitReview} disabled={!canSubmit}>
                  Submit review
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
