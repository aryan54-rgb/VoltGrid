import { creditCapturedPayment, json, verifyHmac } from '../_shared/razorpay.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
  if (!secret) return json({ error: 'Webhook not configured' }, 500)
  const rawBody = await req.text()
  const valid = await verifyHmac(rawBody, req.headers.get('x-razorpay-signature') ?? '', secret)
  if (!valid) return json({ error: 'Invalid signature' }, 401)
  try {
    const event = JSON.parse(rawBody)
    if (event.event !== 'payment.captured') return json({ received: true })
    const payment = event.payload?.payment?.entity
    if (!payment?.order_id || !payment?.id) return json({ error: 'Invalid payment event' }, 400)
    await creditCapturedPayment(payment.order_id, payment.id)
    return json({ received: true })
  } catch (error) {
    console.error('Razorpay webhook failed', error)
    return json({ error: 'Webhook processing failed' }, 500)
  }
})
