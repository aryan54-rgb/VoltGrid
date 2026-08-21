/**
 * Row counts for the tables the demo seed touched, read through the anon key.
 *
 *   node scripts/check-db.mjs
 *
 * Run it before and after 20260821180000_clean_demo_data.sql. Tables behind
 * per-user RLS report "rls" rather than a number -- an anonymous caller cannot
 * see those rows, which is the policy working, not a failure.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const CLEARED = [
  'stations', 'connectors', 'sessions', 'reservations', 'waitlists',
  'reviews', 'posts', 'tickets', 'notifications', 'transactions',
  'products', 'fleet_vehicles', 'fleet_drivers', 'invoices',
  'charging_schedule', 'analytics_series',
]
const KEPT = ['booking_slots', 'fault_categories', 'product_categories', 'sla_policies']

async function count(table) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  // An anonymous caller hitting a per-user policy gets an empty error body,
  // not a message. That is the policy holding, not a broken query.
  if (error) {
    const msg = (error.message || '').trim()
    return !msg || /permission|policy|RLS/i.test(msg) ? 'rls (sign in to count)' : `err: ${msg}`
  }
  return count
}

async function report(title, tables, expect) {
  console.log(`\n${title}`)
  for (const t of tables) {
    const n = await count(t)
    const flag = typeof n !== 'number' ? ' ' : (expect === 'empty') === (n === 0) ? '✓' : '✗'
    console.log(`  ${flag} ${t.padEnd(20)} ${n}`)
  }
}

await report('Should be EMPTY after the clean migration:', CLEARED, 'empty')
await report('Should still have rows (lookup config):', KEPT, 'kept')
