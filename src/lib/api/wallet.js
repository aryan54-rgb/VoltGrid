import { supabase } from '@/lib/supabase'
import { unwrap } from './helpers'

/**
 * Wallet, saved cards and the transaction ledger.
 *
 * A wallet row is created for every profile by the `on_profile_created`
 * trigger, so a brand-new account has one before it ever opens this screen.
 */

export function mapWallet(row, cards = []) {
  return {
    userId: row.user_id,
    balance: Number(row.balance ?? 0),
    currency: row.currency ?? 'INR',
    autoTopUp: row.auto_top_up,
    autoTopUpThreshold: Number(row.auto_top_up_threshold ?? 0),
    autoTopUpAmount: Number(row.auto_top_up_amount ?? 0),
    cards: cards.map((c) => ({
      id: c.id,
      brand: c.brand,
      last4: c.last4,
      expiry: c.expiry,
      primary: c.is_primary,
    })),
  }
}

export function mapTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    date: row.occurred_at,
    amount: Number(row.amount),
    status: row.status,
    method: row.method,
  }
}

export async function fetchWallet() {
  const [accounts, cards] = await Promise.all([
    supabase.from('wallet_accounts').select('*').then(unwrap),
    supabase.from('payment_cards').select('*').order('is_primary', { ascending: false }).then(unwrap),
  ])
  if (!accounts.length) return null

  // Checkout charges the signed-in driver's wallet, so this screen must show
  // that same balance even when a demo wallet is also visible through RLS.
  const { data } = await supabase.auth.getUser()
  const mine = accounts.find((a) => a.user_id === data?.user?.id)
  const chosen = mine ?? accounts[0]
  return mapWallet(chosen, cards.filter((c) => c.user_id === chosen.user_id))
}

export async function fetchTransactions({ limit = 100 } = {}) {
  const rows = await supabase
    .from('transactions')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(limit)
    .then(unwrap)
  return rows.map(mapTransaction)
}

export async function updateAutoTopUp(userId, { enabled, threshold, amount }) {
  const { data, error } = await supabase.rpc('update_wallet_preferences', {
    p_enabled: enabled,
    p_threshold: threshold ?? null,
    p_amount: amount ?? null,
  })
  if (error) throw error
  return mapWallet(data)
}

export async function createTopUpOrder(amount) {
  const { data, error } = await supabase.functions.invoke('razorpay-create-order', { body: { amount } })
  if (error) {
    const detail = await error.context?.json?.().catch(() => null)
    throw new Error(detail?.error ?? error.message)
  }
  return data
}

export async function verifyTopUpPayment(payment) {
  const { data, error } = await supabase.functions.invoke('razorpay-verify-payment', { body: payment })
  if (error) {
    const detail = await error.context?.json?.().catch(() => null)
    throw new Error(detail?.error ?? error.message)
  }
  return data
}

let checkoutScript
export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()
  checkoutScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = resolve
    script.onerror = () => { checkoutScript = null; reject(new Error('Could not load Razorpay Checkout')) }
    document.head.appendChild(script)
  })
  return checkoutScript
}
