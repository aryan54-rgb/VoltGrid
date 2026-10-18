import { admin, cors, json, razorpay, signedInUser } from '../_shared/razorpay.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const user = await signedInUser(req)
    const { amount } = await req.json()
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 1 ||
        amount > 100000 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
      return json({ error: 'Enter an amount from ₹1 to ₹1,00,000 with at most two decimals' }, 400)
    }
    const client = admin()
    const { data: wallet, error: walletError } = await client.from('wallet_accounts')
      .select('user_id,currency').eq('user_id', user.id).single()
    if (walletError) throw walletError
    if (wallet?.currency !== 'INR') return json({ error: 'INR wallet not found' }, 400)
    const amountPaise = Math.round(amount * 100)
    const order = await razorpay('orders', {
      method: 'POST',
      body: JSON.stringify({ amount: amountPaise, currency: 'INR',
        receipt: crypto.randomUUID(), notes: { user_id: user.id, purpose: 'wallet_topup' } }),
    })
    const { error } = await client.from('razorpay_topups').insert({
      order_id: order.id, user_id: user.id, amount_paise: amountPaise, currency: 'INR',
    })
    if (error) throw error
    return json({ orderId: order.id, amountPaise, currency: 'INR', keyId: Deno.env.get('RAZORPAY_KEY_ID') })
  } catch (error) {
    console.error('Create top-up order failed', error)
    return json({ error: 'Could not start payment' }, 500)
  }
})
