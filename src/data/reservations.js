/**
 * Reservation entity (SRS §7.1) — id, user, connector, time window and status.
 * status: RESERVED | ACTIVE | EXPIRED | CANCELLED
 *
 * Plus the live virtual waitlist (SRS §3, Slot Reservation) that a driver joins
 * when every window at a station is already booked.
 */

export const reservations = [
  {
    id: 'RS-2041',
    userId: 'u-1001',
    stationId: 'st-01',
    connectorId: 'st-01-c11',
    connectorLabel: 'A1',
    date: '2026-07-31',
    startTime: '09:00 AM',
    endTime: '09:30 AM',
    status: 'RESERVED',
  },
  {
    id: 'RS-2043',
    userId: 'u-1001',
    stationId: 'st-02',
    connectorId: 'st-02-c13',
    connectorLabel: 'A3',
    date: '2026-08-01',
    startTime: '02:00 PM',
    endTime: '02:30 PM',
    status: 'RESERVED',
  },
  {
    id: 'RS-2044',
    userId: 'u-1001',
    stationId: 'st-06',
    connectorId: 'st-06-c12',
    connectorLabel: 'A2',
    date: '2026-08-02',
    startTime: '11:30 AM',
    endTime: '12:00 PM',
    status: 'RESERVED',
  },
  {
    id: 'RS-2038',
    userId: 'u-1001',
    stationId: 'st-03',
    connectorId: 'st-03-c21',
    connectorLabel: 'B1',
    date: '2026-07-30',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    status: 'ACTIVE',
  },
  {
    id: 'RS-2029',
    userId: 'u-1001',
    stationId: 'st-04',
    connectorId: 'st-04-c15',
    connectorLabel: 'A5',
    date: '2026-07-26',
    startTime: '01:00 PM',
    endTime: '01:30 PM',
    status: 'EXPIRED',
  },
  {
    id: 'RS-2022',
    userId: 'u-1001',
    stationId: 'st-08',
    connectorId: 'st-08-c12',
    connectorLabel: 'A2',
    date: '2026-07-22',
    startTime: '09:30 AM',
    endTime: '10:00 AM',
    status: 'CANCELLED',
  },
  {
    id: 'RS-2018',
    userId: 'u-1001',
    stationId: 'st-01',
    connectorId: 'st-01-c14',
    connectorLabel: 'A4',
    date: '2026-07-18',
    startTime: '12:00 PM',
    endTime: '12:30 PM',
    status: 'EXPIRED',
  },
  // Other drivers — kept so operator-side views have a realistic book of reservations.
  {
    id: 'RS-2045',
    userId: 'u-1002',
    stationId: 'st-01',
    connectorId: 'st-01-c12',
    connectorLabel: 'A2',
    date: '2026-07-31',
    startTime: '09:30 AM',
    endTime: '10:00 AM',
    status: 'RESERVED',
  },
  {
    id: 'RS-2046',
    userId: 'u-1006',
    stationId: 'st-03',
    connectorId: 'st-03-c11',
    connectorLabel: 'A1',
    date: '2026-07-31',
    startTime: '10:30 AM',
    endTime: '11:00 AM',
    status: 'RESERVED',
  },
]

/**
 * Live virtual waitlist. Position 1 is promoted automatically when a bay frees up.
 */
export const waitlistEntries = [
  {
    id: 'WL-118',
    userId: 'u-1001',
    stationId: 'st-03',
    date: '2026-08-01',
    window: '05:00 PM – 05:30 PM',
    position: 2,
    aheadOf: 1,
    notifyOnFree: true,
  },
  {
    id: 'WL-121',
    userId: 'u-1001',
    stationId: 'st-05',
    date: '2026-08-03',
    window: '08:30 AM – 09:00 AM',
    position: 1,
    aheadOf: 0,
    notifyOnFree: false,
  },
  {
    id: 'WL-124',
    userId: 'u-1002',
    stationId: 'st-03',
    date: '2026-08-01',
    window: '05:00 PM – 05:30 PM',
    position: 1,
    aheadOf: 0,
    notifyOnFree: true,
  },
]
