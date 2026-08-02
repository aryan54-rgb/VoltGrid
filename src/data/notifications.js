export const notifications = [
  { id: 'nt-1', type: 'charging', title: 'Charging 61% complete', body: 'Your Model 3 at Volta Plaza will reach 90% in ~18 min.', time: '2026-07-30T19:15:00', read: false, roles: ['driver'] },
  { id: 'nt-2', type: 'booking', title: 'Booking confirmed', body: 'Stall A3 at Volta Plaza reserved for Jul 31, 9:30 AM.', time: '2026-07-30T16:02:00', read: false, roles: ['driver'] },
  { id: 'nt-3', type: 'wallet', title: 'Low wallet balance', body: 'Balance dropped below $90. Auto top-up will trigger at $20.', time: '2026-07-30T12:40:00', read: false, roles: ['driver'] },
  { id: 'nt-4', type: 'community', title: 'Maya Chen replied to your comment', body: '"Totally agree — the 60% cutoff is the sweet spot…"', time: '2026-07-29T21:15:00', read: true, roles: ['driver'] },
  { id: 'nt-5', type: 'promo', title: '2× points weekend', body: 'Charge on VoltGrid Network stations this weekend and earn double.', time: '2026-07-29T09:00:00', read: true, roles: ['driver'] },
  { id: 'nt-6', type: 'alert', title: 'Charger DP-04 faulted', body: 'Dogpatch Power Yard stall B2 reported an isolation fault.', time: '2026-07-30T18:20:00', read: false, roles: ['operator', 'admin', 'technician'] },
  { id: 'nt-7', type: 'ticket', title: 'New ticket assigned', body: 'TK-1042 · Connector lock failure at Harborview A1.', time: '2026-07-30T14:55:00', read: false, roles: ['technician'] },
  { id: 'nt-8', type: 'revenue', title: 'Daily revenue report ready', body: 'Yesterday: $4,812 across 9 stations (+6.2% DoD).', time: '2026-07-30T07:00:00', read: true, roles: ['operator', 'admin'] },
  { id: 'nt-9', type: 'fleet', title: 'Vehicle VN-114 low battery', body: 'Delivery van VN-114 is at 12% and 18 mi from depot.', time: '2026-07-30T17:35:00', read: false, roles: ['fleet'] },
  { id: 'nt-10', type: 'billing', title: 'July invoice available', body: 'Fleet invoice INV-2026-07 ($12,480.20) is ready for review.', time: '2026-07-29T08:00:00', read: true, roles: ['fleet', 'admin'] },
]
