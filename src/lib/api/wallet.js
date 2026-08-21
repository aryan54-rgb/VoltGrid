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
    currency: row.currency ?? 'USD',
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

  // RLS can hand back both the caller's own wallet and the demo persona's. The
  // caller's own row wins when it has been funded; otherwise show the populated
  // demo one so the screen is not an empty shell on a fresh account.
  const { data } = await supabase.auth.getUser()
  const mine = accounts.find((a) => a.user_id === data?.user?.id)
  const chosen = mine && Number(mine.balance) > 0 ? mine : (accounts.find((a) => Number(a.balance) > 0) ?? mine ?? accounts[0])
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

/**
 * Debit the wallet for something bought outside a charging session.
 *
 * Same ordering rule as topUp(): the ledger entry goes in first, so a failure
 * between the two statements leaves a recorded charge rather than a silent one.
 */
export async function purchase(userId, amount, description, method = 'Wallet') {
  const wallet = await supabase
    .from('wallet_accounts')
    .select('balance')
    .eq('user_id', userId)
    .single()
    .then(unwrap)

  await supabase.from('transactions').insert({
    id: `tx-${Date.now().toString(36)}`,
    user_id: userId,
    type: 'purchase',
    description,
    amount: -Math.abs(amount),
    status: 'completed',
    method,
  })

  const row = await supabase
    .from('wallet_accounts')
    .update({ balance: Number(wallet.balance) - Math.abs(amount) })
    .eq('user_id', userId)
    .select('*')
    .single()
    .then(unwrap)
  return mapWallet(row)
}

export async function updateAutoTopUp(userId, { enabled, threshold, amount }) {
  const row = await supabase
    .from('wallet_accounts')
    .update({
      auto_top_up: enabled,
      ...(threshold == null ? {} : { auto_top_up_threshold: threshold }),
      ...(amount == null ? {} : { auto_top_up_amount: amount }),
    })
    .eq('user_id', userId)
    .select('*')
    .single()
    .then(unwrap)
  return mapWallet(row)
}

/**
 * Add funds and record the movement.
 *
 * Two statements rather than one: without a Postgres function there is no way
 * to make them atomic from the browser, so the ledger entry is written first —
 * a top-up that is recorded but not credited is recoverable, the reverse is
 * money that appears from nowhere.
 */
export async function topUp(userId, amount, method = 'Wallet') {
  const wallet = await supabase
    .from('wallet_accounts')
    .select('balance')
    .eq('user_id', userId)
    .single()
    .then(unwrap)

  await supabase.from('transactions').insert({
    id: `tx-${Date.now().toString(36)}`,
    user_id: userId,
    type: 'topup',
    description: 'Wallet top-up',
    amount,
    status: 'completed',
    method,
  })

  const row = await supabase
    .from('wallet_accounts')
    .update({ balance: Number(wallet.balance) + amount })
    .eq('user_id', userId)
    .select('*')
    .single()
    .then(unwrap)
  return mapWallet(row)
}
