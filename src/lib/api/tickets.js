import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Fault tickets (SRS §7.1).
 *
 * A driver sees the ones they reported; operators and admins see the whole
 * queue — that split lives in the RLS policy, not here. `sla_due_at` is filled
 * in by a database trigger from `sla_policies`, so the deadline cannot be
 * talked down by whatever the client posts.
 */

const SELECT = '*, stations(name), connectors(label), ticket_events(at, who, what)'

export function mapTicket(row) {
  return {
    id: row.id,
    title: row.title,
    stationId: row.station_id,
    stationName: row.stations?.name ?? '—',
    connectorId: row.connector_id,
    connectorLabel: row.connector_label ?? row.connectors?.label ?? null,
    faultCode: row.fault_code,
    priority: row.priority,
    status: row.status,
    source: row.source,
    category: row.category,
    reporter: row.reporter,
    reporterId: row.reporter_id,
    assignedTo: row.assigned_to,
    reportedAt: row.reported_at,
    slaDueAt: row.sla_due_at,
    resolvedAt: row.resolved_at,
    description: row.description,
    parts: row.parts ?? [],
    activity: [...(row.ticket_events ?? [])].sort((a, b) => new Date(a.at) - new Date(b.at)),
  }
}

export async function fetchTickets() {
  const rows = await supabase
    .from('tickets')
    .select(SELECT)
    .order('reported_at', { ascending: false })
    .then(unwrap)
  return rows.map(mapTicket)
}

export async function fetchFaultCategories() {
  const rows = await supabase.from('fault_categories').select('name').order('sort_order').then(unwrap)
  return rows.map((r) => r.name)
}

/** `{CRITICAL: 4, HIGH: 8, …}` — response-time SLA per priority, in hours. */
export async function fetchSlaHours() {
  const rows = await supabase.from('sla_policies').select('*').then(unwrap)
  return Object.fromEntries(rows.map((r) => [r.priority, r.response_hours]))
}

export async function createTicket({
  userId,
  reporterName,
  stationId,
  connectorId,
  connectorLabel,
  category,
  priority = 'MEDIUM',
  title,
  description,
}) {
  const id = `TK-${Date.now().toString(36).toUpperCase()}`
  const row = await supabase
    .from('tickets')
    .insert({
      id,
      title,
      station_id: stationId,
      connector_id: connectorId,
      connector_label: connectorLabel,
      category,
      priority,
      status: 'OPEN',
      source: 'DRIVER_REPORT',
      reporter: `${reporterName} (driver)`,
      reporter_id: userId,
      description,
      // sla_due_at is left out on purpose — the tickets_apply_sla trigger sets
      // it from sla_policies.
    })
    .select(SELECT)
    .single()
    .then(unwrap)

  await supabase
    .from('ticket_events')
    .insert({ ticket_id: id, who: reporterName, what: 'Fault reported from the driver app' })

  return mapTicket(row)
}

/** Dispatch a ticket to a member of the maintenance crew. */
export async function assignTicket(id, assignee) {
  const row = await supabase
    .from('tickets')
    .update({ assigned_to: assignee, status: 'ASSIGNED' })
    .eq('id', id)
    .select(SELECT)
    .single()
    .then(unwrap)

  await supabase
    .from('ticket_events')
    .insert({ ticket_id: id, who: 'Dispatch', what: `Assigned to ${assignee}` })

  return mapTicket(row)
}

const PRIORITY_LADDER = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

/**
 * Raise a ticket's priority one rung.
 *
 * `sla_due_at` is left alone on purpose: the deadline was set from when the
 * fault was reported, and escalating does not buy the crew more time.
 */
export async function escalateTicket(id, currentPriority) {
  const next = PRIORITY_LADDER[
    Math.min(PRIORITY_LADDER.indexOf(currentPriority) + 1, PRIORITY_LADDER.length - 1)
  ]
  const row = await supabase
    .from('tickets')
    .update({ priority: next })
    .eq('id', id)
    .select(SELECT)
    .single()
    .then(unwrap)

  await supabase
    .from('ticket_events')
    .insert({ ticket_id: id, who: 'Dispatch', what: `Priority raised to ${next}` })

  return mapTicket(row)
}

/** Operator action: move a ticket along and log why. */
export async function updateTicketStatus(id, status, { who, note } = {}) {
  const patch = { status }
  if (status === 'RESOLVED') patch.resolved_at = new Date().toISOString()

  const row = await supabase.from('tickets').update(patch).eq('id', id).select(SELECT).single().then(unwrap)

  if (who) {
    await supabase
      .from('ticket_events')
      .insert({ ticket_id: id, who, what: note ?? `Status changed to ${status}` })
  }
  return mapTicket(row)
}
