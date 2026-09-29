'use client'

import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/16/solid'
import clsx from 'clsx'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type ToastVariant = 'success' | 'warning' | 'error'

type ToastOptions = {
  message: string
  title?: string
  variant: ToastVariant
  duration?: number
}

type ToastItem = {
  id: string
  message: string
  title?: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (options: ToastOptions) => void
  success: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
}

const TOAST_DURATION_MS = 4500

const toastStyles: Record<ToastVariant, string> = {
  success:
    'border-green-300/80 bg-green-50 text-green-950 dark:border-green-700/70 dark:bg-green-950/40 dark:text-green-100',
  warning:
    'border-amber-300/80 bg-amber-50 text-amber-950 dark:border-amber-700/70 dark:bg-amber-950/40 dark:text-amber-100',
  error:
    'border-red-300/80 bg-red-50 text-red-950 dark:border-red-700/70 dark:bg-red-950/40 dark:text-red-100',
}

const toastIconStyles: Record<ToastVariant, string> = {
  success: 'text-green-600 dark:text-green-300',
  warning: 'text-amber-600 dark:text-amber-300',
  error: 'text-red-600 dark:text-red-300',
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const createToastId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

const getIconForVariant = (variant: ToastVariant) => {
  if (variant === 'success') return CheckCircleIcon
  if (variant === 'warning') return ExclamationTriangleIcon
  return XCircleIcon
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const clearToastTimer = useCallback((id: string) => {
    const timeoutId = timersRef.current.get(id)
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
      timersRef.current.delete(id)
    }
  }, [])

  const removeToast = useCallback(
    (id: string) => {
      clearToastTimer(id)
      setToasts((previousToasts) => previousToasts.filter((toast) => toast.id !== id))
    },
    [clearToastTimer]
  )

  const showToast = useCallback(
    ({ message, title, variant, duration = TOAST_DURATION_MS }: ToastOptions) => {
      const id = createToastId()
      setToasts((previousToasts) => [...previousToasts, { id, message, title, variant }])

      const timeoutId = window.setTimeout(() => {
        removeToast(id)
      }, duration)

      timersRef.current.set(id, timeoutId)
    },
    [removeToast]
  )

  useEffect(() => {
    const timers = timersRef.current

    return () => {
      for (const timeoutId of timers.values()) {
        window.clearTimeout(timeoutId)
      }
      timers.clear()
    }
  }, [])

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (message, title) => showToast({ message, title, variant: 'success' }),
      warning: (message, title) => showToast({ message, title, variant: 'warning' }),
      error: (message, title) => showToast({ message, title, variant: 'error' }),
    }),
    [showToast]
  )

  return (
    <ToastContext.Provider value={contextValue}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-0 left-0 z-50 flex w-full justify-center px-4 sm:top-6 sm:right-6 sm:left-auto sm:max-w-sm sm:justify-end sm:px-0"
      >
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((toast) => {
            const ToastIcon = getIconForVariant(toast.variant)

            return (
              <div
                key={toast.id}
                role={toast.variant === 'error' ? 'alert' : 'status'}
                className={clsx(
                  'pointer-events-auto rounded-xl border p-4 shadow-lg ring-1 ring-zinc-950/5 backdrop-blur-sm',
                  toastStyles[toast.variant]
                )}
              >
                <div className="flex items-start gap-3">
                  <ToastIcon className={clsx('mt-0.5 size-5 shrink-0', toastIconStyles[toast.variant])} />

                  <div className="min-w-0 flex-1">
                    {toast.title ? <p className="text-sm font-semibold">{toast.title}</p> : null}
                    <p className={clsx('text-sm', toast.title ? 'mt-1' : '')}>{toast.message}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="rounded-md p-1 text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                    aria-label="Close notification"
                  >
                    <XMarkIcon className="size-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}

export type { ToastOptions, ToastVariant }
