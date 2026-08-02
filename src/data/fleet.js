export const fleetVehicles = [
  { id: 'VN-101', model: 'Ford E-Transit', driver: 'A. Brooks', soc: 84, rangeKm: 212, status: 'active', location: 'Route 12 · Downtown', odometer: 48210, health: 96, nextService: '2026-09-04' },
  { id: 'VN-102', model: 'Ford E-Transit', driver: 'K. Silva', soc: 66, rangeKm: 168, status: 'active', location: 'Route 4 · SoMa', odometer: 51930, health: 93, nextService: '2026-08-21' },
  { id: 'VN-104', model: 'Rivian EDV 700', driver: 'J. Malone', soc: 41, rangeKm: 130, status: 'active', location: 'Route 9 · Richmond', odometer: 30125, health: 98, nextService: '2026-10-11' },
  { id: 'VN-107', model: 'Rivian EDV 700', driver: '—', soc: 100, rangeKm: 322, status: 'charging', location: 'Depot · Bay 2', odometer: 27840, health: 97, nextService: '2026-10-02' },
  { id: 'VN-109', model: 'Mercedes eSprinter', driver: 'T. Nguyen', soc: 58, rangeKm: 150, status: 'active', location: 'Route 2 · Mission', odometer: 61470, health: 89, nextService: '2026-08-08' },
  { id: 'VN-110', model: 'Mercedes eSprinter', driver: '—', soc: 34, rangeKm: 86, status: 'charging', location: 'Depot · Bay 5', odometer: 59210, health: 91, nextService: '2026-08-30' },
  { id: 'VN-112', model: 'Ford E-Transit', driver: 'R. Adeyemi', soc: 73, rangeKm: 184, status: 'active', location: 'Route 7 · Sunset', odometer: 44890, health: 95, nextService: '2026-09-15' },
  { id: 'VN-114', model: 'Rivian EDV 500', driver: 'M. Petrov', soc: 12, rangeKm: 38, status: 'active', location: 'Route 5 · Bayview', odometer: 38560, health: 94, nextService: '2026-09-27' },
  { id: 'VN-115', model: 'Rivian EDV 500', driver: '—', soc: 91, rangeKm: 288, status: 'idle', location: 'Depot · Lot A', odometer: 25110, health: 99, nextService: '2026-11-05' },
  { id: 'VN-118', model: 'BrightDrop Zevo 600', driver: '—', soc: 0, rangeKm: 0, status: 'maintenance', location: 'Service center', odometer: 66890, health: 71, nextService: 'In service', },
  { id: 'VN-120', model: 'BrightDrop Zevo 600', driver: 'C. Dubois', soc: 47, rangeKm: 128, status: 'active', location: 'Route 1 · Marina', odometer: 41220, health: 92, nextService: '2026-09-09' },
  { id: 'VN-121', model: 'Ford E-Transit', driver: '—', soc: 88, rangeKm: 224, status: 'idle', location: 'Depot · Lot A', odometer: 19450, health: 98, nextService: '2026-12-01' },
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
