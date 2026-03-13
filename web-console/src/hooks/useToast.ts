import { createContext, useContext, useState, useRef, useCallback, createElement } from 'react'
import { createPortal } from 'react-dom'
import { Toast } from '@/components/shared/Toast'

export interface ToastData {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: { label: string; onClick: () => void }
  duration?: number
  exiting?: boolean
}

interface ToastContextValue {
  addToast: (toast: Omit<ToastData, 'id'>) => string
  removeToast: (id: string) => void
  success: (message: string, action?: ToastData['action']) => string
  error: (message: string, action?: ToastData['action']) => string
  info: (message: string, action?: ToastData['action']) => string
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const DEFAULT_DURATIONS: Record<string, number> = {
  success: 5000,
  error: 8000,
  info: 5000,
}

let toastCounter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const startTimer = useCallback((id: string, duration: number) => {
    const existing = timers.current.get(id)
    if (existing) clearTimeout(existing)
    timers.current.set(
      id,
      setTimeout(() => removeToast(id), duration),
    )
  }, [])

  const clearTimer = useCallback((id: string) => {
    const existing = timers.current.get(id)
    if (existing) {
      clearTimeout(existing)
      timers.current.delete(id)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    clearTimer(id)
    // Trigger exit animation
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 150)
  }, [clearTimer])

  const addToast = useCallback(
    (toast: Omit<ToastData, 'id'>): string => {
      const id = `toast-${++toastCounter}`
      const duration = toast.action ? 30000 : (toast.duration ?? DEFAULT_DURATIONS[toast.type] ?? 5000)
      const newToast: ToastData = { ...toast, id }

      setToasts((prev) => {
        const next = [...prev, newToast]
        // Remove oldest if exceeding max
        while (next.length > MAX_TOASTS) next.shift()
        return next
      })

      startTimer(id, duration)
      return id
    },
    [startTimer],
  )

  const success = useCallback(
    (message: string, action?: ToastData['action']) => addToast({ message, type: 'success', action }),
    [addToast],
  )
  const error = useCallback(
    (message: string, action?: ToastData['action']) => addToast({ message, type: 'error', action }),
    [addToast],
  )
  const info = useCallback(
    (message: string, action?: ToastData['action']) => addToast({ message, type: 'info', action }),
    [addToast],
  )

  const handleMouseEnter = useCallback((id: string) => clearTimer(id), [clearTimer])
  const handleMouseLeave = useCallback(
    (id: string) => {
      const toast = toasts.find((t) => t.id === id)
      if (!toast) return
      const duration = toast.action ? 30000 : (toast.duration ?? DEFAULT_DURATIONS[toast.type] ?? 5000)
      startTimer(id, duration)
    },
    [toasts, startTimer],
  )

  const portal = createPortal(
    createElement(
      'div',
      { className: 'fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2' },
      toasts.map((toast) =>
        createElement(Toast, {
          key: toast.id,
          toast,
          onDismiss: () => removeToast(toast.id),
          onMouseEnter: () => handleMouseEnter(toast.id),
          onMouseLeave: () => handleMouseLeave(toast.id),
        }),
      ),
    ),
    document.body,
  )

  return createElement(
    ToastContext.Provider,
    { value: { addToast, removeToast, success, error, info } },
    children,
    portal,
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
