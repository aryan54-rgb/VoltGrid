# ⚡ VoltGrid

![VoltGrid Banner](https://via.placeholder.com/1200x300?text=VoltGrid+-+EV+Charging+Platform)

**VoltGrid** is a comprehensive, frontend-only EV (Electric Vehicle) charging platform demonstration. It serves as a production-ready SaaS dashboard featuring role-based workspaces, built entirely with modern web technologies and mock data (no backend, no auth, no database required for local development).

## ✨ Features

- **Role-Based Access Control:** Distinct workspaces tailored for public users, drivers, fleet managers, station operators, technicians, and administrators.
- **Modern UI/UX:** Built with a design system using Tailwind CSS v4, featuring CSS-variable design tokens and a class-based dark mode.
- **Accessible Components:** Utilizes Radix primitives (via shadcn/ui style component kit) for fully accessible, unstyled UI elements like dialogs, dropdowns, tabs, and more.
- **Interactive Data Visualization:** Includes colorblind-safe, validated chart palettes using Recharts.
- **Smooth Animations:** Subtle entrance and hover motions powered by Framer Motion.
- **Fast & Responsive:** Lazy-loaded routes with React Router ensuring blazing fast performance on any device.

## 🛠 Tech Stack

- **Framework:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Components:** shadcn/ui-style component kit (Radix primitives)
- **Routing:** [React Router 7](https://reactrouter.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)
- **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Quick Start

To get the project running locally on your machine:

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd VoltGrid
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## 👥 Workspaces & Roles

VoltGrid simulates a multi-tenant environment with specific views for different user roles. You can easily switch between these workspaces using the user card located at the bottom of the sidebar. 

| Role | Route | Key Features & Pages |
| :--- | :--- | :--- |
| **Public** | `/` | Landing page, Login, Registration |
| **EV Driver** | `/driver` | Personal Dashboard, Nearby Stations, Slot Booking, Active Charging Sessions, History, Wallet, Community |
| **Fleet Manager** | `/fleet` | Fleet Dashboard, Vehicle Tracking, Analytics, Centralized Billing |
| **Station Operator** | `/operator` | Operator Dashboard, Station Management, Charger Status, Revenue Tracking |
| **Technician** | `/technician` | Maintenance Dashboard, Support Tickets, Maintenance History |
| **Admin** | `/admin` | System Dashboard, User Management, Global Analytics, Platform Settings |

*Note: The theme toggle (Dark/Light mode) is available in the top navigation bar.*

## 📂 Project Structure

```
src/
├── components/
│   ├── ui/         # Base UI components (shadcn-style primitives)
│   └── shared/     # Reusable business components (StatCard, Charts, Badges, etc.)
├── context/        # React context providers (e.g., ThemeProvider)
├── data/           # Mock JSON data driving the application
├── layouts/        # Page layouts (AppShell with sidebar/topbar, AuthLayout)
├── lib/            # Utility functions and navigation configurations
└── pages/          # Route components organized by role (public, driver, admin, etc.)
```

*Everything you see in the dashboard — active sessions, revenue charts, support tickets, and notifications — is populated using mock data from the `src/data/` directory.*

## 🤝 Partner Contributions

As a partner of this project, your contributions are highly valued! To propose changes:

1. Create a feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
