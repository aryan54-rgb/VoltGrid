import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

function mapInvitation(row) {
  return {
    id: row.id,
    email: row.email,
    status: row.status,
    createdAt: row.created_at,
    acceptedAt: row.accepted_at,
  }
}

/** Admin-only; RLS also enforces this in the database. */
export async function fetchAdminInvitations() {
  const rows = await supabase
    .from('admin_invitations')
    .select('*')
    .order('created_at', { ascending: false })
    .then(unwrap)
  return rows.map(mapInvitation)
}

/**
 * Creates the pre-approval first, then lets Supabase deliver a one-time magic
 * link. The profile trigger, not browser metadata, grants the admin role.
 */
export async function inviteAdmin(email) {
  const normalizedEmail = email.trim().toLowerCase()
  const invitation = await supabase
    .rpc('create_admin_invitation', { invitee_email: normalizedEmail })
    .then(unwrap)

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${window.location.origin}/auth/callback?admin_invite=1`,
    },
  })
  if (error) throw error

  return mapInvitation(invitation)
}
