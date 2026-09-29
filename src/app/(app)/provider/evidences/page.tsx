'use client'

import { useState, useEffect } from 'react'
import { Heading } from '@/components/heading'
import { GridEvidences } from '@/components/grids/grid-evidences'
import { EvidenceDetailModal } from '@/components/evidence-detail-modal'
import { useFetchEvidences, useFetchProjects } from '@/lib/api-services'
import type { Evidence, Project } from '@/types/api'

export default function EvidencesPage() {
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const fetchEvidences = useFetchEvidences()
  const fetchProjects = useFetchProjects()

  useEffect(() => {
    const loadEvidences = async () => {
      try {
        setIsLoading(true)
        const projects = await fetchProjects()
        const projectIds = (Array.isArray(projects) ? projects : [])
          .map((project: Project) => project.id)
          .filter((id): id is string => !!id)

        if (projectIds.length === 0) {
          setEvidences([])
          return
        }

        const evidenceGroups = await Promise.all(projectIds.map((projectId) => fetchEvidences(projectId)))
        const allEvidences = evidenceGroups.flat()
        const seen = new Set<string>()
        const deduped = allEvidences.filter((evidence, index) => {
          const uniqueKey =
            String(evidence.id_evidence || evidence.id || '').trim() ||
            `${String(evidence.hash || evidence.tx_hash || evidence.txHash || 'no-hash').trim()}:${String(
              evidence.fileUrl || evidence.uri || 'no-uri'
            ).trim()}:${String(evidence.created_at || evidence.uploadedAt || index)}`

          if (seen.has(uniqueKey)) {
            return false
          }

          seen.add(uniqueKey)
          return true
        })

        setEvidences(deduped)
      } catch (error) {
        console.error('Failed to fetch evidences:', error)
        setEvidences([])
      } finally {
        setIsLoading(false)
      }
    }

    loadEvidences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViewEvidence = (evidence: Evidence) => {
    setSelectedEvidence(evidence)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEvidence(null)
  }

  const handleDownloadEvidence = (evidence: Evidence) => {
    const fileUrl = evidence.fileUrl || evidence.uri
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-sm:w-full sm:flex-1">
          <Heading>Evidences</Heading>
        </div>
      </div>

      {/* Evidence List */}
      <GridEvidences
        evidences={evidences}
        isLoading={isLoading}
        emptyMessage="No evidences found"
        onView={handleViewEvidence}
        onDownload={handleDownloadEvidence}
      />

      {/* Evidence Detail Modal */}
      <EvidenceDetailModal
        evidence={selectedEvidence}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDownload={handleDownloadEvidence}
      />
    </>
  )
}
