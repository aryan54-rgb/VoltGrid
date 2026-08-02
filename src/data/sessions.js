export const activeSession = {
  id: 'cs-2041',
  stationId: 'st-01',
  stationName: 'Volta Plaza Supercharge',
  charger: 'A3 · CCS2 250 kW',
  vehicle: 'Tesla Model 3 LR',
  startedAt: '2026-07-30T18:42:00',
  startSoc: 24,
  currentSoc: 61,
  targetSoc: 90,
  powerKw: 187,
  energyKwh: 28.4,
  pricePerKwh: 0.42,
  estMinutesRemaining: 18,
  costSoFar: 11.93,
  // 5-min samples for the live power curve
  powerCurve: [
    { t: '18:42', kw: 62, soc: 24 },
    { t: '18:47', kw: 148, soc: 29 },
    { t: '18:52', kw: 201, soc: 35 },
    { t: '18:57', kw: 224, soc: 42 },
    { t: '19:02', kw: 218, soc: 48 },
    { t: '19:07', kw: 205, soc: 53 },
    { t: '19:12', kw: 193, soc: 57 },
    { t: '19:17', kw: 187, soc: 61 },
  ],
}

export const chargingHistory = [
  { id: 'cs-2040', station: 'Harborview Charging Hub', date: '2026-07-28T09:15:00', duration: '42 min', energy: 38.2, cost: 14.52, status: 'completed', connector: 'CCS2 150 kW' },
  { id: 'cs-2036', station: 'Volta Plaza Supercharge', date: '2026-07-25T19:05:00', duration: '31 min', energy: 41.7, cost: 17.51, status: 'completed', connector: 'CCS2 250 kW' },
  { id: 'cs-2029', station: 'Twin Peaks Vista Chargers', date: '2026-07-22T14:30:00', duration: '55 min', energy: 46.0, cost: 20.24, status: 'completed', connector: 'CCS2 250 kW' },
  { id: 'cs-2025', station: 'Greenline Depot', date: '2026-07-19T08:00:00', duration: '18 min', energy: 22.5, cost: 7.88, status: 'completed', connector: 'CCS2 350 kW' },
  { id: 'cs-2021', station: 'Sunset Park & Charge', date: '2026-07-16T17:45:00', duration: '2 h 10 min', energy: 29.4, cost: 9.11, status: 'completed', connector: 'Type 2 22 kW' },
  { id: 'cs-2017', station: 'Volta Plaza Supercharge', date: '2026-07-13T12:20:00', duration: '8 min', energy: 6.1, cost: 2.56, status: 'cancelled', connector: 'CCS2 250 kW' },
  { id: 'cs-2012', station: 'Presidio Gateway', date: '2026-07-10T10:05:00', duration: '47 min', energy: 39.8, cost: 15.92, status: 'completed', connector: 'CCS2 150 kW' },
  { id: 'cs-2008', station: 'Harborview Charging Hub', date: '2026-07-07T16:40:00', duration: '36 min', energy: 33.5, cost: 12.73, status: 'completed', connector: 'CCS2 150 kW' },
  { id: 'cs-2003', station: 'Mission Bay Fast Lane', date: '2026-07-03T20:15:00', duration: '25 min', energy: 30.9, cost: 13.91, status: 'completed', connector: 'CCS2 250 kW' },
  { id: 'cs-1998', station: 'Volta Plaza Supercharge', date: '2026-06-29T11:00:00', duration: '3 min', energy: 0.8, cost: 0.34, status: 'failed', connector: 'CHAdeMO 100 kW' },
  { id: 'cs-1994', station: 'Twin Peaks Vista Chargers', date: '2026-06-26T15:30:00', duration: '58 min', energy: 48.2, cost: 21.21, status: 'completed', connector: 'CCS2 250 kW' },
  { id: 'cs-1990', station: 'Greenline Depot', date: '2026-06-22T07:50:00', duration: '21 min', energy: 26.7, cost: 9.35, status: 'completed', connector: 'CCS2 350 kW' },
]

// monthly energy + spend for history charts
export const monthlyUsage = [
  { month: 'Feb', energy: 182, cost: 71 },
  { month: 'Mar', energy: 224, cost: 88 },
  { month: 'Apr', energy: 198, cost: 79 },
  { month: 'May', energy: 261, cost: 104 },
  { month: 'Jun', energy: 243, cost: 96 },
  { month: 'Jul', energy: 287, cost: 114 },
]

export const driverBookings = [
  { id: 'bk-501', station: 'Volta Plaza Supercharge', charger: 'A3 · CCS2 250 kW', date: '2026-07-31', time: '09:30 AM', status: 'confirmed' },
  { id: 'bk-498', station: 'Harborview Charging Hub', charger: 'A1 · CCS2 150 kW', date: '2026-08-02', time: '02:00 PM', status: 'pending' },
]
