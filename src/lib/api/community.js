import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Community feed and the rewards leaderboard.
 *
 * Like counts come from `posts_with_stats`, which sums the seeded figure with
 * rows in `post_likes` and reports whether the caller is one of them — so a
 * like survives a reload instead of living in component state.
 */

export function mapPost(row) {
  return {
    id: row.id,
    authorId: row.author_id,
    author: row.author_name,
    handle: row.handle,
    avatarColor: row.avatar_color,
    time: row.created_at,
    tag: row.tag,
    title: row.title,
    body: row.body,
    likes: row.likes ?? row.seed_likes ?? 0,
    comments: row.comments ?? 0,
    shares: row.shares ?? 0,
    liked: row.liked ?? false,
  }
}

export async function fetchPosts() {
  const rows = await supabase
    .from('posts_with_stats')
    .select('*')
    .order('created_at', { ascending: false })
    .then(unwrap)
  return rows.map(mapPost)
}

export async function createPost({ userId, authorName, handle, avatarColor, tag, title, body }) {
  const row = await supabase
    .from('posts')
    .insert({
      id: `po-${Date.now().toString(36)}`,
      author_id: userId,
      author_name: authorName,
      handle: handle ?? `@${authorName.toLowerCase().replace(/\s+/g, '')}`,
      avatar_color: avatarColor ?? 'bg-emerald-500',
      tag,
      title,
      body,
    })
    .select('*')
    .single()
    .then(unwrap)
  return mapPost({ ...row, likes: 0, liked: false })
}

export async function toggleLike(postId, userId, liked) {
  if (liked) {
    const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    if (error) throw error
    return false
  }
  const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
  if (error) throw error
  return true
}

/**
 * Top drivers by reward points.
 *
 * @param {string|null} currentUserId  flags the caller's own row so the table
 *   can highlight it — the old mock hard-coded a `you: true` entry.
 */
export async function fetchLeaderboard({ limit = 5, currentUserId = null } = {}) {
  const rows = await supabase
    .from('leaderboard')
    .select('*')
    .order('rank')
    .limit(limit)
    .then(unwrap)
  return rows.map((r) => ({
    rank: r.rank,
    name: r.id === currentUserId ? 'You' : r.name,
    points: r.points ?? 0,
    sessions: r.sessions ?? 0,
    you: r.id === currentUserId,
  }))
}
