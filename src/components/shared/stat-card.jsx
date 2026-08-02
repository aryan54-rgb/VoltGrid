import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * KPI stat tile. `delta` is a signed % number; `deltaGoodWhen` flips whether
 * up is good (default) or bad (e.g. cost metrics).
 */
export function StatCard({ label, value, delta, deltaLabel = 'vs last month', icon: Icon, deltaGoodWhen = 'up', className, index = 0 }) {
  const up = delta != null && delta >= 0
  const good = deltaGoodWhen === 'up' ? up : !up
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <Card className={cn('h-full', className)}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{label}</p>
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            )}
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
          {delta != null && (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 font-medium',
                  good ? 'text-[var(--delta-good)]' : 'text-status-critical'
                )}
              >
                {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(delta)}%
              </span>
              {deltaLabel}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
