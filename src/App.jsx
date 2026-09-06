import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AuthLayout from '@/layouts/AuthLayout'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import {
  OnboardingRoute,
  PublicOnlyRoute,
  RequireAuth,
  RoleRoute,
} from '@/components/auth/route-guards'

// public
const Landing = lazy(() => import('@/pages/public/Landing'))
const Login = lazy(() => import('@/pages/public/Login'))
const Register = lazy(() => import('@/pages/public/Register'))
const ForgotPassword = lazy(() => import('@/pages/public/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/public/ResetPassword'))
const AuthCallback = lazy(() => import('@/pages/public/AuthCallback'))
const Onboarding = lazy(() => import('@/pages/public/Onboarding'))
const Modules = lazy(() => import('@/pages/public/Features'))

// driver
const DriverDashboard = lazy(() => import('@/pages/driver/Dashboard'))
const DriverStations = lazy(() => import('@/pages/driver/Stations'))
const DriverStationDetails = lazy(() => import('@/pages/driver/StationDetails'))
const DriverReservations = lazy(() => import('@/pages/driver/Reservations'))
const DriverBooking = lazy(() => import('@/pages/driver/Booking'))
const DriverActiveSession = lazy(() => import('@/pages/driver/ActiveSession'))
const DriverHistory = lazy(() => import('@/pages/driver/History'))
const DriverWallet = lazy(() => import('@/pages/driver/Wallet'))
const DriverTransactions = lazy(() => import('@/pages/driver/Transactions'))
const DriverCommunity = lazy(() => import('@/pages/driver/Community'))
const DriverReviews = lazy(() => import('@/pages/driver/Reviews'))
const DriverFaults = lazy(() => import('@/pages/driver/Faults'))
const DriverNotifications = lazy(() => import('@/pages/driver/Notifications'))
const DriverProfile = lazy(() => import('@/pages/driver/Profile'))

// fleet
const FleetDashboard = lazy(() => import('@/pages/fleet/Dashboard'))
const FleetVehicles = lazy(() => import('@/pages/fleet/Vehicles'))
const FleetDrivers = lazy(() => import('@/pages/fleet/Drivers'))
const FleetSchedule = lazy(() => import('@/pages/fleet/Schedule'))
const FleetAnalytics = lazy(() => import('@/pages/fleet/Analytics'))
const FleetBilling = lazy(() => import('@/pages/fleet/Billing'))

// operator
const OperatorDashboard = lazy(() => import('@/pages/operator/Dashboard'))
const OperatorStations = lazy(() => import('@/pages/operator/Stations'))
const OperatorChargers = lazy(() => import('@/pages/operator/Chargers'))
const OperatorConnectors = lazy(() => import('@/pages/operator/Connectors'))
const OperatorFaults = lazy(() => import('@/pages/operator/Faults'))
const OperatorReservations = lazy(() => import('@/pages/operator/Reservations'))
const OperatorRevenue = lazy(() => import('@/pages/operator/Revenue'))
const KioskSimulator = lazy(() => import('@/pages/operator/KioskSimulator'))

// admin
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminUsers = lazy(() => import('@/pages/admin/Users'))
const AdminStations = lazy(() => import('@/pages/admin/Stations'))
const AdminMarketplace = lazy(() => import('@/pages/admin/Marketplace'))
const AdminReports = lazy(() => import('@/pages/admin/Reports'))
const AdminAnalytics = lazy(() => import('@/pages/admin/Analytics'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))

function PageFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
      <Routes location={location}>
        {/* public */}
        <Route path="/" element={<Landing />} />
        <Route element={<PublicOnlyRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
        </Route>
        {/* Recovery links land here with a session already established. */}
        <Route element={<RequireAuth />}>
          <Route element={<AuthLayout />}>
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>
        </Route>
        {/* Role picker for social signups, which never see the register form. */}
        <Route element={<OnboardingRoute />}>
          <Route element={<AuthLayout />}>
            <Route path="/welcome" element={<Onboarding />} />
          </Route>
        </Route>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/modules" element={<Modules />} />

        {/* driver */}
        <Route element={<RoleRoute role="driver" />}>
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/driver/stations" element={<DriverStations />} />
          <Route path="/driver/stations/:id" element={<DriverStationDetails />} />
          <Route path="/driver/stations/:id/book" element={<DriverBooking />} />
          <Route path="/driver/reservations" element={<DriverReservations />} />
          <Route path="/driver/session" element={<DriverActiveSession />} />
          <Route path="/driver/active-session" element={<DriverActiveSession />} />
          <Route path="/driver/history" element={<DriverHistory />} />
          <Route path="/driver/wallet" element={<DriverWallet />} />
          <Route path="/driver/transactions" element={<DriverTransactions />} />
          <Route path="/driver/community" element={<DriverCommunity />} />
          <Route path="/driver/reviews" element={<DriverReviews />} />
          <Route path="/driver/faults" element={<DriverFaults />} />
          <Route path="/driver/notifications" element={<DriverNotifications />} />
          <Route path="/driver/profile" element={<DriverProfile />} />
        </Route>

        {/* fleet */}
        <Route element={<RoleRoute role="fleet" />}>
          <Route path="/fleet" element={<FleetDashboard />} />
          <Route path="/fleet/vehicles" element={<FleetVehicles />} />
          <Route path="/fleet/drivers" element={<FleetDrivers />} />
          <Route path="/fleet/schedule" element={<FleetSchedule />} />
          <Route path="/fleet/analytics" element={<FleetAnalytics />} />
          <Route path="/fleet/billing" element={<FleetBilling />} />
        </Route>

        {/* operator */}
        <Route element={<RoleRoute role="operator" />}>
          <Route path="/operator" element={<OperatorDashboard />} />
          <Route path="/operator/stations" element={<OperatorStations />} />
          <Route path="/operator/chargers" element={<OperatorChargers />} />
          <Route path="/operator/connectors" element={<OperatorConnectors />} />
          <Route path="/operator/faults" element={<OperatorFaults />} />
          <Route path="/operator/reservations" element={<OperatorReservations />} />
          <Route path="/operator/revenue" element={<OperatorRevenue />} />
          <Route path="/operator/kiosk" element={<KioskSimulator />} />
          <Route path="/operator/kiosk-simulator" element={<KioskSimulator />} />
        </Route>

        {/* admin */}
        <Route element={<RoleRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/stations" element={<AdminStations />} />
          <Route path="/admin/marketplace" element={<AdminMarketplace />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/kiosk" element={<KioskSimulator />} />
          <Route path="/admin/kiosk-simulator" element={<KioskSimulator />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
