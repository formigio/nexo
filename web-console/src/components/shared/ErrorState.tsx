interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div data-testid="error-state" className="flex flex-col items-center gap-3 p-6 text-center">
      <div className="text-impact-breaking text-[13px]">{message}</div>
      {onRetry && (
        <button
          data-testid="error-retry-btn"
          onClick={onRetry}
          className="px-3 py-1.5 text-[12px] font-medium rounded border border-border-default text-text-primary hover:bg-surface-2 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
