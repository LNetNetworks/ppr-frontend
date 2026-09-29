'use client'

import { useEffect, useState, type ChangeEvent, type MouseEvent } from 'react'
import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { Field, Label } from '@/components/fieldset'
import { Select } from '@/components/select'
import { useToast } from '@/components/toast'
import { useFetchProjects, useFetchProjectStages, useImportProjectPhaseEvidences } from '@/lib/api-services'
import type { Phase, Project, SyncImport } from '@/types/api'

interface SyncPokModalProps {
  isOpen: boolean
  onClose: () => void
  initialProjectId?: string
}

function getProjectName(project: Project): string {
  const rawName = project.name ?? (project as { name_project?: string }).name_project
  return rawName && rawName.trim() ? rawName : `Project ${project.id}`
}

function getPhaseOptionValue(phase: Phase): string {
  // import-evidences expects phase template id (ph_*), not project-phase relation id (pp_*)
  return phase.idPhase || phase.idPhaseProject || phase.id
}

function getPhaseName(phase: Phase): string {
  return phase.name || `Stage ${phase.order ?? phase.id}`
}

export function SyncPokModal({ isOpen, onClose, initialProjectId }: SyncPokModalProps) {
  const fetchProjects = useFetchProjects()
  const fetchProjectStages = useFetchProjectStages()
  const importProjectPhaseEvidences = useImportProjectPhaseEvidences()
  const { error: showError } = useToast()

  const [projects, setProjects] = useState<Project[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedPhaseId, setSelectedPhaseId] = useState('')
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isLoadingPhases, setIsLoadingPhases] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncImport | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setError(null)
    setSyncResult(null)
    setSelectedProjectId(initialProjectId || '')
  }, [isOpen, initialProjectId])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let isCancelled = false

    const loadProjects = async () => {
      setIsLoadingProjects(true)
      try {
        const fetchedProjects = await fetchProjects()
        if (isCancelled) {
          return
        }

        setProjects(fetchedProjects)

        setSelectedProjectId((currentProjectId) => {
          if (currentProjectId && fetchedProjects.some((project) => project.id === currentProjectId)) {
            return currentProjectId
          }
          if (initialProjectId && fetchedProjects.some((project) => project.id === initialProjectId)) {
            return initialProjectId
          }
          return fetchedProjects[0]?.id || ''
        })
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'No se pudieron cargar los proyectos'
          setError(errorMessage)
          showError(errorMessage)
          setProjects([])
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingProjects(false)
        }
      }
    }

    loadProjects()

    return () => {
      isCancelled = true
    }
  }, [initialProjectId, isOpen, showError])

  useEffect(() => {
    if (!isOpen || !selectedProjectId) {
      setPhases([])
      setSelectedPhaseId('')
      return
    }

    let isCancelled = false

    const loadPhases = async () => {
      setIsLoadingPhases(true)
      setError(null)
      setSyncResult(null)

      try {
        const fetchedPhases = await fetchProjectStages(selectedProjectId)
        if (isCancelled) {
          return
        }

        setPhases(fetchedPhases)
        setSelectedPhaseId((currentPhaseId) => {
          if (currentPhaseId && fetchedPhases.some((phase) => getPhaseOptionValue(phase) === currentPhaseId)) {
            return currentPhaseId
          }
          return fetchedPhases[0] ? getPhaseOptionValue(fetchedPhases[0]) : ''
        })
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'No se pudieron cargar las etapas'
          setError(errorMessage)
          showError(errorMessage)
          setPhases([])
          setSelectedPhaseId('')
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPhases(false)
        }
      }
    }

    loadPhases()

    return () => {
      isCancelled = true
    }
  }, [isOpen, selectedProjectId, showError])

  const handleClose = () => {
    if (!isSyncing) {
      onClose()
    }
  }

  const handleSync = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!selectedProjectId || !selectedPhaseId) {
      return
    }

    setIsSyncing(true)
    setError(null)
    setSyncResult(null)

    try {
      const response = await importProjectPhaseEvidences(selectedProjectId, selectedPhaseId)

      if (!response?.Success || !response.sync) {
        throw new Error('La API no devolvio informacion de sincronizacion')
      }

      setSyncResult(response.sync)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'No se pudo iniciar la importacion de evidencias'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Dialog open={isOpen} onClose={handleClose} size="md">
      <DialogTitle>Import Evidence</DialogTitle>
      <DialogDescription>
        Selecciona proyecto y etapa para importar evidencias desde POK.
      </DialogDescription>
      <DialogBody>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <Field>
            <Label>Proyecto</Label>
            <Select
              value={selectedProjectId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedProjectId(e.target.value)}
              disabled={isLoadingProjects || isSyncing}
            >
              <option value="">{isLoadingProjects ? 'Cargando proyectos...' : 'Seleccionar proyecto'}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {getProjectName(project)}
                </option>
              ))}
            </Select>
          </Field>

          <Field>
            <Label>Etapa</Label>
            <Select
              value={selectedPhaseId}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedPhaseId(e.target.value)}
              disabled={!selectedProjectId || isLoadingPhases || isSyncing}
            >
              <option value="">
                {!selectedProjectId
                  ? 'Seleccionar proyecto primero'
                  : isLoadingPhases
                    ? 'Cargando etapas...'
                    : 'Seleccionar etapa'}
              </option>
              {phases.map((phase) => (
                <option key={getPhaseOptionValue(phase)} value={getPhaseOptionValue(phase)}>
                  {getPhaseName(phase)}
                </option>
              ))}
            </Select>
          </Field>

          {syncResult && (
            <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-200">
              <p>
                Se inicia importacion de <strong>{syncResult.total}</strong> credentials, podras ver las mismas desde
                la pantalla de evidencia del proyecto y etapa correspondiente.
              </p>
              <p className="font-medium">
                Job ID: {syncResult.jobId} | Status: {syncResult.status}
              </p>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        <Button outline onClick={handleClose} disabled={isSyncing}>
          Cerrar
        </Button>
        <Button
          type="button"
          onClick={handleSync}
          disabled={isSyncing || !selectedProjectId || !selectedPhaseId || isLoadingProjects || isLoadingPhases}
        >
          {isSyncing ? 'Importando...' : 'Import Evidence'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
