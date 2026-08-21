import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Notifications.
 *
 * Most rows are broadcasts: `user_id` is null and `roles` decides who the RLS
 * policy shows them to. Nobody owns a broadcast, so "I have read this" cannot
 * be a column on it — it is a row in `notification_reads`. A notification counts
 * as read when it arrived pre-read (`seed_read`) or the caller has a receipt.
 */

export function mapNotification(row, readIds) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    time: row.created_at,
    roles: row.roles ?? [],
    read: row.seed_read || readIds.has(row.id),
  }
}

export async function fetchNotifications() {
  const [rows, receipts] = await Promise.all([
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).then(unwrap),
    supabase.from('notification_reads').select('notification_id').then(unwrap),
  ])
  const readIds = new Set(receipts.map((r) => r.notification_id))
  return rows.map((row) => mapNotification(row, readIds))
}

export async function markRead(notificationId, userId) {
  const { error } = await supabase
    .from('notification_reads')
    .insert({ notification_id: notificationId, user_id: userId })
  // A second receipt for the same row is not a failure — it is already read.
  if (error && error.code !== '23505') throw error
}

export async function markAllRead(notifications, userId) {
  const unread = notifications.filter((n) => !n.read)
  if (!unread.length) return
  const { error } = await supabase
    .from('notification_reads')
    .upsert(
      unread.map((n) => ({ notification_id: n.id, user_id: userId })),
      { onConflict: 'notification_id,user_id', ignoreDuplicates: true }
    )
  if (error) throw error
}
