import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait" initial={false}>
        {!sent ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
              <p className="text-sm text-muted-foreground">
                Enter the email address on your account and we&rsquo;ll send you a link to set a new password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="sent"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.25 }}
            className="text-center"
          >
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-2xl font-semibold tracking-tight">Check your inbox</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If an account exists for {email || 'that address'}, a password reset link is on its way.
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Email delivery is simulated in this prototype — no message is actually sent.
            </p>

            <Button variant="outline" className="mt-8 w-full" asChild>
              <Link to="/login">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
