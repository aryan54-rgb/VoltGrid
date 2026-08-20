import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Zap,
  Wrench,
  CircleDot,
  PauseCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

/**
 * Maps domain statuses to a badge variant + icon so state is never color-alone.
 */
const MAP = {
  // stations / chargers
  online: { variant: 'success', icon: CheckCircle2, label: 'Online' },
  available: { variant: 'success', icon: CheckCircle2, label: 'Available' },
  'in-use': { variant: 'info', icon: Zap, label: 'In use' },
  charging: { variant: 'info', icon: Zap, label: 'Charging' },
  maintenance: { variant: 'warning', icon: Wrench, label: 'Maintenance' },
  offline: { variant: 'destructive', icon: XCircle, label: 'Offline' },
  faulted: { variant: 'destructive', icon: AlertTriangle, label: 'Faulted' },
  // bookings / sessions / tickets
  confirmed: { variant: 'success', icon: CheckCircle2, label: 'Confirmed' },
  active: { variant: 'info', icon: CircleDot, label: 'Active' },
  pending: { variant: 'warning', icon: Clock, label: 'Pending' },
  scheduled: { variant: 'info', icon: Clock, label: 'Scheduled' },
  completed: { variant: 'success', icon: CheckCircle2, label: 'Completed' },
  cancelled: { variant: 'secondary', icon: XCircle, label: 'Cancelled' },
  failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
  refunded: { variant: 'secondary', icon: PauseCircle, label: 'Refunded' },
  open: { variant: 'warning', icon: CircleDot, label: 'Open' },
  'in-progress': { variant: 'info', icon: Wrench, label: 'In progress' },
  resolved: { variant: 'success', icon: CheckCircle2, label: 'Resolved' },
  critical: { variant: 'destructive', icon: AlertTriangle, label: 'Critical' },
  high: { variant: 'destructive', icon: AlertTriangle, label: 'High' },
  medium: { variant: 'warning', icon: CircleDot, label: 'Medium' },
  low: { variant: 'secondary', icon: CircleDot, label: 'Low' },
  suspended: { variant: 'destructive', icon: PauseCircle, label: 'Suspended' },
  paid: { variant: 'success', icon: CheckCircle2, label: 'Paid' },
  overdue: { variant: 'destructive', icon: AlertTriangle, label: 'Overdue' },
  // SRS state machines (§7.1) — connectors, reservations, tickets and fleet duty
  reserved: { variant: 'warning', icon: Clock, label: 'Reserved' },
  occupied: { variant: 'info', icon: Zap, label: 'Occupied' },
  expired: { variant: 'secondary', icon: Clock, label: 'Expired' },
  assigned: { variant: 'info', icon: Wrench, label: 'Assigned' },
  on_duty: { variant: 'success', icon: CheckCircle2, label: 'On duty' },
  off_duty: { variant: 'secondary', icon: PauseCircle, label: 'Off duty' },
  on_leave: { variant: 'warning', icon: PauseCircle, label: 'On leave' },
}

export function StatusBadge({ status, label }) {
  // SRS statuses are upper snake case (RESERVED, IN_PROGRESS); the UI vocabulary
  // is lower kebab case. Normalise both spellings onto the same entry.
  const key = typeof status === 'string' ? status.toLowerCase().replace(/-/g, '_') : status
  const cfg =
    MAP[status] ??
    MAP[key] ??
    MAP[key?.replace?.(/_/g, '-')] ?? { variant: 'secondary', icon: CircleDot, label: status }
  const Icon = cfg.icon
  return (
    <Badge variant={cfg.variant}>
      <Icon />
      {label ?? cfg.label}
    </Badge>
  )
}
