import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Zap } from 'lucide-react'
import AppShell from '@/layouts/AppShell'
import { useAuth } from '@/context/auth'
import { ROLE_META } from '@/lib/nav'

/** Full-screen hold while the session and profile resolve. */
export function AuthSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-10 w-10 animate-pulse items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Zap className="h-5 w-5" fill="currentColor" strokeWidth={0} />
        </span>
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </div>
    </div>
  )
}

export function homeForRole(role) {
  return ROLE_META[role]?.home ?? '/login'
}

/**
 * Guards a role's portal: signs the visitor in first, then checks that their
 * profile role matches. RLS is the real boundary — this only keeps the UI
 * honest and sends people somewhere sensible.
 */
export function RoleRoute({ role }) {
  const { isAuthenticated, role: userRole, needsOnboarding, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  // Signed in but the profile row is missing or still unassigned.
  if (!userRole) return <Navigate to="/login" replace state={{ profileMissing: true }} />

  // An OAuth signup carries a defaulted role, not a chosen one. No portal until
  // they have actually picked.
  if (needsOnboarding) {
    return <Navigate to="/welcome" replace state={{ from: location.pathname + location.search }} />
  }

  if (userRole !== role) return <Navigate to={homeForRole(userRole)} replace />

  return <AppShell role={role} />
}

/** Signed-in users have no business on /login, /register or /forgot-password. */
export function PublicOnlyRoute() {
  const { isAuthenticated, role, needsOnboarding, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />

  // Signed in but mid-onboarding: /login and /register are equally off-limits,
  // and the destination is the role picker rather than a portal.
  if (isAuthenticated && needsOnboarding) return <Navigate to="/welcome" replace />

  if (isAuthenticated && role) {
    const from = location.state?.from
    const target = from && from.startsWith(`/${role}`) ? from : homeForRole(role)
    return <Navigate to={target} replace />
  }

  return <Outlet />
}

/** Any signed-in user, regardless of role (used by the password reset screen). */
export function RequireAuth() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/**
 * Guards /welcome. Onboarding is a one-shot server-side operation, so an
 * account that has already been through it has nothing to do here — send it to
 * its portal rather than letting it call an RPC that would only refuse.
 */
export function OnboardingRoute() {
  const { isAuthenticated, role, needsOnboarding, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!needsOnboarding) {
    const from = location.state?.from
    const target = role && from && from.startsWith(`/${role}`) ? from : homeForRole(role)
    return <Navigate to={target} replace />
  }

  return <Outlet />
}
