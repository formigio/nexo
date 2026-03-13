import type { ToastData } from '@/hooks/useToast'

interface ToastProps {
  toast: ToastData
  onDismiss: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" fill="#3fb950" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" fill="#f85149" />
      <path d="M10.28 5.72a.75.75 0 010 1.06L9.06 8l1.22 1.22a.75.75 0 11-1.06 1.06L8 9.06l-1.22 1.22a.75.75 0 01-1.06-1.06L6.94 8 5.72 6.78a.75.75 0 011.06-1.06L8 6.94l1.22-1.22a.75.75 0 011.06 0z" fill="#f85149" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 12.5a5.5 5.5 0 110-11 5.5 5.5 0 010 11z" fill="#58a6ff" />
      <path d="M8 6.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 6.5zm0-2a.75.75 0 100 1.5.75.75 0 000-1.5z" fill="#58a6ff" />
    </svg>
  )
}

function DismissIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const icons = {
  success: CheckIcon,
  error: ErrorIcon,
  info: InfoIcon,
}

export function Toast({ toast, onDismiss, onMouseEnter, onMouseLeave }: ToastProps) {
  const Icon = icons[toast.type]

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-1 border border-border-default shadow-lg max-w-[420px] ${
        toast.exiting ? 'animate-toast-exit' : 'animate-toast-enter'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="alert"
    >
      <Icon />
      <span className="text-[13px] text-text-primary flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="text-[12px] text-text-secondary hover:text-text-primary underline shrink-0"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="text-text-dim hover:text-text-primary shrink-0 p-0.5"
        aria-label="Dismiss"
      >
        <DismissIcon />
      </button>
    </div>
  )
}
