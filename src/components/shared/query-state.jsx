import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * The two states every screen gained when its data moved from a static import
 * to a Supabase round-trip. Kept in one place so a table that is loading looks
 * the same in the driver portal as it does in the admin one.
 */

/** Stacked bars roughly the shape of the rows they stand in for. */
export function LoadingRows({ rows = 5, className }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Placeholder with a chart's proportions, so cards do not collapse. */
export function LoadingBlock({ className }) {
  return <Skeleton className={cn('h-64 w-full', className)} aria-busy="true" />
}

export function LoadingCards({ count = 4, className }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)} aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  )
}

/**
 * Failure with a way out. Supabase errors carry a `message`; anything else
 * falls back to a generic line rather than rendering `[object Object]`.
 */
export function ErrorState({ error, onRetry, title = 'Could not load this data', className }) {
  const message =
    error?.message ??
    (typeof error === 'string' ? error : 'Something went wrong talking to the server.')

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-status-critical/40 px-6 py-12 text-center',
        className
      )}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-status-critical/10 text-status-critical">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <p className="font-medium">{title}</p>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  )
}

/**
 * Renders `loading` / `error` for a useQuery result and the children only once
 * there is data.
 *
 * @param {{data: any, loading: boolean, error: any, refetch: () => void}} query
 * @param {React.ReactNode | (data: any) => React.ReactNode} children
 */
export function QueryBoundary({ query, loading: loadingSlot, children, errorTitle }) {
  if (query.loading && query.data == null) {
    return loadingSlot ?? <LoadingRows />
  }
  if (query.error) {
    return <ErrorState error={query.error} onRetry={query.refetch} title={errorTitle} />
  }
  return typeof children === 'function' ? children(query.data) : children
}
