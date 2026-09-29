'use client'

import { useState, useEffect, useMemo } from 'react'
import { Stat } from '@/app/stat'
import { Heading, Subheading } from '@/components/heading'
import { Select } from '@/components/select'
import type { Project } from '@/types/api'
import type { Evidence } from '@/types/api'
import { useKeycloak } from '@react-keycloak/web'
import { useFetchEvidences } from '@/lib/api-services'
import { GridEvidences } from '@/components/grids/grid-evidences'
import { EvidenceDetailModal } from '@/components/evidence-detail-modal'
import { MagnifyingGlassIcon } from '@heroicons/react/16/solid'

interface DashboardContentProps {
  projects: Project[]
  isLoading?: boolean
}

export function DashboardContent({ projects, isLoading = false }: DashboardContentProps) {
  const { keycloak } = useKeycloak()
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [isLoadingEvidences, setIsLoadingEvidences] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const fetchEvidences = useFetchEvidences()

  // Get user info from Keycloak token (same logic as sidebar)
  const userDisplayName =
    (keycloak?.tokenParsed?.name as string | undefined) ??
    (keycloak?.tokenParsed?.preferred_username as string | undefined) ??
    'User'

  // Ensure projects is always an array
  const projectsArray = Array.isArray(projects) ? projects : []
  const projectIds = projectsArray.map((project) => project.id).filter((id): id is string => !!id)

  // Calculate stats from projects
  const totalProjects = projectsArray.length
  const ongoingProjects = projectsArray.filter((p) => p.status === 'inprogress').length
  const completedProjects = projectsArray.filter((p) => p.status === 'closed').length
  const cancelledProjects = projectsArray.filter((p) => p.status === 'canceled').length

  // Fetch evidences
  useEffect(() => {
    const loadEvidences = async () => {
      try {
        setIsLoadingEvidences(true)
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
        setIsLoadingEvidences(false)
      }
    }

    loadEvidences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectIds.join('|')])

  // Ensure evidences is always an array
  const evidencesArray = Array.isArray(evidences) ? evidences : []

  // Filter evidences based on search query
  const filteredEvidences = useMemo(() => {
    if (!searchQuery.trim()) {
      return evidencesArray
    }

    const query = searchQuery.toLowerCase().trim()
    return evidencesArray.filter((evidence) => {
      const name = (evidence.name || evidence.file_name || '').toLowerCase()
      const description = (evidence.description || '').toLowerCase()
      const evidenceHash = (evidence.hash || evidence.tx_hash || evidence.txHash || '').toLowerCase()
      const fileType = (evidence.fileType || '').toLowerCase()

      return (
        name.includes(query) ||
        description.includes(query) ||
        evidenceHash.includes(query) ||
        fileType.includes(query)
      )
    })
  }, [evidencesArray, searchQuery])

  // Modal handlers
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
      <Heading>Hey, {userDisplayName}</Heading>
      <div className="mt-8 flex items-end justify-between">
        <Subheading>Overview</Subheading>
      </div>
      <div className="mt-4 grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
        <Stat title="Total Projects" value={totalProjects.toString()} change="0%" />
        <Stat title="On-Going Projects" value={ongoingProjects.toString()} change="0%" />
        <Stat title="Completed Projects" value={completedProjects.toString()} change="0%" />
        <Stat title="Cancelled Projects" value={cancelledProjects.toString()} change="0%" />
      </div>
      <div className="mt-14">
        <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
          <div className="sm:flex sm:items-center sm:justify-between">
            <Subheading>Evidences</Subheading>
            <div className="mt-3 sm:mt-0 sm:ml-4">
              <div className="relative">
                <input
                  id="query"
                  name="query"
                  type="text"
                  placeholder="Search evidences"
                  aria-label="Search evidences"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-400 dark:focus:outline-blue-500"
                />
                <MagnifyingGlassIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-5 text-zinc-500 sm:size-4 dark:text-zinc-400"
                />
              </div>
            </div>
          </div>
        </div>
        <GridEvidences
          evidences={filteredEvidences}
          isLoading={isLoadingEvidences}
          emptyMessage={searchQuery ? `No evidences found matching "${searchQuery}"` : 'No evidences found'}
          onView={handleViewEvidence}
          onDownload={handleDownloadEvidence}
        />
      </div>

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
