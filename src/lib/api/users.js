import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Platform users, for the admin console.
 *
 * The full list is readable only by admins — the "Admins can view all profiles"
 * policy added in 20260821130000. Everyone else sees their own row and nothing
 * more, so this module is safe to import from a shared page.
 */

export function mapProfile(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    sessions: row.sessions ?? 0,
    joined: row.joined,
    spend: Number(row.spend ?? 0),
    company: row.company,
    vehicle: row.vehicle,
    plan: row.plan,
    points: row.points ?? 0,
    handle: row.handle,
    avatarColor: row.avatar_color,
  }
}

export async function fetchUsers() {
  const rows = await supabase.from('profiles').select('*').order('joined', { ascending: false }).then(unwrap)
  return rows.map(mapProfile)
}

/**
 * Admin actions.
 *
 * These go through SECURITY DEFINER functions rather than a direct UPDATE. A
 * column grant wide enough for an admin to write `status` or `role` would also
 * let every user write those columns on their own row, because the "Users can
 * update own profile" policy already passes for them. The functions check the
 * caller's role in the database instead.
 */
export async function setUserStatus(userId, status) {
  const { data, error } = await supabase.rpc('admin_set_user_status', {
    target: userId,
    new_status: status,
  })
  if (error) throw error
  return mapProfile(data)
}

export async function setUserRole(userId, role) {
  const { data, error } = await supabase.rpc('admin_set_user_role', {
    target: userId,
    new_role: role,
  })
  if (error) throw error
  return mapProfile(data)
}

/**
 * Remove an account's profile and everything that cascades from it.
 *
 * The `auth.users` row is left behind — deleting a login needs the service-role
 * key, which is not available in the browser.
 */
export async function deleteUser(userId) {
  const { error } = await supabase.rpc('admin_delete_profile', { target: userId })
  if (error) throw error
}

/**
 * Edit the fields a user owns on their own profile.
 *
 * `role` and `status` are deliberately absent: column-level grants block them
 * (20260821130000 §2), so a driver cannot promote themselves by posting a
 * different body. Changing those is a dashboard or admin-RPC job.
 */
export async function updateProfile(userId, { name, company, vehicle, plan }) {
  const row = await supabase
    .from('profiles')
    .update({
      ...(name === undefined ? {} : { name }),
      ...(company === undefined ? {} : { company }),
      ...(vehicle === undefined ? {} : { vehicle }),
      ...(plan === undefined ? {} : { plan }),
    })
    .eq('id', userId)
    .select('*')
    .single()
    .then(unwrap)
  return mapProfile(row)
}
