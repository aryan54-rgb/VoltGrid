import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, MessageSquareOff, Trophy, Hash } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { posts as seedPosts, leaderboard } from '@/data/community'
import { currentUsers } from '@/data/users'
import { cn, formatNumber, timeAgo, initials } from '@/lib/utils'

const ME = currentUsers.driver.name

/** Topics come from the feed itself, so a new topic shows up as soon as someone posts it. */
const TAGS = ['All', ...new Set(seedPosts.map((p) => p.tag))]
const TAG_OPTIONS = TAGS.filter((t) => t !== 'All')

export default function Community() {
  const [posts, setPosts] = useState(seedPosts)
  const [tag, setTag] = useState('All')
  const [draft, setDraft] = useState('')
  const [draftTag, setDraftTag] = useState(TAG_OPTIONS[0])

  const visible = useMemo(
    () => (tag === 'All' ? posts : posts.filter((p) => p.tag === tag)),
    [posts, tag]
  )

  function publish() {
    const text = draft.trim()
    if (!text) return
    const [title, ...rest] = text.split('\n')
    setPosts((prev) => [
      {
        id: `po-${Date.now()}`,
        author: ME,
        handle: '@jordanlee',
        avatarColor: 'bg-emerald-500',
        time: new Date().toISOString(),
        tag: draftTag,
        title: title.slice(0, 90),
        body: rest.join('\n').trim(),
        likes: 0,
        comments: 0,
        shares: 0,
        liked: false,
      },
      ...prev,
    ])
    setDraft('')
  }

  function toggleLike(id) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p
      )
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Community"
        description="Tips, station reports and road-trip notes from drivers on the network."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {/* Composer */}
          <Card>
            <CardContent className="flex gap-3 p-5">
              <Avatar className="mt-0.5">
                <AvatarFallback>{initials(ME)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Share a tip, a station report or a road-trip note…"
                />
                <div className="flex items-center justify-between gap-2">
                  <Select value={draftTag} onValueChange={setDraftTag}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {TAG_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={publish} disabled={!draft.trim()}>
                    Post
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tag filter */}
          <div className="flex flex-wrap gap-2">
            {TAGS.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tag === t ? 'default' : 'outline'}
                onClick={() => setTag(t)}
              >
                {t}
              </Button>
            ))}
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={MessageSquareOff}
              title="Nothing under this topic yet"
              description="No one has posted in this topic. Start the conversation, or browse everything."
              action={
                <Button variant="outline" onClick={() => setTag('All')}>
                  Show all posts
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {visible.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 6) * 0.04 }}
                >
                  <Card>
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start gap-3">
                        <Avatar>
                          <AvatarFallback className={cn(p.avatarColor, 'text-white')}>
                            {initials(p.author)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p.author}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.handle} · {timeAgo(p.time)}
                          </p>
                        </div>
                        <Badge variant="secondary">{p.tag}</Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="font-semibold">{p.title}</p>
                        {p.body && <p className="text-sm text-muted-foreground">{p.body}</p>}
                      </div>

                      <div className="flex items-center gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLike(p.id)}
                          className={cn(p.liked && 'text-status-critical')}
                        >
                          <motion.span
                            key={String(p.liked)}
                            initial={{ scale: 0.7 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 14 }}
                            className="flex items-center"
                          >
                            <Heart className={cn('h-4 w-4', p.liked && 'fill-current')} />
                          </motion.span>
                          {formatNumber(p.likes)}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageCircle />
                          {formatNumber(p.comments)}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Share2 />
                          {formatNumber(p.shares)}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-status-warning" />
                Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {leaderboard.map((row) => (
                <div
                  key={row.rank}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-2 py-2',
                    row.you && 'bg-primary/10'
                  )}
                >
                  <span className="w-5 text-sm font-medium text-muted-foreground">{row.rank}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{row.name}</span>
                      {row.you && <Badge variant="secondary">You</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground">{row.sessions} sessions</span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{formatNumber(row.points)}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Hash className="h-4 w-4 text-muted-foreground" />
                Popular tags
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/70"
                  role="button"
                  tabIndex={0}
                  onClick={() => setTag(t)}
                >
                  {t}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
