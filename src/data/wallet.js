export const wallet = {
  balance: 86.4,
  currency: 'USD',
  autoTopUp: true,
  autoTopUpThreshold: 20,
  autoTopUpAmount: 50,
  cards: [
    { id: 'card-1', brand: 'Visa', last4: '4242', expiry: '09/28', primary: true },
    { id: 'card-2', brand: 'Mastercard', last4: '8810', expiry: '01/27', primary: false },
  ],
}

export const transactions = [
  { id: 'tx-9012', type: 'charge', description: 'Charging session · Volta Plaza', date: '2026-07-30T19:20:00', amount: -11.93, status: 'pending', method: 'Wallet' },
  { id: 'tx-9008', type: 'topup', description: 'Wallet top-up', date: '2026-07-29T08:12:00', amount: 50.0, status: 'completed', method: 'Visa •••• 4242' },
  { id: 'tx-9004', type: 'charge', description: 'Charging session · Harborview Hub', date: '2026-07-28T09:58:00', amount: -14.52, status: 'completed', method: 'Wallet' },
  { id: 'tx-8998', type: 'charge', description: 'Charging session · Volta Plaza', date: '2026-07-25T19:38:00', amount: -17.51, status: 'completed', method: 'Wallet' },
  { id: 'tx-8990', type: 'purchase', description: 'Marketplace · Portable Type 2 cable', date: '2026-07-24T13:05:00', amount: -129.0, status: 'completed', method: 'Mastercard •••• 8810' },
  { id: 'tx-8985', type: 'charge', description: 'Charging session · Twin Peaks Vista', date: '2026-07-22T15:26:00', amount: -20.24, status: 'completed', method: 'Wallet' },
  { id: 'tx-8979', type: 'refund', description: 'Refund · failed session cs-1998', date: '2026-07-20T10:00:00', amount: 0.34, status: 'refunded', method: 'Wallet' },
  { id: 'tx-8974', type: 'charge', description: 'Charging session · Greenline Depot', date: '2026-07-19T08:19:00', amount: -7.88, status: 'completed', method: 'Wallet' },
  { id: 'tx-8969', type: 'topup', description: 'Auto top-up', date: '2026-07-18T06:00:00', amount: 50.0, status: 'completed', method: 'Visa •••• 4242' },
  { id: 'tx-8961', type: 'charge', description: 'Charging session · Sunset Park', date: '2026-07-16T19:56:00', amount: -9.11, status: 'completed', method: 'Wallet' },
  { id: 'tx-8952', type: 'charge', description: 'Charging session · Presidio Gateway', date: '2026-07-10T10:53:00', amount: -15.92, status: 'completed', method: 'Wallet' },
  { id: 'tx-8944', type: 'subscription', description: 'VoltGrid Plus · monthly', date: '2026-07-01T00:00:00', amount: -9.99, status: 'completed', method: 'Visa •••• 4242' },
]
