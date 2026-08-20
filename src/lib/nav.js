import {
  LayoutDashboard,
  MapPin,
  Zap,
  History,
  Wallet,
  Receipt,
  ShoppingBag,
  Users,
  Bell,
  UserCircle,
  Truck,
  BarChart3,
  FileText,
  PlugZap,
  CalendarClock,
  DollarSign,
  Wrench,
  Building2,
  Store,
  Settings,
  PieChart,
  Star,
  Plug,
  AlertTriangle,
} from 'lucide-react'

export const ROLE_META = {
  driver: { label: 'EV Driver', home: '/driver' },
  fleet: { label: 'Fleet Manager', home: '/fleet' },
  operator: { label: 'Station Operator', home: '/operator' },
  admin: { label: 'Admin', home: '/admin' },
}

export const NAV = {
  driver: [
    { to: '/driver', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/driver/stations', label: 'Charging Stations', icon: MapPin },
    { to: '/driver/reservations', label: 'My Reservations', icon: CalendarClock },
    { to: '/driver/session', label: 'Active Session', icon: Zap },
    { to: '/driver/history', label: 'Charging History', icon: History },
    { to: '/driver/wallet', label: 'Wallet', icon: Wallet },
    { to: '/driver/transactions', label: 'Transactions', icon: Receipt },
    { to: '/driver/faults', label: 'Report a Fault', icon: Wrench },
    { to: '/driver/marketplace', label: 'Marketplace', icon: ShoppingBag },
    { to: '/driver/community', label: 'Community', icon: Users },
    { to: '/driver/reviews', label: 'Reviews & Ratings', icon: Star },
    { to: '/driver/notifications', label: 'Notifications', icon: Bell },
    { to: '/driver/profile', label: 'Profile', icon: UserCircle },
  ],
  fleet: [
    { to: '/fleet', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/fleet/vehicles', label: 'Fleet Vehicles', icon: Truck },
    { to: '/fleet/drivers', label: 'Fleet Drivers', icon: Users },
    { to: '/fleet/schedule', label: 'Charging Schedule', icon: CalendarClock },
    { to: '/fleet/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/fleet/billing', label: 'Billing', icon: FileText },
  ],
  operator: [
    { to: '/operator', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/operator/stations', label: 'Stations', icon: Building2 },
    { to: '/operator/chargers', label: 'Chargers', icon: PlugZap },
    { to: '/operator/connectors', label: 'Connectors', icon: Plug },
    { to: '/operator/reservations', label: 'Reservations', icon: CalendarClock },
    { to: '/operator/faults', label: 'Fault Queue', icon: AlertTriangle },
    { to: '/operator/revenue', label: 'Revenue', icon: DollarSign },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/stations', label: 'Stations', icon: Building2 },
    { to: '/admin/marketplace', label: 'Marketplace', icon: Store },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/analytics', label: 'Analytics', icon: PieChart },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
}

/**
 * Traceability map: each functional module from SRS §2.2 to the screens in this
 * prototype that demonstrate it. Consumed by the public /modules page.
 */
export const SRS_MODULES = [
  {
    id: 'auth',
    name: 'Authentication & Role Management',
    summary:
      'Secure sign-up, login and role-based access control, with password reset. Every dashboard below is reached through one of the four roles.',
    screens: [
      { to: '/login', label: 'Login' },
      { to: '/register', label: 'Register' },
      { to: '/forgot-password', label: 'Password reset' },
      { to: '/admin/users', label: 'Admin · user & role management' },
    ],
  },
  {
    id: 'discovery',
    name: 'Charging Station Discovery',
    summary:
      'Search stations by location, connector type and availability, and view them on a map with live status.',
    screens: [
      { to: '/driver/stations', label: 'Driver · station search & map' },
      { to: '/driver/stations/st-01', label: 'Driver · station details' },
      { to: '/operator/stations', label: 'Operator · station registry' },
    ],
  },
  {
    id: 'reservation',
    name: 'Slot Reservation',
    summary:
      'Reserve charging bays, prevent double booking, modify or cancel a reservation, and join a live waitlist when a station is full.',
    screens: [
      { to: '/driver/stations/st-01/book', label: 'Driver · booking flow' },
      { to: '/driver/reservations', label: 'Driver · my reservations & waitlist' },
      { to: '/operator/reservations', label: 'Operator · reservation book' },
    ],
  },
  {
    id: 'session',
    name: 'Charging Session Management',
    summary:
      'Start and stop sessions, monitor energy and cost in real time, and follow the charger state machine fed by the kiosk telemetry emulator.',
    screens: [
      { to: '/driver/session', label: 'Driver · live session' },
      { to: '/driver/history', label: 'Driver · session history' },
      { to: '/operator/connectors', label: 'Operator · connector state' },
    ],
  },
  {
    id: 'wallet',
    name: 'Wallet & Billing',
    summary:
      'Wallet top-ups, automatic deduction at session end, invoices and full transaction history.',
    screens: [
      { to: '/driver/wallet', label: 'Driver · wallet & top-up' },
      { to: '/driver/transactions', label: 'Driver · transactions' },
      { to: '/fleet/billing', label: 'Fleet · consolidated invoices' },
      { to: '/operator/revenue', label: 'Operator · revenue' },
    ],
  },
  {
    id: 'fleet',
    name: 'Fleet Management',
    summary:
      'Manage fleet vehicles and drivers, schedule overnight depot charging in bulk against a site power limit, and review fleet usage.',
    screens: [
      { to: '/fleet', label: 'Fleet · dashboard' },
      { to: '/fleet/vehicles', label: 'Fleet · vehicles' },
      { to: '/fleet/drivers', label: 'Fleet · drivers' },
      { to: '/fleet/schedule', label: 'Fleet · bulk charging schedule' },
      { to: '/fleet/analytics', label: 'Fleet · usage analytics' },
    ],
  },
  {
    id: 'maintenance',
    name: 'Maintenance & Fault Ticketing',
    summary:
      'Report charger faults, raise tickets automatically from charger fault codes, and work them against a priority-based SLA.',
    screens: [
      { to: '/driver/faults', label: 'Driver · report a fault' },
      { to: '/operator/faults', label: 'Operator · fault queue & triage' },
    ],
  },
  {
    id: 'community',
    name: 'Community',
    summary: 'Drivers rate and review the stations they charge at, and discuss them with other drivers.',
    screens: [
      { to: '/driver/community', label: 'Driver · community feed' },
      { to: '/driver/reviews', label: 'Driver · reviews & ratings' },
    ],
  },
  {
    id: 'marketplace',
    name: 'Marketplace',
    summary: 'Accessories and charging hardware offered to drivers, curated and managed by the platform.',
    screens: [
      { to: '/driver/marketplace', label: 'Driver · marketplace' },
      { to: '/admin/marketplace', label: 'Admin · catalogue management' },
    ],
  },
  {
    id: 'analytics',
    name: 'Admin Analytics & Reporting',
    summary:
      'Network-wide monitoring, energy and revenue analytics, and exportable reports for operational decisions.',
    screens: [
      { to: '/admin', label: 'Admin · network dashboard' },
      { to: '/admin/analytics', label: 'Admin · energy & revenue analytics' },
      { to: '/admin/reports', label: 'Admin · reports & export' },
      { to: '/admin/stations', label: 'Admin · network stations' },
    ],
  },
]
