import { admin, cors, creditCapturedPayment, json, signedInUser, verifyHmac } from '../_shared/razorpay.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const user = await signedInUser(req)
    const { orderId, paymentId, signature } = await req.json()
    if (![orderId, paymentId, signature].every((value) => typeof value === 'string')) {
      return json({ error: 'Missing payment details' }, 400)
    }
    const { data: topup } = await admin().from('razorpay_topups')
      .select('order_id,user_id').eq('order_id', orderId).single()
    if (!topup || topup.user_id !== user.id) return json({ error: 'Order not found' }, 404)
    const valid = await verifyHmac(`${topup.order_id}|${paymentId}`, signature,
      Deno.env.get('RAZORPAY_KEY_SECRET')!)
    if (!valid) return json({ error: 'Payment signature did not match' }, 400)
    await creditCapturedPayment(orderId, paymentId)
    return json({ paid: true })
  } catch (error) {
    console.error('Verify top-up failed', error)
    return json({ error: 'Payment confirmation is pending. Your wallet will update after confirmation.' }, 409)
  }
})
