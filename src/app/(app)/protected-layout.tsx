'use client'

import { ProtectedRoute } from '@/components/protected-route'
import { ApplicationLayout } from './application-layout'

export function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <ApplicationLayout>{children}</ApplicationLayout>
    </ProtectedRoute>
  )
}

