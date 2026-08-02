import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Validated categorical chart palette (light/dark handled via CSS vars).
 * Assign slots in fixed order per chart; never cycle past what's defined.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export const GRID = 'var(--chart-grid)'
export const AXIS = 'var(--chart-axis)'

export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--chart-muted)', fontSize: 11 },
}

/** Shared Recharts tooltip: card surface, colored dot per series, ink text. */
export function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lg">
      {label != null && <p className="mb-1.5 font-medium text-foreground">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey ?? entry.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatter ? formatter(entry.value, entry) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Card wrapper for charts with a fixed plot height. */
export function ChartCard({ title, description, actions, children, height = 280, className }) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions}
      </CardHeader>
      <CardContent>
        <div style={{ height }} className="w-full [&_.recharts-surface]:outline-none">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

/** Legend row rendered below/above a chart (identity never color-alone: names beside dots). */
export function ChartLegend({ items, className }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1', className)}>
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full" style={{ background: it.color ?? CHART_COLORS[i] }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}
