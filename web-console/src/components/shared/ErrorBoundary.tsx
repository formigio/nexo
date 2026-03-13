import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center space-y-3 p-6">
            <div className="text-impact-breaking text-[13px]">
              Something went wrong
            </div>
            <div className="text-text-dim text-[12px] max-w-md">
              {this.state.error.message}
            </div>
            <button
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
              className="px-3 py-1.5 text-[12px] font-medium rounded border border-border-default text-text-primary hover:bg-surface-2 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
