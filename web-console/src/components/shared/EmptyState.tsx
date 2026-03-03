interface EmptyStateProps {
  message: string
  testId?: string
}

export function EmptyState({ message, testId }: EmptyStateProps) {
  return (
    <div data-testid={testId ?? 'empty-state'} className="flex items-center justify-center p-8 text-text-dim text-[13px]">
      {message}
    </div>
  )
}
