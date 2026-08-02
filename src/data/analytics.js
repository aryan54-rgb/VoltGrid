// ---- Operator / revenue ----
export const revenueByDay = [
  { day: 'Jul 16', revenue: 4120, energy: 9820, sessions: 296 },
  { day: 'Jul 17', revenue: 4380, energy: 10430, sessions: 312 },
  { day: 'Jul 18', revenue: 4910, energy: 11690, sessions: 348 },
  { day: 'Jul 19', revenue: 5240, energy: 12480, sessions: 371 },
  { day: 'Jul 20', revenue: 4720, energy: 11240, sessions: 334 },
  { day: 'Jul 21', revenue: 4180, energy: 9950, sessions: 301 },
  { day: 'Jul 22', revenue: 4450, energy: 10600, sessions: 318 },
  { day: 'Jul 23', revenue: 4610, energy: 10980, sessions: 327 },
  { day: 'Jul 24', revenue: 4890, energy: 11640, sessions: 342 },
  { day: 'Jul 25', revenue: 5310, energy: 12640, sessions: 379 },
  { day: 'Jul 26', revenue: 5480, energy: 13050, sessions: 388 },
  { day: 'Jul 27', revenue: 4960, energy: 11810, sessions: 351 },
  { day: 'Jul 28', revenue: 4530, energy: 10790, sessions: 322 },
  { day: 'Jul 29', revenue: 4812, energy: 11460, sessions: 339 },
]

export const revenueByStation = [
  { station: 'Volta Plaza', revenue: 38200 },
  { station: 'Greenline Depot', revenue: 29400 },
  { station: 'Harborview Hub', revenue: 26800 },
  { station: 'Twin Peaks Vista', revenue: 21500 },
  { station: 'Mission Bay', revenue: 14200 },
  { station: 'Presidio Gateway', revenue: 11900 },
  { station: 'Sunset Park', revenue: 8400 },
  { station: 'Dogpatch Yard', revenue: 5100 },
]

export const sessionsByHour = [
  { hour: '12a', sessions: 14 }, { hour: '2a', sessions: 8 }, { hour: '4a', sessions: 6 },
  { hour: '6a', sessions: 24 }, { hour: '8a', sessions: 62 }, { hour: '10a', sessions: 48 },
  { hour: '12p', sessions: 55 }, { hour: '2p', sessions: 51 }, { hour: '4p', sessions: 68 },
  { hour: '6p', sessions: 81 }, { hour: '8p', sessions: 47 }, { hour: '10p', sessions: 26 },
]

export const reservationsList = [
  { id: 'rs-701', customer: 'Maya Chen', station: 'Volta Plaza Supercharge', charger: 'A5', date: '2026-07-31', time: '08:30 AM', status: 'confirmed' },
  { id: 'rs-702', customer: 'Jordan Lee', station: 'Volta Plaza Supercharge', charger: 'A3', date: '2026-07-31', time: '09:30 AM', status: 'confirmed' },
  { id: 'rs-703', customer: 'Swift Logistics (fleet)', station: 'Greenline Depot', charger: 'A1–A2', date: '2026-07-31', time: '10:00 PM', status: 'confirmed' },
  { id: 'rs-704', customer: 'Grace Kim', station: 'Harborview Charging Hub', charger: 'A2', date: '2026-07-31', time: '11:00 AM', status: 'pending' },
  { id: 'rs-705', customer: 'Diego Ramírez', station: 'Twin Peaks Vista Chargers', charger: 'A1', date: '2026-08-01', time: '07:30 AM', status: 'confirmed' },
  { id: 'rs-706', customer: 'Nina Rossi', station: 'Volta Plaza Supercharge', charger: 'A6', date: '2026-08-01', time: '01:00 PM', status: 'pending' },
  { id: 'rs-707', customer: 'Sam Okafor', station: 'Presidio Gateway', charger: 'B1', date: '2026-08-01', time: '03:30 PM', status: 'confirmed' },
  { id: 'rs-708', customer: 'Tom Becker', station: 'Harborview Charging Hub', charger: 'A4', date: '2026-08-02', time: '09:00 AM', status: 'cancelled' },
]

// ---- Admin / platform ----
export const platformGrowth = [
  { month: 'Feb', users: 8200, sessions: 24100 },
  { month: 'Mar', users: 9100, sessions: 26800 },
  { month: 'Apr', users: 10050, sessions: 29900 },
  { month: 'May', users: 11400, sessions: 33400 },
  { month: 'Jun', users: 12900, sessions: 37800 },
  { month: 'Jul', users: 14600, sessions: 42600 },
]

export const revenueBySegment = [
  { month: 'Feb', drivers: 84, fleet: 46, marketplace: 12 },
  { month: 'Mar', drivers: 92, fleet: 51, marketplace: 14 },
  { month: 'Apr', drivers: 101, fleet: 55, marketplace: 15 },
  { month: 'May', drivers: 116, fleet: 61, marketplace: 19 },
  { month: 'Jun', drivers: 128, fleet: 68, marketplace: 22 },
  { month: 'Jul', drivers: 143, fleet: 74, marketplace: 26 },
]

export const energyMix = [
  { name: 'Solar PPA', value: 38 },
  { name: 'Wind PPA', value: 27 },
  { name: 'Grid (renewable)', value: 21 },
  { name: 'Grid (standard)', value: 14 },
]

export const regionPerformance = [
  { region: 'SF Bay Area', stations: 9, uptime: 98.2, revenue: 155500, growth: 8.4 },
  { region: 'Los Angeles', stations: 14, uptime: 97.6, revenue: 214800, growth: 11.2 },
  { region: 'Seattle', stations: 6, uptime: 99.1, revenue: 98400, growth: 6.8 },
  { region: 'Austin', stations: 5, uptime: 96.9, revenue: 76200, growth: 14.6 },
  { region: 'Denver', stations: 4, uptime: 98.8, revenue: 61800, growth: 9.3 },
]
