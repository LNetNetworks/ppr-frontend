'use client'

import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/dropdown'
import { Link } from '@/components/link'
import type { Evidence } from '@/types/api'
import { DocumentIcon, EllipsisVerticalIcon, PhotoIcon, PlayIcon } from '@heroicons/react/16/solid'
import { useState } from 'react'

interface EvidenceCardProps {
  evidence: Evidence
  index?: number
  onView?: (evidence: Evidence) => void
  onDownload?: (evidence: Evidence) => void
}

export function EvidenceCard({ evidence, index = 0, onView, onDownload }: EvidenceCardProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoading, setImageLoading] = useState(true)
  const fileUrl = evidence.fileUrl || evidence.uri
  const evidenceId = evidence.id_evidence || evidence.id || index
  const fileType = evidence.fileType || ''
  const isImage = fileType.startsWith('image/')
  const isVideo = fileType.startsWith('video/')

  const handlePreviewClick = (e: React.MouseEvent) => {
    if (onView) {
      e.preventDefault()
      onView(evidence)
    }
  }

  const handleImageLoad = () => {
    setImageLoading(false)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageLoading(false)
    setImageError(true)
  }

  const renderPreview = () => {
    if (!fileUrl) {
      return (
        <div className="flex aspect-3/2 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <DocumentIcon className="size-8 text-zinc-400" />
        </div>
      )
    }

    if (isImage) {
      return (
        <div className="relative aspect-3/2 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-blue-600 dark:border-zinc-600 dark:border-t-blue-400" />
            </div>
          )}
          {imageError ? (
            <div className="flex h-full items-center justify-center">
              <PhotoIcon className="size-8 text-zinc-400" />
            </div>
          ) : (
            <img
              src={fileUrl}
              alt={evidence.name || evidence.file_name || 'Evidence preview'}
              className={`h-full w-full object-cover transition-opacity duration-200 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
        </div>
      )
    }

    if (isVideo) {
      return (
        <div className="relative aspect-3/2 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <video src={fileUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="rounded-full bg-black/50 p-3">
              <PlayIcon className="size-6 text-white" />
            </div>
          </div>
        </div>
      )
    }

    // Document or other file type
    return (
      <div className="flex aspect-3/2 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
        <DocumentIcon className="size-8 text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div key={evidenceId} className="flex gap-6 py-4">
        <div className="w-32 shrink-0">
          {onView ? (
            <button
              onClick={handlePreviewClick}
              className="w-full cursor-pointer transition-transform hover:scale-105"
              aria-label="View evidence"
            >
              {renderPreview()}
            </button>
          ) : (
            <Link href={fileUrl || '#'} aria-hidden="true">
              {renderPreview()}
            </Link>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="text-base/6 font-semibold">
            <Link href={fileUrl || '#'}>{evidence.name || evidence.file_name || 'Untitled Evidence'}</Link>
          </div>
          {evidence.description && <div className="text-xs/6 text-zinc-500">{evidence.description}</div>}
          <div className="text-xs/6 text-zinc-600">
            {evidence.uploadedAt || evidence.created_at
              ? `Uploaded: ${new Date(evidence.uploadedAt || evidence.created_at || '').toLocaleDateString()}`
              : 'Upload date unknown'}
          </div>
          {evidence.hash || evidence.tx_hash || evidence.txHash ? (
            <div className="text-xs/6 text-zinc-500">Hash: {evidence.hash || evidence.tx_hash || evidence.txHash}</div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Dropdown>
          <DropdownButton plain aria-label="More options">
            <EllipsisVerticalIcon />
          </DropdownButton>
          <DropdownMenu anchor="bottom end">
            {onView ? (
              <DropdownItem
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault()
                  onView(evidence)
                }}
              >
                View
              </DropdownItem>
            ) : fileUrl ? (
              <DropdownItem href={fileUrl}>View</DropdownItem>
            ) : null}
            {onDownload && <DropdownItem onClick={() => onDownload(evidence)}>Download</DropdownItem>}
          </DropdownMenu>
        </Dropdown>
      </div>
    </div>
  )
}
