import * as React from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Auth state for the whole app.
 *
 * Supabase owns the session (`auth.users`); the public `profiles` table owns
 * everything the UI needs on top of it — most importantly `role`, which drives
 * route access. The two are fetched separately: the session resolves
 * synchronously from local storage, the profile is a network round-trip.
 */
const AuthContext = React.createContext(null)

const PUBLIC_SIGNUP_ROLES = ['driver', 'fleet', 'operator']

export function AuthProvider({ children }) {
  const [session, setSession] = React.useState(null)
  const [profile, setProfile] = React.useState(null)
  const [sessionReady, setSessionReady] = React.useState(false)
  const [profileReady, setProfileReady] = React.useState(false)
  const [error, setError] = React.useState(null)

  // 1. Resolve the stored session, then follow every auth state change.
  React.useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active) return
      if (sessionError) setError(sessionError.message)
      setSession(data?.session ?? null)
      setSessionReady(true)
    })

    // Note: no awaited Supabase calls inside this callback — it runs while the
    // auth client holds its lock, and awaiting here can deadlock. The profile
    // fetch is driven off the effect below instead.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setSessionReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const userId = session?.user?.id ?? null

  const loadProfile = React.useCallback(async (id) => {
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (profileError) throw profileError
    return data
  }, [])

  // 2. Keep the profile in sync with whoever is signed in. Keyed on the user id
  //    so a token refresh (new session object, same user) does not refetch.
  React.useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileReady(true)
      return
    }

    let active = true
    setProfileReady(false)
    loadProfile(userId)
      .then((data) => {
        if (!active) return
        setProfile(data)
        setError(data ? null : 'No profile found for this account.')
      })
      .catch((err) => {
        if (!active) return
        setProfile(null)
        setError(err.message)
      })
      .finally(() => {
        if (active) setProfileReady(true)
      })

    return () => {
      active = false
    }
  }, [userId, loadProfile])

  const refreshProfile = React.useCallback(async () => {
    if (!userId) return null
    const data = await loadProfile(userId)
    setProfile(data)
    return data
  }, [userId, loadProfile])

  const signIn = React.useCallback(async ({ email, password }) => {
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) return { error: signInError }
    return { data }
  }, [])

  const signUp = React.useCallback(async ({ email, password, name, role }) => {
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Read back by the `handle_new_user` trigger to seed the profile row.
        data: { full_name: name, role: PUBLIC_SIGNUP_ROLES.includes(role) ? role : 'driver' },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (signUpError) return { error: signUpError }
    // With email confirmation enabled Supabase returns a user but no session.
    return { data, needsEmailConfirmation: !data.session }
  }, [])

  const signInWithProvider = React.useCallback(async (provider) => {
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) return { error: oauthError }
    return {}
  }, [])

  const signOut = React.useCallback(async () => {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) return { error: signOutError }
    setProfile(null)
    return {}
  }, [])

  const requestPasswordReset = React.useCallback(async (email) => {
    setError(null)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) return { error: resetError }
    return {}
  }, [])

  const updatePassword = React.useCallback(async (password) => {
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) return { error: updateError }
    return {}
  }, [])

  const updateProfile = React.useCallback(
    async (patch) => {
      if (!userId) return { error: new Error('Not signed in') }
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select()
        .single()
      if (updateError) return { error: updateError }
      setProfile(data)
      return { data }
    },
    [userId]
  )

  /**
   * The only path by which a user may write their own `role`.
   *
   * `role` is not in the column grant on `profiles` (Phase 1 removed it so a
   * driver could not promote themselves), so this goes through a SECURITY
   * DEFINER function that refuses unless the row is still un-onboarded. It
   * therefore works exactly once per account.
   */
  const completeOnboarding = React.useCallback(
    async ({ role, name }) => {
      if (!userId) return { error: new Error('Not signed in') }
      const { data, error: rpcError } = await supabase.rpc('complete_onboarding', {
        new_role: role,
        display_name: name?.trim() || null,
      })
      if (rpcError) return { error: rpcError }
      // The function returns the updated row, so no refetch is needed.
      if (data) setProfile(data)
      return { data }
    },
    [userId]
  )

  /** Accepts an invitation after its one-time magic link establishes a session. */
  const acceptAdminInvitation = React.useCallback(async () => {
    if (!userId) return { error: new Error('Not signed in') }
    const { data, error: inviteError } = await supabase.rpc('accept_admin_invitation')
    if (inviteError) return { error: inviteError }
    if (data) setProfile(data)
    return { data }
  }, [userId])

  const value = React.useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      // Authorisation reads the profile, never user_metadata — metadata is
      // writable by the user themselves and so cannot be trusted.
      role: profile?.role ?? null,
      // A profile whose role was defaulted rather than chosen — an OAuth
      // signup that never saw the registration form. The route guards divert
      // these to /welcome instead of a portal.
      //
      // Tested against `=== false`, not `!profile.onboarded`: if this build is
      // running before the onboarding migration, the column is absent and the
      // value is `undefined`. Only an explicit false diverts anyone, so a
      // missing column leaves every existing user in their portal rather than
      // stranding all of them on a screen whose RPC does not exist yet.
      needsOnboarding: Boolean(session) && profile?.onboarded === false,
      isAuthenticated: Boolean(session),
      loading: !sessionReady || !profileReady,
      error,
      signIn,
      signUp,
      signInWithProvider,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      completeOnboarding,
      acceptAdminInvitation,
      refreshProfile,
    }),
    [
      session,
      profile,
      sessionReady,
      profileReady,
      error,
      signIn,
      signUp,
      signInWithProvider,
      signOut,
      requestPasswordReset,
      updatePassword,
      updateProfile,
      completeOnboarding,
      acceptAdminInvitation,
      refreshProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside an <AuthProvider>')
  return ctx
}
