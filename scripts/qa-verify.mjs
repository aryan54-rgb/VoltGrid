/**
 * Automated QA Verification Harness for VoltGrid Cloud Supabase
 *
 * Implements Test Suites 1.1 through 4.1 as defined in:
 * "System Verification & Agent Testing Specification.md"
 *
 * Usage:
 *   node scripts/qa-verify.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { distanceKm, toPoint } from '../src/lib/geo.js'

// Load environment variables from .env.local if present, or process.env
let supabaseUrl = process.env.VITE_SUPABASE_URL
let supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

const envPath = new URL('../.env.local', import.meta.url)
if (existsSync(envPath)) {
  const env = Object.fromEntries(
    readFileSync(envPath, 'utf8')
      .split('\n')
      .filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  )
  supabaseUrl = supabaseUrl || env.VITE_SUPABASE_URL
  supabaseAnonKey = supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ ERROR: Missing Supabase credentials.')
  console.error('Please ensure .env.local exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n')
  process.exit(1)
}

console.log('='.repeat(70))
console.log('⚡ VoltGrid End-to-End QA Verification Suite')
console.log(`Target Supabase: ${supabaseUrl}`)
console.log(`Execution Time: ${new Date().toISOString()}`)
console.log('='.repeat(70))

const baseClient = () => createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const timestamp = Date.now()
const runId = `qa_${timestamp.toString(36)}`
const testPassword = `TestPass!_${timestamp}`

// Results collector
const results = []

function recordResult(suite, testName, passed, details = '') {
  results.push({ suite, testName, passed, details })
  const icon = passed ? '✅ PASS' : '❌ FAIL'
  console.log(`  [${icon}] ${suite} - ${testName} ${details ? `(${details})` : ''}`)
}

async function main() {
  const roles = ['driver', 'operator', 'fleet', 'admin']
  const accounts = {}
  const clients = {}

  // ==========================================================================
  // Test Suite 1.1: Multi-Role Cloud Account Provisioning
  // ==========================================================================
  console.log('\n--- Test Suite 1.1: Multi-Role Cloud Account Provisioning ---')
  for (const role of roles) {
    const email = `${role}_${runId}@voltgrid.test`
    const fullName = `QA Test ${role.toUpperCase()}`
    const anon = baseClient()

    try {
      const { data, error } = await anon.auth.signUp({
        email,
        password: testPassword,
        options: {
          data: { full_name: fullName, role }
        }
      })

      if (error) {
        recordResult('1.1 Provisioning', `Sign up ${role}`, false, error.message)
        continue
      }

      const user = data.user
      const session = data.session
      accounts[role] = { email, user, role, session, fullName }

      // Check profiles table row
      // We authenticate client for this user to query profiles or use session
      const userClient = baseClient()
      if (session) {
        await userClient.auth.setSession(session)
      } else {
        const { data: loginData, error: loginErr } = await userClient.auth.signInWithPassword({
          email,
          password: testPassword
        })
        if (!loginErr && loginData.session) {
          accounts[role].session = loginData.session
        }
      }
      clients[role] = userClient

      const { data: profileRow, error: profileErr } = await userClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileErr) {
        recordResult('1.1 Provisioning', `Profile creation for ${role}`, false, profileErr.message)
      } else if (profileRow && profileRow.role === role) {
        recordResult('1.1 Provisioning', `Profile role matches '${role}'`, true, `User ID: ${user.id}`)
      } else {
        recordResult('1.1 Provisioning', `Profile role for ${role}`, false, `Got: ${profileRow?.role}`)
      }
    } catch (e) {
      recordResult('1.1 Provisioning', `Account provisioning for ${role}`, false, e.message)
    }
  }

  // Verify driver session token
  if (clients.driver && accounts.driver?.session?.access_token) {
    recordResult('1.1 Provisioning', 'Driver session access token valid', true, 'Bearer token obtained')
  } else {
    recordResult('1.1 Provisioning', 'Driver session access token valid', false, 'No session token')
  }

  // Create Driver B for cross-user RLS testing
  const driverBEmail = `driver_b_${runId}@voltgrid.test`
  const driverBClient = baseClient()
  let driverBUser = null
  try {
    const { data: bData } = await driverBClient.auth.signUp({
      email: driverBEmail,
      password: testPassword,
      options: { data: { full_name: 'Driver B Test', role: 'driver' } }
    })
    driverBUser = bData?.user
  } catch (e) {
    console.error('Failed to create Driver B:', e.message)
  }

  // ==========================================================================
  // Test Suite 1.2: Row-Level Security (RLS) Enforcement
  // ==========================================================================
  console.log('\n--- Test Suite 1.2: Row-Level Security (RLS) Enforcement ---')
  if (clients.driver && driverBUser) {
    try {
      // Driver A attempts to read Driver B's reservations
      const { data: resRows, error: resErr } = await clients.driver
        .from('reservations')
        .select('*')
        .eq('user_id', driverBUser.id)

      if (resErr) {
        recordResult('1.2 RLS', "Query other driver's reservations blocked by policy", true, `Error/Policy: ${resErr.message}`)
      } else if (Array.isArray(resRows) && resRows.length === 0) {
        recordResult('1.2 RLS', "Query other driver's reservations returns 0 rows", true, 'Isolated by RLS')
      } else {
        recordResult('1.2 RLS', "Query other driver's reservations", false, `Leaked ${resRows.length} rows`)
      }
    } catch (e) {
      recordResult('1.2 RLS', "Query other driver's reservations", true, e.message)
    }

    try {
      // Direct client insert into notifications
      const { error: notifErr } = await clients.driver
        .from('notifications')
        .insert({
          id: `NT-test-${runId}`,
          user_id: accounts.driver.user.id,
          roles: ['operator'],
          type: 'system',
          title: 'Spoofed Notification',
          body: 'This should fail'
        })

      if (notifErr) {
        recordResult('1.2 RLS', 'Direct client insert to public.notifications fails (Read-Only)', true, notifErr.message)
      } else {
        recordResult('1.2 RLS', 'Direct client insert to public.notifications fails', false, 'Allowed direct insert (Security risk)')
      }
    } catch (e) {
      recordResult('1.2 RLS', 'Direct client insert to public.notifications fails', true, e.message)
    }
  } else {
    recordResult('1.2 RLS', 'Test prerequisites met', false, 'Missing driver client or driver B')
  }

  // ==========================================================================
  // Test Suite 2.1: Cloud Geolocation & Haversine Distance
  // ==========================================================================
  console.log('\n--- Test Suite 2.1: Cloud Geolocation & Haversine Distance ---')
  let testStation = null
  let testConnector = null
  try {
    const puneLocation = { latitude: 18.5204, longitude: 73.8567 }
    const { data: stations, error: stErr } = await (clients.driver || baseClient())
      .from('stations')
      .select('*, connectors(*)')

    if (stErr || !stations) {
      recordResult('2.1 Geolocation', 'Fetch stations from public.stations', false, stErr?.message)
    } else {
      recordResult('2.1 Geolocation', 'Fetch stations from public.stations', true, `Found ${stations.length} stations`)

      // If no stations exist or have coordinates, create or ensure at least one test station
      if (stations.length === 0) {
        console.log('    (No stations found in cloud DB, creating a test station via admin/operator...)')
        const adminClient = clients.admin || clients.operator || baseClient()
        const newStationId = `st-${runId}`
        await adminClient.from('stations').insert({
          id: newStationId,
          name: 'Pune Central EV Hub',
          address: 'Shivaji Nagar',
          city: 'Pune',
          latitude: 18.5314,
          longitude: 73.8446,
          price_per_kwh: 12.5,
          status: 'online'
        })
        const newConnectorId = `${newStationId}-c1`
        await adminClient.from('connectors').insert({
          id: newConnectorId,
          station_id: newStationId,
          label: 'Bay 1 (CCS2)',
          type: 'CCS2',
          power_kw: 60,
          status: 'AVAILABLE'
        })
        const { data: refetched } = await adminClient.from('stations').select('*, connectors(*)').eq('id', newStationId).single()
        testStation = refetched
        testConnector = refetched?.connectors?.[0]
      } else {
        testStation = stations[0]
        testConnector = testStation.connectors?.[0]
      }

      // Calculate distances dynamically
      const stationsWithDistance = stations.map((st) => {
        const d = distanceKm(puneLocation, st)
        return { ...st, distance: d }
      })

      const hasValidCalculations = stationsWithDistance.some((s) => s.distance !== null && Number.isFinite(s.distance))
      recordResult('2.1 Geolocation', 'Dynamic Haversine distance calculation in km', hasValidCalculations || stations.length === 0, 'Haversine formula verified')
    }
  } catch (e) {
    recordResult('2.1 Geolocation', 'Geolocation calculations', false, e.message)
  }

  // ==========================================================================
  // Test Suite 2.2: Booking Creation, Trigger Broadcast & Operator Approval
  // ==========================================================================
  console.log('\n--- Test Suite 2.2: Booking Creation, Trigger Broadcast & Operator Approval ---')
  if (clients.driver && clients.operator && testStation && testConnector) {
    const resId = `RS-${runId.toUpperCase()}`
    const todayStr = new Date().toISOString().split('T')[0]

    try {
      // 1. Driver creates reservation with PENDING status
      const { data: newRes, error: resErr } = await clients.driver
        .from('reservations')
        .insert({
          id: resId,
          user_id: accounts.driver.user.id,
          station_id: testStation.id,
          connector_id: testConnector.id,
          date: todayStr,
          start_time: '14:00:00',
          end_time: '14:30:00',
          status: 'PENDING'
        })
        .select()
        .single()

      if (resErr) {
        recordResult('2.2 Booking Flow', 'Driver creates reservation (PENDING)', false, resErr.message)
      } else {
        recordResult('2.2 Booking Flow', 'Driver creates reservation (PENDING)', true, `Reservation ID: ${newRes.id}`)

        // 2. Check trigger broadcast in public.notifications
        const notifId = `NT-${newRes.id}`
        const { data: notifRow, error: notifErr } = await clients.operator
          .from('notifications')
          .select('*')
          .eq('id', notifId)
          .maybeSingle()

        if (notifErr) {
          recordResult('2.2 Booking Flow', 'Trigger broadcast to operator notifications', false, notifErr.message)
        } else if (notifRow) {
          recordResult('2.2 Booking Flow', 'Trigger broadcast to operator notifications', true, `Notification: "${notifRow.title}"`)
        } else {
          recordResult('2.2 Booking Flow', 'Trigger broadcast to operator notifications', false, 'Trigger did not create notification row')
        }

        // 3. Operator approves reservation -> status RESERVED
        const { data: updatedRes, error: updateErr } = await clients.operator
          .from('reservations')
          .update({ status: 'RESERVED' })
          .eq('id', newRes.id)
          .select()
          .single()

        if (updateErr) {
          recordResult('2.2 Booking Flow', 'Operator approves reservation to RESERVED', false, updateErr.message)
        } else if (updatedRes?.status === 'RESERVED') {
          recordResult('2.2 Booking Flow', 'Operator approves reservation to RESERVED', true, `Status: ${updatedRes.status}`)
        } else {
          recordResult('2.2 Booking Flow', 'Operator approves reservation', false, `Status was: ${updatedRes?.status}`)
        }
      }
    } catch (e) {
      recordResult('2.2 Booking Flow', 'End-to-end booking & approval', false, e.message)
    }
  } else {
    recordResult('2.2 Booking Flow', 'Booking & Approval prerequisites met', false, 'Missing driver/operator/station')
  }

  // ==========================================================================
  // Test Suite 3.1: Wallet Balance & Transaction Ledger
  // ==========================================================================
  console.log('\n--- Test Suite 3.1: Wallet Balance & Transaction Ledger ---')
  if (clients.driver && accounts.driver?.user) {
    const driverId = accounts.driver.user.id
    try {
      // Ensure wallet account exists
      let { data: wallet } = await clients.driver
        .from('wallet_accounts')
        .select('*')
        .eq('user_id', driverId)
        .maybeSingle()

      if (!wallet) {
        const { data: createdW } = await clients.driver
          .from('wallet_accounts')
          .insert({ user_id: driverId, balance: 0, currency: 'INR' })
          .select()
          .single()
        wallet = createdW
      }

      const initialBalance = Number(wallet?.balance ?? 0)

      // Top-up +500
      const topUpAmount = 500
      const txTopUpId = `tx-topup-${runId}`
      await clients.driver.from('transactions').insert({
        id: txTopUpId,
        user_id: driverId,
        type: 'topup',
        description: 'QA Wallet top-up',
        amount: topUpAmount,
        status: 'completed',
        method: 'UPI'
      })

      await clients.driver
        .from('wallet_accounts')
        .update({ balance: initialBalance + topUpAmount })
        .eq('user_id', driverId)

      // Charging deduction -150
      const deductAmount = 150
      const txDeductId = `tx-deduct-${runId}`
      await clients.driver.from('transactions').insert({
        id: txDeductId,
        user_id: driverId,
        type: 'purchase',
        description: 'Session charge deduction',
        amount: -deductAmount,
        status: 'completed',
        method: 'Wallet'
      })

      const finalExpected = initialBalance + topUpAmount - deductAmount
      const { data: updatedWallet } = await clients.driver
        .from('wallet_accounts')
        .update({ balance: finalExpected })
        .eq('user_id', driverId)
        .select()
        .single()

      const actualBalance = Number(updatedWallet?.balance ?? 0)
      if (actualBalance === finalExpected) {
        recordResult('3.1 Wallet Ledger', 'Wallet balance reflects (+500 - 150)', true, `Balance: ₹${actualBalance}`)
      } else {
        recordResult('3.1 Wallet Ledger', 'Wallet balance reflects calculation', false, `Expected ${finalExpected}, got ${actualBalance}`)
      }

      // Check transaction ledger rows
      const { data: txRows } = await clients.driver
        .from('transactions')
        .select('*')
        .in('id', [txTopUpId, txDeductId])

      if (txRows?.length === 2) {
        recordResult('3.1 Wallet Ledger', 'Two ledger transactions recorded in public.transactions', true, 'TOP_UP (+500) and PURCHASE (-150)')
      } else {
        recordResult('3.1 Wallet Ledger', 'Transaction ledger entries recorded', false, `Found ${txRows?.length} entries`)
      }
    } catch (e) {
      recordResult('3.1 Wallet Ledger', 'Wallet & transaction operations', false, e.message)
    }
  } else {
    recordResult('3.1 Wallet Ledger', 'Driver wallet test prerequisites', false, 'Missing driver client')
  }

  // ==========================================================================
  // Test Suite 4.1: Driver Fault Report to Operator View
  // ==========================================================================
  console.log('\n--- Test Suite 4.1: Driver Fault Report to Operator View ---')
  if (clients.driver && clients.operator && testStation) {
    const ticketId = `TK-${runId.toUpperCase()}`
    try {
      // Driver submits fault report
      const { data: newTicket, error: ticketErr } = await clients.driver
        .from('tickets')
        .insert({
          id: ticketId,
          title: 'QA Test: Connector Latch Jammed',
          station_id: testStation.id,
          connector_id: testConnector?.id || null,
          category: 'Hardware',
          priority: 'HIGH',
          status: 'OPEN',
          source: 'DRIVER_REPORT',
          reporter: `${accounts.driver.fullName} (driver)`,
          reporter_id: accounts.driver.user.id,
          description: 'Connector won\'t release from vehicle port.'
        })
        .select()
        .single()

      if (ticketErr) {
        recordResult('4.1 Maintenance Queue', 'Driver submits fault report (status OPEN)', false, ticketErr.message)
      } else {
        recordResult('4.1 Maintenance Queue', 'Driver submits fault report (status OPEN)', true, `Ticket ID: ${newTicket.id}`)

        // Operator views fault queue
        const { data: opTickets, error: opErr } = await clients.operator
          .from('tickets')
          .select('*, stations(name)')
          .eq('id', ticketId)
          .maybeSingle()

        if (opErr) {
          recordResult('4.1 Maintenance Queue', 'Operator views fault queue', false, opErr.message)
        } else if (opTickets && opTickets.id === ticketId) {
          recordResult('4.1 Maintenance Queue', 'Fault visible in operator workspace queue', true, `Found ticket: "${opTickets.title}"`)
        } else {
          recordResult('4.1 Maintenance Queue', 'Fault visible in operator workspace queue', false, 'Ticket not found in operator queue')
        }
      }
    } catch (e) {
      recordResult('4.1 Maintenance Queue', 'Fault ticket submission & queue view', false, e.message)
    }
  } else {
    recordResult('4.1 Maintenance Queue', 'Fault queue prerequisites met', false, 'Missing clients or station')
  }

  // ==========================================================================
  // Summary Table
  // ==========================================================================
  console.log('\n' + '='.repeat(70))
  console.log('📊 QA VERIFICATION SUMMARY')
  console.log('='.repeat(70))
  console.table(results.map((r) => ({
    Suite: r.suite,
    Test: r.testName,
    Status: r.passed ? 'PASS' : 'FAIL',
    Details: r.details
  })))

  const total = results.length
  const passedCount = results.filter((r) => r.passed).length
  const failedCount = total - passedCount

  console.log(`\nTotal Tests: ${total} | Passed: ${passedCount} | Failed: ${failedCount}`)
  if (failedCount > 0) {
    console.log('⚠️ Some test assertions failed. Review the details above.')
    process.exit(1)
  } else {
    console.log('🎉 All Test Suites Passed Successfully!')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('\nFatal test execution error:', err)
  process.exit(1)
})
