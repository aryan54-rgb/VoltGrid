export const stations = [
  {
    id: 'st-01',
    name: 'Volta Plaza Supercharge',
    address: '1201 Market Street',
    city: 'San Francisco, CA',
    rating: 4.8,
    reviews: 214,
    pricePerKwh: 0.42,
    status: 'online',
    latitude: 37.7784, longitude: -122.4148,
    connectors: [
      { type: 'CCS2', power: 250, total: 8, available: 5 },
      { type: 'CHAdeMO', power: 100, total: 2, available: 1 },
    ],
    amenities: ['Cafe', 'WiFi', 'Restrooms', 'Lounge', '24/7'],
    hours: 'Open 24 hours',
    operator: 'VoltGrid Network',
    utilization: 72,
  },
  {
    id: 'st-02',
    name: 'Harborview Charging Hub',
    address: '88 Embarcadero Blvd',
    city: 'San Francisco, CA',
    rating: 4.6,
    reviews: 158,
    pricePerKwh: 0.38,
    status: 'online',
    latitude: 37.7955, longitude: -122.3937,
    connectors: [
      { type: 'CCS2', power: 150, total: 6, available: 2 },
      { type: 'Type 2', power: 22, total: 4, available: 4 },
    ],
    amenities: ['Restrooms', 'Shopping', 'WiFi'],
    hours: '6:00 AM – 11:00 PM',
    operator: 'ChargeWest',
    utilization: 64,
  },
  {
    id: 'st-03',
    name: 'Greenline Depot',
    address: '450 Mission Rock St',
    city: 'San Francisco, CA',
    rating: 4.4,
    reviews: 96,
    pricePerKwh: 0.35,
    status: 'in-use',
    latitude: 37.7706, longitude: -122.3893,
    connectors: [
      { type: 'CCS2', power: 350, total: 4, available: 0 },
      { type: 'Type 2', power: 11, total: 6, available: 3 },
    ],
    amenities: ['Cafe', '24/7', 'Covered'],
    hours: 'Open 24 hours',
    operator: 'VoltGrid Network',
    utilization: 91,
  },
  {
    id: 'st-04',
    name: 'Sunset Park & Charge',
    address: '2210 Judah Street',
    city: 'San Francisco, CA',
    rating: 4.2,
    reviews: 61,
    pricePerKwh: 0.31,
    status: 'online',
    latitude: 37.7614, longitude: -122.4835,
    connectors: [{ type: 'Type 2', power: 22, total: 10, available: 7 }],
    amenities: ['Park', 'Restrooms'],
    hours: '5:00 AM – midnight',
    operator: 'CityCharge',
    utilization: 43,
  },
  {
    id: 'st-05',
    name: 'Mission Bay Fast Lane',
    address: '700 Terry A Francois Blvd',
    city: 'San Francisco, CA',
    rating: 4.7,
    reviews: 183,
    pricePerKwh: 0.45,
    status: 'maintenance',
    latitude: 37.7702, longitude: -122.3873,
    connectors: [{ type: 'CCS2', power: 250, total: 6, available: 0 }],
    amenities: ['Lounge', 'WiFi', '24/7'],
    hours: 'Open 24 hours',
    operator: 'VoltGrid Network',
    utilization: 0,
  },
  {
    id: 'st-06',
    name: 'Presidio Gateway',
    address: '210 Lincoln Blvd',
    city: 'San Francisco, CA',
    rating: 4.5,
    reviews: 74,
    pricePerKwh: 0.4,
    status: 'online',
    latitude: 37.7989, longitude: -122.4662,
    connectors: [
      { type: 'CCS2', power: 150, total: 4, available: 3 },
      { type: 'CHAdeMO', power: 62, total: 2, available: 2 },
    ],
    amenities: ['Park', 'Cafe'],
    hours: '6:00 AM – 10:00 PM',
    operator: 'ChargeWest',
    utilization: 38,
  },
  {
    id: 'st-07',
    name: 'Dogpatch Power Yard',
    address: '990 22nd Street',
    city: 'San Francisco, CA',
    rating: 4.1,
    reviews: 42,
    pricePerKwh: 0.33,
    status: 'offline',
    latitude: 37.757, longitude: -122.3907,
    connectors: [{ type: 'CCS2', power: 100, total: 4, available: 0 }],
    amenities: ['Covered'],
    hours: 'Open 24 hours',
    operator: 'CityCharge',
    utilization: 0,
  },
  {
    id: 'st-08',
    name: 'Twin Peaks Vista Chargers',
    address: '74 Christmas Tree Point Rd',
    city: 'San Francisco, CA',
    rating: 4.9,
    reviews: 129,
    pricePerKwh: 0.44,
    status: 'online',
    latitude: 37.7544, longitude: -122.4477,
    connectors: [
      { type: 'CCS2', power: 250, total: 6, available: 4 },
      { type: 'Type 2', power: 22, total: 2, available: 1 },
    ],
    amenities: ['Vista', 'WiFi', '24/7'],
    hours: 'Open 24 hours',
    operator: 'VoltGrid Network',
    utilization: 57,
  },
]

export const chargers = stations.flatMap((s, si) =>
  s.connectors.flatMap((c, ci) =>
    Array.from({ length: c.total }, (_, i) => {
      const n = i + 1
      const statusPool =
        s.status === 'offline'
          ? ['offline']
          : s.status === 'maintenance'
            ? ['maintenance', 'offline']
            : i < c.available
              ? ['available']
              : ['in-use', 'in-use', 'faulted']
      return {
        id: `${s.id}-c${ci + 1}${n}`,
        stationId: s.id,
        stationName: s.name,
        label: `${['A', 'B', 'C'][ci]}${n}`,
        type: c.type,
        power: c.power,
        status: statusPool[(si + i) % statusPool.length],
        energyToday: Math.round(((si * 7 + i * 13) % 40) * 8.5),
        uptime: s.status === 'offline' ? 62.4 : 95 + ((si + i) % 5),
        lastService: `2026-0${(si % 6) + 1}-1${i % 3 + 1}`,
      }
    })
  )
)

export const timeSlots = [
  { id: 'ts-1', time: '09:00 AM', available: true },
  { id: 'ts-2', time: '09:30 AM', available: true },
  { id: 'ts-3', time: '10:00 AM', available: false },
  { id: 'ts-4', time: '10:30 AM', available: true },
  { id: 'ts-5', time: '11:00 AM', available: true },
  { id: 'ts-6', time: '11:30 AM', available: false },
  { id: 'ts-7', time: '12:00 PM', available: true },
  { id: 'ts-8', time: '12:30 PM', available: true },
  { id: 'ts-9', time: '01:00 PM', available: true },
  { id: 'ts-10', time: '01:30 PM', available: false },
  { id: 'ts-11', time: '02:00 PM', available: true },
  { id: 'ts-12', time: '02:30 PM', available: true },
]

/**
 * Connector entity (SRS §7.1) — the individual charging bay/port that is
 * reserved, occupied and billed. Derived from each station's declared connector
 * groups so bay counts always agree with the station cards.
 *
 * status: AVAILABLE | RESERVED | OCCUPIED | FAULTED
 */
export const connectors = stations.flatMap((s, si) =>
  s.connectors.flatMap((group, gi) =>
    Array.from({ length: group.total }, (_, i) => {
      const n = i + 1
      const label = `${['A', 'B', 'C'][gi]}${n}`
      // The first `available` bays of each group are free; the rest are in use,
      // with a deterministic slice reserved or faulted so every state is present.
      let status
      if (s.status === 'offline' || s.status === 'maintenance') status = 'FAULTED'
      else if (i < group.available) status = (si + i) % 4 === 3 ? 'RESERVED' : 'AVAILABLE'
      else status = (si + i) % 5 === 4 ? 'FAULTED' : 'OCCUPIED'

      return {
        id: `${s.id}-c${gi + 1}${n}`,
        stationId: s.id,
        stationName: s.name,
        label,
        type: group.type,
        powerKw: group.power,
        status,
        energyTodayKwh: Math.round(((si * 7 + i * 13) % 40) * 8.5),
        uptimePct: s.status === 'offline' ? 62.4 : 95 + ((si + i) % 5),
        lastServiced: `2026-0${(si % 6) + 1}-1${(i % 3) + 1}`,
      }
    })
  )
)

/** Every connector belonging to one station (SRS §7.1 Station → set of connectors). */
export function connectorsFor(stationId) {
  return connectors.filter((c) => c.stationId === stationId)
}
