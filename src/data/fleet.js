export const fleetVehicles = [
  { id: 'VN-101', driverId: 'fd-01', model: 'Ford E-Transit', driver: 'A. Brooks', soc: 84, rangeKm: 212, status: 'active', location: 'Route 12 · Downtown', odometer: 48210, health: 96, nextService: '2026-09-04' },
  { id: 'VN-102', driverId: 'fd-02', model: 'Ford E-Transit', driver: 'K. Silva', soc: 66, rangeKm: 168, status: 'active', location: 'Route 4 · SoMa', odometer: 51930, health: 93, nextService: '2026-08-21' },
  { id: 'VN-104', driverId: 'fd-03', model: 'Rivian EDV 700', driver: 'J. Malone', soc: 41, rangeKm: 130, status: 'active', location: 'Route 9 · Richmond', odometer: 30125, health: 98, nextService: '2026-10-11' },
  { id: 'VN-107', driverId: null, model: 'Rivian EDV 700', driver: '—', soc: 100, rangeKm: 322, status: 'charging', location: 'Depot · Bay 2', odometer: 27840, health: 97, nextService: '2026-10-02' },
  { id: 'VN-109', driverId: 'fd-04', model: 'Mercedes eSprinter', driver: 'T. Nguyen', soc: 58, rangeKm: 150, status: 'active', location: 'Route 2 · Mission', odometer: 61470, health: 89, nextService: '2026-08-08' },
  { id: 'VN-110', driverId: null, model: 'Mercedes eSprinter', driver: '—', soc: 34, rangeKm: 86, status: 'charging', location: 'Depot · Bay 5', odometer: 59210, health: 91, nextService: '2026-08-30' },
  { id: 'VN-112', driverId: 'fd-05', model: 'Ford E-Transit', driver: 'R. Adeyemi', soc: 73, rangeKm: 184, status: 'active', location: 'Route 7 · Sunset', odometer: 44890, health: 95, nextService: '2026-09-15' },
  { id: 'VN-114', driverId: 'fd-06', model: 'Rivian EDV 500', driver: 'M. Petrov', soc: 12, rangeKm: 38, status: 'active', location: 'Route 5 · Bayview', odometer: 38560, health: 94, nextService: '2026-09-27' },
  { id: 'VN-115', driverId: null, model: 'Rivian EDV 500', driver: '—', soc: 91, rangeKm: 288, status: 'idle', location: 'Depot · Lot A', odometer: 25110, health: 99, nextService: '2026-11-05' },
  { id: 'VN-118', driverId: null, model: 'BrightDrop Zevo 600', driver: '—', soc: 0, rangeKm: 0, status: 'maintenance', location: 'Service center', odometer: 66890, health: 71, nextService: 'In service', },
  { id: 'VN-120', driverId: 'fd-07', model: 'BrightDrop Zevo 600', driver: 'C. Dubois', soc: 47, rangeKm: 128, status: 'active', location: 'Route 1 · Marina', odometer: 41220, health: 92, nextService: '2026-09-09' },
  { id: 'VN-121', driverId: null, model: 'Ford E-Transit', driver: '—', soc: 88, rangeKm: 224, status: 'idle', location: 'Depot · Lot A', odometer: 19450, health: 98, nextService: '2026-12-01' },
]

export const fleetEnergyByWeek = [
  { week: 'Jun 8', depot: 2140, public: 620 },
  { week: 'Jun 15', depot: 2260, public: 540 },
  { week: 'Jun 22', depot: 2080, public: 710 },
  { week: 'Jun 29', depot: 2390, public: 660 },
  { week: 'Jul 6', depot: 2310, public: 590 },
  { week: 'Jul 13', depot: 2450, public: 720 },
  { week: 'Jul 20', depot: 2520, public: 680 },
  { week: 'Jul 27', depot: 2610, public: 750 },
]

export const fleetCostPerVehicle = [
  { id: 'VN-109', cost: 412 },
  { id: 'VN-102', cost: 388 },
  { id: 'VN-120', cost: 356 },
  { id: 'VN-101', cost: 331 },
  { id: 'VN-112', cost: 305 },
  { id: 'VN-114', cost: 288 },
  { id: 'VN-104', cost: 262 },
  { id: 'VN-110', cost: 231 },
]

export const fleetUtilization = [
  { month: 'Feb', utilization: 68, downtime: 6.2 },
  { month: 'Mar', utilization: 71, downtime: 5.1 },
  { month: 'Apr', utilization: 74, downtime: 4.4 },
  { month: 'May', utilization: 72, downtime: 4.9 },
  { month: 'Jun', utilization: 78, downtime: 3.6 },
  { month: 'Jul', utilization: 81, downtime: 2.9 },
]

export const invoices = [
  { id: 'INV-2026-07', period: 'July 2026', amount: 12480.2, sessions: 342, energy: 9860, status: 'pending', due: '2026-08-15' },
  { id: 'INV-2026-06', period: 'June 2026', amount: 11216.75, sessions: 315, energy: 8940, status: 'paid', due: '2026-07-15' },
  { id: 'INV-2026-05', period: 'May 2026', amount: 11987.4, sessions: 330, energy: 9420, status: 'paid', due: '2026-06-15' },
  { id: 'INV-2026-04', period: 'April 2026', amount: 10432.1, sessions: 298, energy: 8310, status: 'paid', due: '2026-05-15' },
  { id: 'INV-2026-03', period: 'March 2026', amount: 11020.0, sessions: 305, energy: 8720, status: 'paid', due: '2026-04-15' },
  { id: 'INV-2026-02', period: 'February 2026', amount: 9865.3, sessions: 276, energy: 7810, status: 'overdue', due: '2026-03-15' },
]

export const costBreakdown = [
  { name: 'Depot charging', value: 7420 },
  { name: 'Public fast charging', value: 3180 },
  { name: 'Memberships', value: 940 },
  { name: 'Idle fees', value: 540 },
  { name: 'Other', value: 400 },
]

/**
 * Fleet drivers (SRS §3 — Fleet Management: manage fleet vehicles and drivers).
 * `assignedVehicle` holds a fleetVehicles id, or null when the driver has no van.
 * status: ON_DUTY | OFF_DUTY | ON_LEAVE
 */
export const fleetDrivers = [
  { id: 'fd-01', name: 'Alice Brooks', email: 'a.brooks@swiftlogistics.com', licence: 'DL-448210', assignedVehicle: 'VN-101', shift: 'Morning', status: 'ON_DUTY', sessionsThisMonth: 38, energyKwh: 1420, safetyScore: 96 },
  { id: 'fd-02', name: 'Karim Silva', email: 'k.silva@swiftlogistics.com', licence: 'DL-517903', assignedVehicle: 'VN-102', shift: 'Morning', status: 'ON_DUTY', sessionsThisMonth: 41, energyKwh: 1585, safetyScore: 92 },
  { id: 'fd-03', name: 'Jesse Malone', email: 'j.malone@swiftlogistics.com', licence: 'DL-301256', assignedVehicle: 'VN-104', shift: 'Evening', status: 'ON_DUTY', sessionsThisMonth: 34, energyKwh: 1288, safetyScore: 88 },
  { id: 'fd-04', name: 'Thanh Nguyen', email: 't.nguyen@swiftlogistics.com', licence: 'DL-614702', assignedVehicle: 'VN-109', shift: 'Evening', status: 'ON_DUTY', sessionsThisMonth: 29, energyKwh: 1104, safetyScore: 94 },
  { id: 'fd-05', name: 'Rachel Adeyemi', email: 'r.adeyemi@swiftlogistics.com', licence: 'DL-448915', assignedVehicle: 'VN-112', shift: 'Night', status: 'ON_DUTY', sessionsThisMonth: 45, energyKwh: 1712, safetyScore: 97 },
  { id: 'fd-06', name: 'Mikhail Petrov', email: 'm.petrov@swiftlogistics.com', licence: 'DL-385604', assignedVehicle: 'VN-114', shift: 'Night', status: 'ON_DUTY', sessionsThisMonth: 31, energyKwh: 1190, safetyScore: 85 },
  { id: 'fd-07', name: 'Camille Dubois', email: 'c.dubois@swiftlogistics.com', licence: 'DL-412208', assignedVehicle: 'VN-120', shift: 'Morning', status: 'ON_DUTY', sessionsThisMonth: 27, energyKwh: 998, safetyScore: 91 },
  { id: 'fd-08', name: 'Owen Hartley', email: 'o.hartley@swiftlogistics.com', licence: 'DL-229471', assignedVehicle: null, shift: 'Relief', status: 'OFF_DUTY', sessionsThisMonth: 12, energyKwh: 430, safetyScore: 89 },
  { id: 'fd-09', name: 'Bianca Rossi', email: 'b.rossi@swiftlogistics.com', licence: 'DL-706133', assignedVehicle: null, shift: 'Relief', status: 'OFF_DUTY', sessionsThisMonth: 9, energyKwh: 318, safetyScore: 93 },
  { id: 'fd-10', name: 'Dmitri Vasquez', email: 'd.vasquez@swiftlogistics.com', licence: 'DL-560019', assignedVehicle: null, shift: 'Morning', status: 'ON_LEAVE', sessionsThisMonth: 0, energyKwh: 0, safetyScore: 90 },
  { id: 'fd-11', name: 'Hana Yoshida', email: 'h.yoshida@swiftlogistics.com', licence: 'DL-883740', assignedVehicle: null, shift: 'Evening', status: 'OFF_DUTY', sessionsThisMonth: 18, energyKwh: 654, safetyScore: 95 },
]

/** Site power ceiling the depot must stay under while charging overnight. */
export const depotPowerLimitKw = 300

/**
 * Overnight depot charging windows (SRS §3 — Fleet Management: bulk scheduling).
 * Times are 24h local; a window runs inside the 20:00 → 06:00 depot window.
 * status: SCHEDULED | CHARGING | COMPLETED | CANCELLED
 */
export const chargingSchedule = [
  { id: 'SCH-401', vehicleId: 'VN-107', connectorLabel: 'A1', start: '20:00', end: '22:00', targetSocPct: 90, status: 'COMPLETED', night: '2026-07-30' },
  { id: 'SCH-402', vehicleId: 'VN-110', connectorLabel: 'A2', start: '20:30', end: '23:00', targetSocPct: 90, status: 'COMPLETED', night: '2026-07-30' },
  { id: 'SCH-403', vehicleId: 'VN-115', connectorLabel: 'A3', start: '21:15', end: '23:15', targetSocPct: 80, status: 'CHARGING', night: '2026-07-30' },
  { id: 'SCH-404', vehicleId: 'VN-121', connectorLabel: 'A4', start: '22:00', end: '00:00', targetSocPct: 90, status: 'SCHEDULED', night: '2026-07-30' },
  { id: 'SCH-405', vehicleId: 'VN-114', connectorLabel: 'A1', start: '23:00', end: '01:30', targetSocPct: 100, status: 'SCHEDULED', night: '2026-07-30' },
  { id: 'SCH-406', vehicleId: 'VN-102', connectorLabel: 'A2', start: '00:00', end: '02:00', targetSocPct: 90, status: 'SCHEDULED', night: '2026-07-30' },
  { id: 'SCH-407', vehicleId: 'VN-118', connectorLabel: 'A3', start: '01:00', end: '03:00', targetSocPct: 80, status: 'CANCELLED', night: '2026-07-30' },
  { id: 'SCH-411', vehicleId: 'VN-101', connectorLabel: 'A1', start: '20:00', end: '22:00', targetSocPct: 90, status: 'SCHEDULED', night: '2026-07-31' },
  { id: 'SCH-412', vehicleId: 'VN-104', connectorLabel: 'A2', start: '20:45', end: '23:00', targetSocPct: 90, status: 'SCHEDULED', night: '2026-07-31' },
  { id: 'SCH-413', vehicleId: 'VN-109', connectorLabel: 'A3', start: '21:30', end: '23:30', targetSocPct: 80, status: 'SCHEDULED', night: '2026-07-31' },
  { id: 'SCH-414', vehicleId: 'VN-120', connectorLabel: 'A4', start: '22:15', end: '00:15', targetSocPct: 90, status: 'SCHEDULED', night: '2026-07-31' },
  { id: 'SCH-415', vehicleId: 'VN-112', connectorLabel: 'A1', start: '23:30', end: '01:30', targetSocPct: 100, status: 'SCHEDULED', night: '2026-07-31' },
]
