import { useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthSplash, homeForRole } from '@/components/auth/route-guards'
import { useAuth } from '@/context/auth'

/**
 * Landing page for social logins and email-confirmation links. The Supabase
 * client picks the session out of the URL on load (detectSessionInUrl), so all
 * this screen does is wait for that to land and then hand off — to /welcome on
 * a first social login, which has a role to pick, and to the portal otherwise.
 */
export default function AuthCallback() {
  const { isAuthenticated, role, needsOnboarding, loading } = useAuth()
  const [params] = useSearchParams()
  const [timedOut, setTimedOut] = useState(false)

  // Supabase reports provider failures back on the query string.
  const urlError = params.get('error_description') || params.get('error')

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000)
    return () => clearTimeout(timer)
  }, [])

  if (!urlError && isAuthenticated && needsOnboarding) {
    return <Navigate to="/welcome" replace />
  }

  if (!urlError && isAuthenticated && role) {
    return <Navigate to={homeForRole(role)} replace />
  }

  if (urlError || (timedOut && !loading && !isAuthenticated)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Sign-in didn&rsquo;t complete</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {urlError || 'We couldn’t establish a session from that link. It may have expired.'}
        </p>
        <Button asChild className="mt-8">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return <AuthSplash />
}
