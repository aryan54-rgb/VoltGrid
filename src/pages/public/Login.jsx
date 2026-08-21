import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth'

const providers = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
]

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.17-2 3.44-4.95 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.1 0 5.71-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path fill="#FBBC05" d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.7a11.5 11.5 0 0 0 0 10.32l3.85-2.98Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.2.58 4.4 1.72l3.3-3.3C17.7 1.28 15.1.25 12 .25A11.5 11.5 0 0 0 1.7 6.84l3.85 2.98C6.46 7.1 9 4.75 12 4.75Z"
      />
    </svg>
  )
}

function GitHubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.3-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.82 1.19 1.85 1.19 3.11 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  )
}

const providerIcons = { google: GoogleIcon, github: GitHubIcon }

export default function Login() {
  const location = useLocation()
  const { signIn, signInWithProvider } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)

  // Set by RoleRoute when a signed-in account has no profile row yet.
  const profileMissing = location.state?.profileMissing

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy('password')

    const { error: signInError } = await signIn({ email, password })

    if (signInError) {
      setBusy(null)
      setError(
        signInError.message === 'Invalid login credentials'
          ? 'That email and password combination doesn’t match an account.'
          : signInError.message
      )
      return
    }
    // On success PublicOnlyRoute redirects to the portal for this user's role,
    // so leave the button spinning until the route swaps out.
  }

  async function handleProvider(provider) {
    setError(null)
    setBusy(provider)
    const { error: oauthError } = await signInWithProvider(provider)
    if (oauthError) {
      setBusy(null)
      setError(oauthError.message)
    }
    // Otherwise the browser navigates away to the provider.
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Your account role decides which portal opens after sign-in.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {(error || profileMissing) && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {error ||
                'Your account has no VoltGrid profile yet. Contact an administrator to have a role assigned.'}
            </span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy !== null}>
          {busy === 'password' && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy === 'password' ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wider text-muted-foreground">or continue with</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {providers.map((p) => {
          const Icon = providerIcons[p.id]
          return (
            <Button
              key={p.id}
              type="button"
              variant="outline"
              onClick={() => handleProvider(p.id)}
              disabled={busy !== null}
            >
              {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {p.label}
            </Button>
          )
        })}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Don&rsquo;t have an account?{' '}
        <Link to="/register" className="font-medium text-primary hover:underline">
          Create one
        </Link>
      </p>
    </motion.div>
  )
}
