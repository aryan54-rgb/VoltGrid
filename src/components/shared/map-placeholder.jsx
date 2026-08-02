import * as React from 'react'
import { Minus, Plus, Navigation, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLOR = {
  online: 'var(--status-good)',
  available: 'var(--status-good)',
  'in-use': 'var(--chart-1)',
  maintenance: 'var(--status-warning)',
  offline: 'var(--status-critical)',
}

/**
 * Stylized placeholder map (no real tiles). Markers carry { id, name, x, y, status }
 * where x/y are 0–100 percentages. onSelect(marker) fires on click.
 */
export function MapPlaceholder({ markers = [], selectedId, onSelect, className, height = 380 }) {
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-xl border bg-card', className)}
      style={{ height }}
    >
      {/* base terrain */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
        <rect width="100" height="100" className="fill-[#eef2ea] dark:fill-[#161a16]" />
        {/* water */}
        <path d="M0 78 Q 18 70 30 80 T 62 86 T 100 80 L 100 100 L 0 100 Z" className="fill-[#d3e5f2] dark:fill-[#12202b]" />
        {/* parks */}
        <ellipse cx="22" cy="30" rx="12" ry="8" className="fill-[#dcead2] dark:fill-[#1a241a]" />
        <ellipse cx="78" cy="52" rx="9" ry="6" className="fill-[#dcead2] dark:fill-[#1a241a]" />
        {/* road grid */}
        <g className="stroke-[#ffffff] dark:stroke-[#2a2a28]" strokeWidth="1.4" fill="none">
          <path d="M0 20 H100 M0 45 H100 M0 64 H100" />
          <path d="M18 0 V100 M42 0 V100 M68 0 V100 M88 0 V100" />
        </g>
        <g className="stroke-[#ffffff] dark:stroke-[#232321]" strokeWidth="0.6" fill="none">
          <path d="M0 10 H100 M0 33 H100 M0 55 H100 M0 72 H100" />
          <path d="M8 0 V100 M30 0 V100 M55 0 V100 M78 0 V100" />
        </g>
      </svg>

      {/* markers */}
      {markers.map((m) => {
        const selected = m.id === selectedId
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect?.(m)}
            title={m.name}
            className={cn(
              'group absolute -translate-x-1/2 -translate-y-full cursor-pointer transition-transform hover:scale-110 focus:outline-none',
              selected && 'z-10 scale-110'
            )}
            style={{ left: `${m.x}%`, top: `${m.y}%` }}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full rounded-br-none shadow-md ring-2 ring-white dark:ring-black/50"
              style={{ background: STATUS_COLOR[m.status] ?? 'var(--chart-1)', transform: 'rotate(45deg)' }}
            >
              <Zap className="h-3.5 w-3.5 text-white" style={{ transform: 'rotate(-45deg)' }} />
            </span>
            <span
              className={cn(
                'pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background opacity-0 shadow transition-opacity group-hover:opacity-100',
                selected && 'opacity-100'
              )}
            >
              {m.name}
            </span>
          </button>
        )
      })}

      {/* controls (decorative) */}
      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
        <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-accent" aria-label="Zoom in">
          <Plus className="h-4 w-4" />
        </button>
        <div className="h-px bg-border" />
        <button type="button" className="flex h-8 w-8 items-center justify-center hover:bg-accent" aria-label="Zoom out">
          <Minus className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg border bg-card shadow-sm">
        <Navigation className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="absolute bottom-2 left-3 text-[10px] text-muted-foreground/70">Map preview — mock data</span>
    </div>
  )
}
