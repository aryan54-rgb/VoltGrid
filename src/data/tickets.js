/**
 * FaultTicket entity (SRS §7.1) — id, station, reporter, status and SLA timestamps.
 *
 * priority: LOW | MEDIUM | HIGH | CRITICAL
 * status:   OPEN | ASSIGNED | IN_PROGRESS | RESOLVED
 * source:   DRIVER_REPORT | KIOSK_EMULATOR | PM_SCHEDULE | FIELD_INSPECTION
 *
 * Tickets sourced from KIOSK_EMULATOR carry a `faultCode` and are raised
 * automatically the moment a charger reports it (SRS §2.6, §4.2).
 */

/** Response-time SLA per priority, in hours (SRS §9 — SLA-based assignment). */
export const SLA_HOURS = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
}

/** Categories a driver can pick when reporting a fault from the app. */
export const faultCategories = [
  'Connector will not unlock',
  'Charging never starts',
  'Session stopped unexpectedly',
  'Screen or kiosk unresponsive',
  'Payment or card reader problem',
  'Physical damage to cable or bay',
  'Bay blocked or inaccessible',
  'Other',
]

export const tickets = [
  {
    id: 'TK-1042',
    title: 'Connector lock failure on bay A1',
    stationId: 'st-02',
    stationName: 'Harborview Charging Hub',
    connectorId: 'st-02-c11',
    connectorLabel: 'A1',
    faultCode: 'E-231',
    priority: 'HIGH',
    status: 'ASSIGNED',
    source: 'KIOSK_EMULATOR',
    reporter: 'Kiosk telemetry',
    assignedTo: 'Alex Turner',
    reportedAt: '2026-07-30T14:50:00',
    slaDueAt: '2026-07-30T22:50:00',
    description:
      'Connector latch does not release after session end. Two customer complaints in the last 6 hours. Remote unlock command times out.',
    parts: ['Latch actuator (CCS2-LA-04)', 'Wiring harness'],
    activity: [
      { at: '2026-07-30T14:50:00', who: 'System', what: 'Ticket created from fault code E-231' },
      { at: '2026-07-30T14:55:00', who: 'Dispatch', what: 'Assigned to Alex Turner' },
      { at: '2026-07-30T15:20:00', who: 'Alex Turner', what: 'Acknowledged, ETA tomorrow 8:00 AM' },
    ],
  },
  {
    id: 'TK-1041',
    title: 'Isolation fault — bay A2 offline',
    stationId: 'st-07',
    stationName: 'Dogpatch Power Yard',
    connectorId: 'st-07-c12',
    connectorLabel: 'A2',
    faultCode: 'E-402',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    source: 'KIOSK_EMULATOR',
    reporter: 'Kiosk telemetry',
    assignedTo: 'Alex Turner',
    reportedAt: '2026-07-30T18:20:00',
    slaDueAt: '2026-07-30T22:20:00',
    description:
      'DC isolation monitor tripped (fault E-402). Cabinet locked out. Site is fully offline as A2 shares the power cabinet with A1.',
    parts: ['Isolation monitor module (IMD-9)'],
    activity: [
      { at: '2026-07-30T18:20:00', who: 'System', what: 'Ticket created from fault code E-402' },
      { at: '2026-07-30T18:31:00', who: 'Dispatch', what: 'Escalated to critical — full site outage' },
      { at: '2026-07-30T19:05:00', who: 'Alex Turner', what: 'On site. Confirmed IMD failure, sourcing module.' },
    ],
  },
  {
    id: 'TK-1039',
    title: 'Screen unresponsive at bay A2',
    stationId: 'st-01',
    stationName: 'Volta Plaza Supercharge',
    connectorId: 'st-01-c12',
    connectorLabel: 'A2',
    faultCode: null,
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    source: 'DRIVER_REPORT',
    reporter: 'Jordan Lee (driver)',
    assignedTo: 'Alex Turner',
    reportedAt: '2026-07-29T10:12:00',
    slaDueAt: '2026-07-30T10:12:00',
    description:
      'Touchscreen frozen on boot logo. Charging still works via app start. Likely HMI board or SD corruption.',
    parts: ['HMI controller board'],
    activity: [
      { at: '2026-07-29T10:12:00', who: 'Support', what: 'Ticket created from driver report' },
      { at: '2026-07-29T11:00:00', who: 'Dispatch', what: 'Assigned to Alex Turner' },
      { at: '2026-07-30T09:15:00', who: 'Alex Turner', what: 'Remote reboot failed, HMI board ordered' },
    ],
  },
  {
    id: 'TK-1038',
    title: 'Session stopped after two minutes',
    stationId: 'st-03',
    stationName: 'Greenline Depot',
    connectorId: 'st-03-c21',
    connectorLabel: 'B1',
    faultCode: null,
    priority: 'MEDIUM',
    status: 'OPEN',
    source: 'DRIVER_REPORT',
    reporter: 'Jordan Lee (driver)',
    assignedTo: 'Awaiting dispatch',
    reportedAt: '2026-07-30T08:05:00',
    slaDueAt: '2026-07-31T08:05:00',
    description:
      'Charge started normally then cut out at roughly 2 kWh. Retried twice with the same result; the bay then showed as available again.',
    parts: [],
    activity: [
      { at: '2026-07-30T08:05:00', who: 'Jordan Lee', what: 'Fault reported from the driver app' },
    ],
  },
  {
    id: 'TK-1036',
    title: 'Preventive maintenance — quarterly inspection',
    stationId: 'st-08',
    stationName: 'Twin Peaks Vista Chargers',
    connectorId: null,
    connectorLabel: 'All bays',
    faultCode: null,
    priority: 'LOW',
    status: 'OPEN',
    source: 'PM_SCHEDULE',
    reporter: 'Maintenance schedule',
    assignedTo: 'Omar Haddad',
    reportedAt: '2026-07-28T08:00:00',
    slaDueAt: '2026-07-31T08:00:00',
    description:
      'Q3 preventive maintenance: torque checks, filter swap, coolant level, cable abrasion inspection, ground continuity test on all 8 bays.',
    parts: ['Air filter kit ×6', 'Coolant (5L)'],
    activity: [
      { at: '2026-07-28T08:00:00', who: 'System', what: 'Auto-generated from PM schedule' },
    ],
  },
  {
    id: 'TK-1033',
    title: 'Cable abrasion beyond tolerance',
    stationId: 'st-03',
    stationName: 'Greenline Depot',
    connectorId: 'st-03-c14',
    connectorLabel: 'A4',
    faultCode: null,
    priority: 'MEDIUM',
    status: 'OPEN',
    source: 'FIELD_INSPECTION',
    reporter: 'Alex Turner',
    assignedTo: 'Awaiting dispatch',
    reportedAt: '2026-07-27T16:40:00',
    slaDueAt: '2026-07-28T16:40:00',
    description:
      'Outer jacket abrasion 40cm from connector head. No conductor exposure yet. Replace cable assembly within 7 days.',
    parts: ['350kW liquid-cooled cable assembly'],
    activity: [{ at: '2026-07-27T16:40:00', who: 'Alex Turner', what: 'Logged during PM visit' }],
  },
  {
    id: 'TK-1029',
    title: 'Payment terminal offline',
    stationId: 'st-04',
    stationName: 'Sunset Park & Charge',
    connectorId: null,
    connectorLabel: 'Kiosk',
    faultCode: 'E-660',
    priority: 'HIGH',
    status: 'RESOLVED',
    source: 'KIOSK_EMULATOR',
    reporter: 'Kiosk telemetry',
    assignedTo: 'Alex Turner',
    reportedAt: '2026-07-24T09:30:00',
    slaDueAt: '2026-07-24T17:30:00',
    resolvedAt: '2026-07-24T15:45:00',
    description:
      'Card reader NFC module not responding. Replaced terminal modem and re-provisioned SIM.',
    parts: ['LTE modem'],
    activity: [
      { at: '2026-07-24T09:30:00', who: 'System', what: 'Ticket created from fault code E-660' },
      { at: '2026-07-24T13:10:00', who: 'Alex Turner', what: 'On site, diagnosed dead modem' },
      { at: '2026-07-24T15:45:00', who: 'Alex Turner', what: 'Replaced modem, terminal back online. Resolved.' },
    ],
  },
]


