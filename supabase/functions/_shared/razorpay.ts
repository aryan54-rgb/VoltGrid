import { createClient } from 'npm:@supabase/supabase-js@2.112.3'

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

export function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  })
}

export async function signedInUser(req: Request) {
  const authorization = req.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sign in required')
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user) throw new Error('Invalid session')
  return data.user
}

export async function razorpay(path: string, init: RequestInit = {}) {
  const key = Deno.env.get('RAZORPAY_KEY_ID')
  const secret = Deno.env.get('RAZORPAY_KEY_SECRET')
  if (!key || !secret) throw new Error('Razorpay keys are not configured')
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${key}:${secret}`)}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.description ?? 'Razorpay request failed')
  return data
}

export async function verifyHmac(message: string, received: string, secret: string) {
  if (!/^[0-9a-f]{64}$/i.test(received)) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const signature = Uint8Array.from(received.match(/../g)!, (hex) => parseInt(hex, 16))
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(message))
}

export async function creditCapturedPayment(orderId: string, paymentId: string) {
  const payment = await razorpay(`payments/${encodeURIComponent(paymentId)}`)
  if (payment.order_id !== orderId || payment.status !== 'captured' ||
      payment.currency !== 'INR' || !Number.isInteger(payment.amount)) {
    throw new Error('Payment is not captured for this INR order')
  }
  const { data, error } = await admin().rpc('credit_razorpay_topup', {
    p_order_id: orderId,
    p_payment_id: paymentId,
    p_amount_paise: payment.amount,
    p_currency: payment.currency,
  })
  if (error) throw error
  return data
}
