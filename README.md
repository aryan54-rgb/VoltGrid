# VoltGrid ⚡

A frontend-only EV charging platform demo — a production-style SaaS dashboard with role-based workspaces, built entirely on mock data (no backend, no auth, no database).

## Stack

- **React 19** + **Vite**
- **Tailwind CSS v4** (CSS-variable design tokens, class-based dark mode)
- **shadcn/ui-style component kit** (Radix primitives: dialog, dropdown, tabs, select, switch, avatar, tooltip, progress)
- **React Router** (lazy-loaded routes)
- **Recharts** (validated, colorblind-safe chart palette)
- **Framer Motion** (subtle entrance/hover motion)
- **Lucide** icons

## Run it

```bash
npm install
npm run dev
```

## Workspaces

| Role | Route | Pages |
|---|---|---|
| Public | `/` | Landing, Login, Register |
| EV Driver | `/driver` | Dashboard, Stations, Station Details, Slot Booking, Active Session, History, Wallet, Transactions, Marketplace, Community, Notifications, Profile |
| Fleet Manager | `/fleet` | Dashboard, Vehicles, Analytics, Billing |
| Station Operator | `/operator` | Dashboard, Stations, Chargers, Reservations, Revenue |
| Technician | `/technician` | Dashboard, Tickets, Ticket Details, Maintenance History |
| Admin | `/admin` | Dashboard, Users, Stations, Marketplace, Reports, Analytics, Settings |

Switch workspaces from the user card at the bottom of the sidebar. Theme toggle lives in the top bar.

## Structure

```
src/
  components/ui/       shadcn-style primitives
  components/shared/   StatCard, ChartCard/ChartTooltip, MapPlaceholder, StatusBadge, …
  context/             theme provider
  data/                all mock JSON data
  layouts/             AppShell (sidebar + topbar), AuthLayout
  lib/                 utils, nav config
  pages/               public / driver / fleet / operator / technician / admin
```

Everything you see — sessions, revenue, tickets, notifications — is mock data from `src/data/`.
