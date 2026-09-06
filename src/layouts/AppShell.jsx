import * as React from 'react'
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  ChevronsUpDown,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserCircle,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SearchInput } from '@/components/shared/search-input'
import { useTheme } from '@/context/theme'
import { useAuth } from '@/context/auth'
import { NAV, ROLE_META } from '@/lib/nav'
import { fetchNotifications } from '@/lib/api/notifications'
import { useQuery } from '@/hooks/use-query'
import { cn, initials, timeAgo } from '@/lib/utils'

function VoltGridLogo({ className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2', className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Zap className="h-4.5 w-4.5" fill="currentColor" strokeWidth={0} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">VoltGrid</span>
    </Link>
  )
}

function SidebarNav({ role, onNavigate }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
      <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {ROLE_META[role].label}
      </p>
      {NAV[role].map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive && 'bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary'
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
          {item.label === 'Notifications' && (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
              3
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function AccountMenu({ role, user, onSignOut }) {
  const navigate = useNavigate()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card p-2.5 text-left shadow-sm transition-colors hover:bg-accent"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{ROLE_META[role].label}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuLabel>
          <span className="block">{user.name}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {role === 'driver' && (
          <DropdownMenuItem onClick={() => navigate('/driver/profile')}>
            <UserCircle />
            Profile
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationsMenu({ role }) {
  const navigate = useNavigate()
  // RLS already limits the rows to this role's broadcasts and the caller's own,
  // so the bell shows the newest five of whatever comes back.
  const { data, loading, error } = useQuery(fetchNotifications, [])
  const items = (data ?? []).slice(0, 5)
  const unread = items.filter((n) => !n.read).length
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4.5 w-4.5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && <Badge variant="secondary">{unread} new</Badge>}
        </div>
        <DropdownMenuSeparator />
        {loading && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {error && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            Notifications are unavailable right now.
          </p>
        )}
        {!loading && !error && items.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You are all caught up.</p>
        )}
        {items.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="items-start gap-3 py-2.5 cursor-pointer"
            onClick={() => {
              if (role === 'driver') {
                navigate('/driver/notifications')
              } else if (role === 'operator') {
                navigate('/operator/reservations')
              }
            }}
          >
            <span
              className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-border' : 'bg-primary')}
            />
            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="block truncate text-sm font-medium">{n.title}</span>
              <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
              <span className="block text-[11px] text-muted-foreground/70">{timeAgo(n.time)}</span>
            </span>
          </DropdownMenuItem>
        ))}
        {role === 'driver' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary" onClick={() => navigate('/driver/notifications')}>
              View all notifications
            </DropdownMenuItem>
          </>
        )}
        {role === 'operator' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-primary font-medium" onClick={() => navigate('/operator/reservations')}>
              View Reservations board
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AppShell({ role }) {
  const { theme, setTheme } = useTheme()
  const { profile, user: authUser, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const user = {
    name: profile?.name || authUser?.email?.split('@')[0] || 'VoltGrid user',
    email: profile?.email || authUser?.email || '',
  }

  React.useEffect(() => setMobileOpen(false), [location.pathname])

  const handleSignOut = React.useCallback(async () => {
    await signOut()
    navigate('/login', { replace: true })
  }, [signOut, navigate])

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-5">
          <VoltGridLogo />
        </div>
        <SidebarNav role={role} />
        <div className="border-t border-sidebar-border p-3">
          <AccountMenu role={role} user={user} onSignOut={handleSignOut} />
        </div>
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
                <VoltGridLogo />
                <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <SidebarNav role={role} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t border-sidebar-border p-3">
                <AccountMenu role={role} user={user} onSignOut={handleSignOut} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        {/* topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <SearchInput placeholder="Search stations, sessions, invoices…" className="hidden w-full max-w-sm md:block" />
          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </Button>
            <NotificationsMenu role={role} />
            <Separator orientation="vertical" className="mx-1 h-6" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(user.name)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block">{user.name}</span>
                  <span className="block text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === 'driver' && (
                  <DropdownMenuItem onClick={() => navigate('/driver/profile')}>
                    <UserCircle />
                    Profile
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
