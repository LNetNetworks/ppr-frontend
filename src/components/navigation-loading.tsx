'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import React from 'react'

type NavigationLoadingContextValue = {
  isNavigating: boolean
  startNavigation: () => void
}

const NavigationLoadingContext = React.createContext<NavigationLoadingContextValue | null>(null)

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchParamsKey = searchParams.toString()
  const [isNavigating, setIsNavigating] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopNavigation = React.useCallback(() => {
    setIsNavigating(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startNavigation = React.useCallback(() => {
    setIsNavigating(true)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Safety timeout in case navigation fails and URL does not update.
    timeoutRef.current = setTimeout(() => {
      setIsNavigating(false)
      timeoutRef.current = null
    }, 10000)
  }, [])

  React.useEffect(() => {
    stopNavigation()
  }, [pathname, searchParamsKey, stopNavigation])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <NavigationLoadingContext.Provider value={{ isNavigating, startNavigation }}>
      {children}
    </NavigationLoadingContext.Provider>
  )
}

export function useNavigationLoading() {
  const context = React.useContext(NavigationLoadingContext)
  if (!context) {
    return {
      isNavigating: false,
      startNavigation: () => undefined,
    }
  }
  return context
}

export function NavigationLoadingOverlay() {
  const { isNavigating } = useNavigationLoading()

  if (!isNavigating) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-[3px] dark:bg-zinc-900/70">
      <div className="flex items-center gap-3 rounded-full px-5 py-3 shadow-sm">
        <span
          className="size-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700 dark:border-zinc-600 dark:border-t-zinc-100"
          aria-hidden="true"
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Loading...</span>
      </div>
    </div>
  )
}
