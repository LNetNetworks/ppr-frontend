'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'
import { Input } from '@/components/input'
import { useAuth } from '@/hooks/use-auth'
import { useApiClient } from '@/lib/api-services'
import type { Phase } from '@/types/api'
import { useToast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

interface ContributionModalProps {
  isOpen: boolean
  onClose: () => void
  stage: Phase | null
  projectId: string
  projectTotalContributed: number
}

export function ContributionModal({
  isOpen,
  onClose,
  stage,
  projectId,
  projectTotalContributed,
}: ContributionModalProps) {
  const api = useApiClient()
  const router = useRouter()
  const { userInfo } = useAuth()
  const { success: showSuccess, error: showError } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  // isSuccess removed
  const [error, setError] = useState<string | null>(null)
  const [contributionAmount, setContributionAmount] = useState<string>('')

  // Calculate values from stage
  const stageWeight = (stage?.stageWeight as number) || 0
  const contributionRequired = stage?.contributionRequired || 0
  const contributionReceived = stage?.contributionReceived || 0

  // Calculate suggested amount based on stage weight
  const suggestedAmount = useMemo(() => {
    if (projectTotalContributed <= 0 || stageWeight <= 0) {
      return contributionRequired - contributionReceived
    }
    const weightedAmount = projectTotalContributed * (stageWeight / 100)
    const remaining = weightedAmount - contributionReceived
    return Math.max(0, Math.round(remaining * 100) / 100)
  }, [projectTotalContributed, stageWeight, contributionReceived, contributionRequired])

  // Pre-fill the contribution amount when stage changes
  useEffect(() => {
    if (stage && isOpen) {
      setContributionAmount(suggestedAmount.toString())
      setError(null)
      
    }
  }, [stage, isOpen, suggestedAmount])

  const handleClose = () => {
    if (!isLoading) {
      setContributionAmount('')
      setError(null)
      
      onClose()
    }
  }

  const handleContribute = async () => {
    if (!stage || !projectId || !userInfo) {
      setError('Missing required information')
      return
    }

    const amount = parseFloat(contributionAmount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const phaseProjectId = stage.idPhaseProject || stage.id
      const today = new Date().toISOString().split('T')[0]

      await api.post('/contributions', {
        id_project: projectId,
        id_user: userInfo.sub || '',
        deposit_amount: amount,
        id_phase_project: phaseProjectId,
        date_contribution: today,
      })

      showSuccess(`Contribution of ${formatCurrency(amount)} tokens processed successfully!`)
      handleSuccessClose()
    } catch (err) {
      console.error('Contribution failed:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to process contribution'
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuccessClose = () => {
    
    setContributionAmount('')
    setError(null)
    onClose()
    router.refresh()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const progressPercentage =
    contributionRequired > 0 ? Math.min(100, Math.round((contributionReceived / contributionRequired) * 100)) : 0

  return (
    <Dialog open={isOpen} onClose={handleClose} size="md">
      <DialogTitle>Contribute to Stage</DialogTitle>
      <DialogBody>
        <div className="space-y-6">
          {/* Stage Info */}
          <div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Stage</p>
            <p className="mt-1 text-base font-semibold text-zinc-950 dark:text-white">{stage?.name || 'N/A'}</p>
          </div>

          {/* isSuccess card removed */}
            <div className="space-y-5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Project Total */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                    Project Total Contributed
                  </p>
                  <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
                    {formatCurrency(projectTotalContributed)}
                  </p>
                </div>

                {/* Stage Weight */}
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
                  <p className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
                    Stage Weight
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-600 dark:text-blue-400">{stageWeight}%</p>
                </div>
              </div>

              {/* Stage Progress */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Stage Contribution Progress</p>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-white">{progressPercentage}%</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Liquidated: </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(contributionReceived)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 dark:text-zinc-400">Required: </span>
                    <span className="font-semibold text-zinc-900 dark:text-white">
                      {formatCurrency(contributionRequired)}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all dark:bg-emerald-400"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Contribution Input */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                <label
                  htmlFor="contribution-amount"
                  className="block text-sm font-medium text-blue-900 dark:text-blue-200"
                >
                  Contribution Amount
                </label>
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">
                  Suggested based on stage weight: {formatCurrency(suggestedAmount)}
                </p>
                <div className="mt-2">
                  <Input
                    id="contribution-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
        </div>
      </DialogBody>
      <DialogActions>
        <>
          <Button type="button" outline onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="button" onClick={handleContribute} disabled={isLoading || !contributionAmount}>
            {isLoading ? 'Processing...' : 'Contribute'}
          </Button>
        </>
      </DialogActions>
    </Dialog>
  )
}
