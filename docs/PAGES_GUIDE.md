# VoltGrid page-building conventions

Frontend-only mock SaaS dashboard. React (Vite, JSX not TSX), Tailwind v4, shadcn-style UI kit, React Router, lucide-react, Recharts, framer-motion. Alias `@` → `src/`.

## Layout
Pages render inside `AppShell` (sidebar + topbar already exist — do NOT add your own sidebar/topbar/search header). A page is a fragment of sections:

```jsx
import { PageHeader } from '@/components/shared/page-header'

export default function MyPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="…" description="…" actions={<Button>…</Button>} />
      {/* sections */}
    </div>
  )
}
```

Default export is REQUIRED (routes are lazy-loaded). Responsive: grids like `grid gap-4 sm:grid-cols-2 lg:grid-cols-4` for stat rows, `lg:grid-cols-3` (2/3 + 1/3) for chart+side layouts. Never let tables overflow the page — the `Table` component already wraps in `overflow-x-auto`.

## Available building blocks
- UI kit `@/components/ui/*`: button, card (Card/CardHeader/CardTitle/CardDescription/CardContent/CardFooter), badge (variants: default/secondary/outline/success/warning/destructive/info), input, label, textarea, table (Table/TableHeader/TableBody/TableRow/TableHead/TableCell), dialog (Radix: Dialog/DialogTrigger/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter/DialogClose), dropdown-menu, tabs (Tabs/TabsList/TabsTrigger/TabsContent), switch, avatar (Avatar/AvatarFallback), progress (Progress value={n}), select (Radix Select…), tooltip, separator, skeleton.
- Shared `@/components/shared/*`:
  - `page-header` → `PageHeader {title, description, actions}`
  - `stat-card` → `StatCard {label, value, delta, deltaLabel, icon, deltaGoodWhen: 'up'|'down', index}` (index staggers entrance animation)
  - `chart` → `CHART_COLORS` (array of 5 CSS-var colors), `GRID`, `axisProps`, `ChartTooltip`, `ChartCard {title, description, actions, height}`, `ChartLegend {items:[{label,color}]}`
  - `map-placeholder` → `MapPlaceholder {markers:[{id,name,x,y,status}], selectedId, onSelect, height}`
  - `empty-state` → `EmptyState {icon, title, description, action}`
  - `status-badge` → `StatusBadge {status}` (knows: online, available, in-use, charging, maintenance, offline, faulted, confirmed, active, pending, scheduled, completed, cancelled, failed, refunded, open, in-progress, resolved, critical, high, medium, low, suspended, paid, overdue)
  - `search-input` → `SearchInput` (input with magnifier icon)
- Utils `@/lib/utils`: `cn`, `formatCurrency`, `formatNumber`, `formatDate`, `formatDateTime`, `timeAgo`, `initials`.
- Mock data in `@/data/*`: stations.js (stations, chargers, timeSlots), sessions.js (activeSession, chargingHistory, monthlyUsage, driverBookings), wallet.js (wallet, transactions), marketplace.js (products, categories), community.js (posts, leaderboard), notifications.js (notifications — filter by `roles`), fleet.js (fleetVehicles, fleetEnergyByWeek, fleetCostPerVehicle, fleetUtilization, invoices, costBreakdown), tickets.js (tickets, maintenanceHistory, technicianStats), users.js (currentUsers, adminUsers), analytics.js (revenueByDay, revenueByStation, sessionsByHour, reservationsList, platformGrowth, revenueBySegment, energyMix, regionPerformance). READ the data file before using it — match field names exactly.

## Charts (Recharts) — required rules
- Wrap in `<ChartCard title=… height={280}><ResponsiveContainer width="100%" height="100%">…</ResponsiveContainer></ChartCard>`.
- Colors ONLY from `CHART_COLORS` in fixed order (slot 1 = first series). Status colors (`var(--status-good)` etc.) only for state, never as series colors.
- Axes: `<XAxis dataKey=… {...axisProps} />`, `<YAxis {...axisProps} width={40} />`. Grid: `<CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />`.
- Tooltip: `<RTooltip content={<ChartTooltip formatter={(v)=>…} />} cursor={{ stroke: 'var(--chart-axis)' }} />` (import `Tooltip as RTooltip` from recharts).
- Lines: `strokeWidth={2}`, `dot={false}`, `activeDot={{ r: 4 }}`. Bars: `radius={[4,4,0,0]}`, `maxBarSize={28}`, add `gap` via barCategoryGap default. Stacked bars: 2px gap → give upper segments `stroke="var(--card)" strokeWidth={2}` or use radius on top segment only. Areas: gradient fill from series color at 25% → transparent (`<defs><linearGradient>`), stroke solid.
- Never dual y-axes. ≥2 series → include a `ChartLegend`. One series → no legend. Donut/pie: use CHART_COLORS in order, `paddingAngle={2}`, `stroke="var(--card)"`, innerRadius for donut, and a legend beside it.
- Numbers in text/tooltip use ink colors (default), never the series color.

## Motion
Subtle only: entrance `initial={{opacity:0, y:8}} animate={{opacity:1, y:0}}` with small stagger, `whileHover={{ y: -2 }}` on interactive cards. No page-wide spring circus.

## Interactivity (mock)
Local `useState` only. Buttons that would hit a backend show optimistic UI: dialogs confirm then flip local state (e.g. booking flow, top-up dialog). Filters/search actually filter the mock arrays. Keep it working, not wired to anything.

## Style
- Production SaaS look (Stripe/Linear/Vercel): generous whitespace, `text-sm`, muted secondary text, hairline borders, `rounded-xl` cards, no loud colors outside data/status.
- Icons: lucide, `h-4 w-4` inline, `h-5 w-5` feature.
- Dark mode is automatic via tokens — use semantic classes (bg-card, text-muted-foreground, border, bg-primary/10 …), never raw gray-###. Exception: decorative gradients may use fixed palette classes that read fine in both modes.
- No `console.log`, no unused imports (build treats them fine but keep clean), no TypeScript syntax.
