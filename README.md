<div align="center">

# ⚡ VoltGrid

**An EV charging platform with four role-based workspaces, built on React 19 and Supabase.**

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-blue)](#-license)

</div>

---

## What this is

VoltGrid is a working prototype of an EV charging network: drivers find and book chargers,
station operators approve those bookings and run their sites, fleet managers schedule depot
charging, and admins oversee the estate.

It is a **full-stack application**, not a UI mockup. Every screen reads and writes a real
Postgres database through Supabase, behind real authentication and row-level security. The
files in `src/data/` are fixtures for the seed generator — the running app does not read them.

> **Built for:** SEML Assignment 2. Each functional module in the SRS maps to specific screens,
> and the `/modules` page in the app shows that traceability map.

---

## ✨ Highlights

| | |
| :-- | :-- |
| 🔐 **Real auth, real authorization** | Email/password and OAuth sign-in. Roles are enforced by Postgres RLS policies, not by hiding buttons — a driver cannot read another driver's reservations even with a crafted request. |
| 📍 **Live distance calculation** | Operators enter a station's true latitude/longitude; the driver app reads the browser's position and measures each station with the haversine formula, then sorts nearest-first. |
| ✅ **Operator booking approval** | A driver's booking lands as `PENDING` and holds the slot. A database trigger broadcasts it to operators, who approve or decline it from the Reservations board. |
| 🎨 **Design-token theming** | Tailwind v4 CSS variables with light/dark parity, colorblind-safe chart palettes, and status never signalled by colour alone. |
| ♿ **Accessible by construction** | Radix primitives for dialogs, dropdowns, selects and tabs — keyboard and screen-reader behaviour comes from the library, not from guesswork. |
| ⚡ **Lazy-loaded routes** | Every page is a separate chunk, so a driver never downloads the admin console. |

---

## 🛠 Tech stack

**Frontend** — [React 19](https://react.dev/) · [Vite](https://vite.dev/) · [React Router 7](https://reactrouter.com/) · [Tailwind CSS v4](https://tailwindcss.com/) · [Radix UI](https://www.radix-ui.com/) · [Recharts](https://recharts.org/) · [Framer Motion](https://www.framer.com/motion/) · [Lucide](https://lucide.dev/)

**Backend** — [Supabase](https://supabase.com/) (Postgres, Auth, Row Level Security)

**Tooling** — [oxlint](https://oxc.rs/)

---

## 🚀 Getting started

### Prerequisites

- **Node.js 20+**
- A **Supabase project** (the free tier is plenty)

### 1. Install

```bash
git clone https://github.com/aryan54-rgb/VoltGrid.git
cd VoltGrid
npm install
```

### 2. Connect your Supabase project

Create a `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase dashboard under **Project Settings → API**. The anon key is
safe to ship to the browser — RLS is what protects the data, not the key.

### 3. Run the migrations

Open the Supabase dashboard → **SQL Editor**, and paste each file from `supabase/migrations/`
**in filename order**. They are ordered by timestamp and are idempotent, so re-running one is
safe. See [`SUPABASE_HANDOVER.md`](SUPABASE_HANDOVER.md) for what each migration does.

### 4. Start

```bash
npm run dev
```

Open <http://localhost:5173>, register an account, and pick a role.

> **Note:** the driver's nearby-stations screen needs the browser Geolocation API, which only
> works in a secure context — `localhost` qualifies, a plain-HTTP LAN address does not.

### Scripts

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | oxlint over the source tree |
| `npm run seed:sql` | Regenerate the demo-data seed migration from `src/data/*.js` |

---

## 👥 Workspaces

Your role is chosen at registration and decides which portal opens. Route guards and RLS
policies both enforce it — changing the URL does not get you into another workspace.

| Role | Route | Screens |
| :--- | :--- | :--- |
| **Public** | `/` | Landing · SRS module map (`/modules`) · Login · Registration · Password reset |
| **EV Driver** | `/driver` | Dashboard · Charging Stations · Reservations · Active Session · History · Wallet · Transactions · Report a Fault · Marketplace · Community · Reviews · Notifications · Profile |
| **Fleet Manager** | `/fleet` | Dashboard · Vehicles · Drivers · Charging Schedule · Analytics · Billing |
| **Station Operator** | `/operator` | Dashboard · Stations · Chargers · Connectors · Reservations · Fault Queue · Revenue |
| **Admin** | `/admin` | Dashboard · Users · Stations · Marketplace · Reports · Analytics · Settings |

---

## 🔄 How a booking flows

The one cross-role workflow worth reading end to end:

```
Driver                          Database                        Operator
──────                          ────────                        ────────
Picks a station,                                                
connector and slot
      │
      └─── createReservation ──▶ status = PENDING
                                 (slot is held immediately)
                                        │
                                 AFTER INSERT trigger
                                        │
                                 notifications broadcast ──────▶ 🔔 bell in the header
                                   roles = ['operator']                │
                                                                       │
                                                          Approves on /operator/reservations
                                                                       │
      🔔 sees PENDING ◀───────── status = RESERVED ◀───────────────────┘
         become RESERVED
```

The notification is written by a `SECURITY DEFINER` trigger rather than by the client, because
`notifications` is deliberately not client-writable — otherwise any signed-in user could
broadcast arbitrary text to every operator and admin. Being in the same transaction as the
booking also means a reservation can never exist without its notification.

---

## 📂 Project structure

```
VoltGrid/
├── src/
│   ├── components/
│   │   ├── ui/          # Radix-based primitives (button, dialog, select, table…)
│   │   ├── shared/      # Cross-page pieces (StatCard, StatusBadge, MapPlaceholder…)
│   │   └── auth/        # Route guards
│   ├── context/         # Auth and theme providers
│   ├── hooks/           # useQuery (async reads), useGeolocation (browser position)
│   ├── layouts/         # AppShell (sidebar + topbar), AuthLayout
│   ├── lib/
│   │   ├── api/         # One module per domain — the only place Supabase is called
│   │   ├── geo.js       # Haversine distance, map projection, coordinate parsing
│   │   ├── nav.js       # Per-role navigation and the SRS traceability map
│   │   └── supabase.ts  # Client singleton
│   ├── pages/           # Route components, grouped by role
│   └── data/            # Fixtures for the seed generator (NOT read at runtime)
├── supabase/migrations/ # Schema, RLS policies, functions and triggers
├── scripts/             # Seed generation and database checks
└── docs/                # Page-by-page guide
```

### Where the interesting logic lives

| Concern | File |
| :--- | :--- |
| Distance, sorting, map projection | `src/lib/geo.js` |
| Browser position, permission states | `src/hooks/use-geolocation.js` |
| Booking creation and approval | `src/lib/api/reservations.js` |
| Role enforcement | `supabase/migrations/20260821150000_phase2_schema.sql` |
| Station coordinates | `supabase/migrations/20260821200000_station_coordinates.sql` |
| Operator approval trigger | `supabase/migrations/20260821220000_booking_approval.sql` |

---

## 📚 Further reading

| Document | Contents |
| :--- | :--- |
| [`SUPABASE_HANDOVER.md`](SUPABASE_HANDOVER.md) | Every table, policy and function, and why each one is shaped that way |
| [`CONTINUE_HERE.md`](CONTINUE_HERE.md) | Current state and the next steps |
| [`docs/PAGES_GUIDE.md`](docs/PAGES_GUIDE.md) | What each screen does, page by page |

---

## 🤝 Contributing

1. Branch from `main` — `git checkout -b feature/your-feature`
2. Keep `npm run lint` and `npm run build` clean
3. Schema changes go in a **new** timestamped migration; never edit one that has already run
4. Open a pull request describing what changed and why

---

## 📄 License

MIT — fork it and build your own EV platform.
