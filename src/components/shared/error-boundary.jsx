import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI render error caught by ErrorBoundary:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-lg max-w-lg w-full space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold tracking-tight">Something went wrong</h3>
              <p className="text-xs text-muted-foreground">
                An unexpected interface error occurred while rendering this screen.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="rounded-lg bg-muted/60 p-3 text-left font-mono text-[11px] text-muted-foreground break-all border border-border/50">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Page
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  this.handleReset()
                  window.location.href = '/'
                }}
              >
                <Home className="h-3.5 w-3.5" /> Return Home
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
