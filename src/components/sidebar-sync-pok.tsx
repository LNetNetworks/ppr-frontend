'use client'

import { useState } from 'react'
import { ArrowPathIcon } from '@heroicons/react/20/solid'
import { SidebarLabel, SidebarSubItem } from '@/components/sidebar'
import { SyncPokModal } from '@/components/sync-pok-modal'
import { useBranding } from '@/hooks/use-branding'

interface SidebarSyncPokProps {
  projectId: string
}

export function SidebarSyncPok({ projectId }: SidebarSyncPokProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { showImportEvidence } = useBranding()

  if (!showImportEvidence) {
    return null
  }

  return (
    <>
      <SidebarSubItem onClick={() => setIsOpen(true)}>
        <ArrowPathIcon data-slot="icon" />
        <SidebarLabel>Import Evidence</SidebarLabel>
      </SidebarSubItem>

      <SyncPokModal isOpen={isOpen} onClose={() => setIsOpen(false)} initialProjectId={projectId} />
    </>
  )
}
