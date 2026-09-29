'use client'

import { Divider } from '@/components/divider'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu } from '@/components/dropdown'
import { Heading } from '@/components/heading'
import { Input, InputGroup } from '@/components/input'
import { Link } from '@/components/link'
import { RoleProtectedRoute } from '@/components/role-protected-route'
import { TableActionsIcon, TableSearchIcon } from '@/components/table-icons'
import { useFetchProjectEvidences } from '@/lib/api-services'
import type { Evidence } from '@/types/api'
import { useParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

function EvidencesPageContent() {
  const params = useParams()
  const projectId = params.id as string
  const [evidences, setEvidences] = useState<Evidence[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const fetchProjectEvidences = useFetchProjectEvidences()

  useEffect(() => {
    if (!projectId) return

    const loadEvidences = async () => {
      try {
        setIsLoading(true)
        const data = await fetchProjectEvidences(projectId)
        setEvidences(data)
      } catch (error) {
        console.error('Failed to fetch evidences:', error)
        setEvidences([])
      } finally {
        setIsLoading(false)
      }
    }

    loadEvidences()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Filter evidences based on search query
  const filteredEvidences = useMemo(() => {
    if (!searchQuery.trim()) {
      return evidences
    }

    const query = searchQuery.toLowerCase().trim()
    return evidences.filter((evidence) => {
      const name = (evidence.name || evidence.file_name || '').toLowerCase()
      const description = (evidence.description || '').toLowerCase()
      const evidenceHash = (evidence.hash || evidence.tx_hash || evidence.txHash || '').toLowerCase()

      return name.includes(query) || description.includes(query) || evidenceHash.includes(query)
    })
  }, [evidences, searchQuery])

  return (
    <RoleProtectedRoute requiredRole="sponsor">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-sm:w-full sm:flex-1">
          <Heading>Evidences</Heading>
        </div>
        <div className="max-sm:w-full sm:w-auto">
          <InputGroup>
            <TableSearchIcon />
            <Input
              name="search"
              placeholder="Search evidences&hellip;"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      {/* Evidence List */}
      {isLoading ? (
        <div className="mt-10 text-center text-zinc-500">Loading evidences...</div>
      ) : filteredEvidences.length === 0 ? (
        <div className="mt-10 text-center text-zinc-500">
          {evidences.length === 0 ? 'No evidences found' : 'No evidences match your search'}
        </div>
      ) : (
        <ul className="mt-10">
          {filteredEvidences.map((evidence, index) => (
            <li key={evidence.id_evidence || evidence.id || index}>
              <Divider soft={index > 0} />
              <div className="flex items-center justify-between">
                <div key={evidence.id_evidence || evidence.id || index} className="flex gap-6 py-6">
                  <div className="w-32 shrink-0">
                    {evidence.fileUrl || evidence.uri ? (
                      <Link href={evidence.fileUrl || evidence.uri || '#'} aria-hidden="true">
                        <div className="flex aspect-3/2 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {evidence.fileType?.startsWith('image/') ? '📷' : '📄'}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex aspect-3/2 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">📄</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-base/6 font-semibold">
                      <Link href={evidence.fileUrl || evidence.uri || '#'}>
                        {evidence.name || evidence.file_name || 'Untitled Evidence'}
                      </Link>
                    </div>
                    {evidence.description && <div className="text-xs/6 text-zinc-500">{evidence.description}</div>}
                    <div className="text-xs/6 text-zinc-600">
                      {evidence.uploadedAt || evidence.created_at
                        ? `Uploaded: ${new Date(evidence.uploadedAt || evidence.created_at || '').toLocaleDateString()}`
                        : 'Upload date unknown'}
                    </div>
                    {evidence.hash || evidence.tx_hash || evidence.txHash ? (
                      <div className="text-xs/6 text-zinc-500">
                        Hash: {evidence.hash || evidence.tx_hash || evidence.txHash}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Dropdown>
                    <DropdownButton plain aria-label="More options">
                      <TableActionsIcon />
                    </DropdownButton>
                    <DropdownMenu anchor="bottom end">
                      {evidence.fileUrl || evidence.uri ? (
                        <DropdownItem href={evidence.fileUrl || evidence.uri || '#'}>View</DropdownItem>
                      ) : null}
                      <DropdownItem>Download</DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </RoleProtectedRoute>
  )
}

export default function EvidencesPage() {
  return (
    <Suspense
      fallback={
        <RoleProtectedRoute requiredRole="sponsor">
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-lg text-zinc-500 dark:text-zinc-400">Loading...</div>
            </div>
          </div>
        </RoleProtectedRoute>
      }
    >
      <EvidencesPageContent />
    </Suspense>
  )
}
