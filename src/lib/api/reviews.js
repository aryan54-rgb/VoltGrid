import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Station reviews.
 *
 * Reads go through `reviews_with_stats`, a view that adds the live helpful
 * count (seed value plus rows in `review_votes`) and whether the caller has
 * already found the review helpful. Writes go to the base table.
 */

export function mapReview(row) {
  return {
    id: row.id,
    stationId: row.station_id,
    authorId: row.author_id,
    author: row.author_name,
    rating: row.rating,
    date: row.reviewed_on,
    title: row.title,
    body: row.body,
    helpful: row.helpful ?? row.seed_helpful ?? 0,
    voted: row.voted ?? false,
    verifiedSession: row.verified_session,
  }
}

export async function fetchReviews({ stationId } = {}) {
  let query = supabase.from('reviews_with_stats').select('*').order('reviewed_on', { ascending: false })
  if (stationId) query = query.eq('station_id', stationId)
  const rows = await query.then(unwrap)
  return rows.map(mapReview)
}

/** Star distribution for a set of reviews, highest rating first. */
export function ratingBreakdown(items = []) {
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: items.filter((r) => r.rating === stars).length,
  }))
}

export async function createReview({ userId, authorName, stationId, rating, title, body }) {
  const row = await supabase
    .from('reviews')
    .insert({
      id: `RV-${Date.now().toString(36).toUpperCase()}`,
      station_id: stationId,
      author_id: userId,
      author_name: authorName,
      rating,
      title,
      body,
      // Trustworthy ratings come from people who actually charged here, so the
      // badge is granted by the server-side history check below, not the form.
      verified_session: await hasChargedAt(userId, stationId),
    })
    .select('*')
    .single()
    .then(unwrap)
  return mapReview({ ...row, helpful: row.seed_helpful, voted: false })
}

async function hasChargedAt(userId, stationId) {
  const { count, error } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('station_id', stationId)
    .eq('status', 'completed')
  if (error) throw error
  return (count ?? 0) > 0
}

/** Mark a review helpful, or take the vote back. */
export async function toggleHelpful(reviewId, userId, voted) {
  if (voted) {
    const { error } = await supabase
      .from('review_votes')
      .delete()
      .eq('review_id', reviewId)
      .eq('user_id', userId)
    if (error) throw error
    return false
  }
  const { error } = await supabase.from('review_votes').insert({ review_id: reviewId, user_id: userId })
  if (error) throw error
  return true
}
