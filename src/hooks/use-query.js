import * as React from 'react'

/**
 * Minimal async-read hook.
 *
 * Phase 2 deliberately does not bring in React Query (see SUPABASE_HANDOVER.md
 * §2) — this is the one piece of shared machinery that replaces it. It covers
 * what the app actually needs from a query library: a loading flag, an error,
 * a refetch, and a guarantee that a response which arrives after the inputs
 * changed (or after unmount) is thrown away instead of overwriting fresher
 * state.
 *
 * @param {() => Promise<any>} queryFn  fetcher; re-created on every render, so
 *   the dependency array — not the function identity — decides when it re-runs
 * @param {any[]} deps  re-run when these change
 * @param {{enabled?: boolean, initialData?: any}} options
 */
export function useQuery(queryFn, deps = [], options = {}) {
  const { enabled = true, initialData = null } = options

  const [data, setData] = React.useState(initialData)
  const [error, setError] = React.useState(null)
  const [loading, setLoading] = React.useState(enabled)

  // The fetcher is read through a ref so a fresh closure each render does not
  // count as a change; `deps` is the sole trigger.
  const fnRef = React.useRef(queryFn)
  fnRef.current = queryFn

  // Bumped by refetch() to force the effect to run again.
  const [attempt, setAttempt] = React.useState(0)

  React.useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError(null)

    Promise.resolve()
      .then(() => fnRef.current())
      .then((result) => {
        if (!active) return
        setData(result)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err)
        setLoading(false)
      })

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, attempt, ...deps])

  const refetch = React.useCallback(() => setAttempt((a) => a + 1), [])

  return { data, error, loading, refetch, setData }
}

/**
 * Runs several queries as one. Loading until every part has landed; the first
 * error wins. Saves pages that read four tables from juggling four flags.
 *
 * @param {Record<string, () => Promise<any>>} queries
 * @param {any[]} deps
 */
export function useQueries(queries, deps = [], options = {}) {
  const keys = Object.keys(queries)
  const keySignature = keys.join(',')

  const query = useQuery(
    async () => {
      const results = await Promise.all(keys.map((k) => queries[k]()))
      return Object.fromEntries(keys.map((k, i) => [k, results[i]]))
    },
    [keySignature, ...deps],
    options
  )

  return query
}
