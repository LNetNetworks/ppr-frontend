'use client'

import { Button } from '@/components/button'
import { Dialog, DialogActions, DialogBody, DialogTitle } from '@/components/dialog'

export interface ProofPreview {
  hash?: string | null
  fileUrl?: string | null
  uri?: string | null
  stageName?: string | null
}

interface ProofViewModalProps {
  proof: ProofPreview | null
  isOpen: boolean
  onClose: () => void
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']

function getFileExtension(url: string): string {
  try {
    const pathname = new URL(url, 'http://localhost').pathname
    return pathname.split('.').pop()?.toLowerCase() || ''
  } catch {
    return url.split('?')[0]?.split('#')[0]?.split('.').pop()?.toLowerCase() || ''
  }
}

export function ProofViewModal({ proof, isOpen, onClose }: ProofViewModalProps) {
  if (!proof) return null

  const sourceUrl = proof.fileUrl || proof.uri || null
  const txUrl = proof.hash ? `https://explorer.l-net.io/tx/${proof.hash}` : null
  const extension = sourceUrl ? getFileExtension(sourceUrl) : ''
  const isImage = IMAGE_EXTENSIONS.includes(extension)
  const isPdf = extension === 'pdf'

  return (
    <Dialog open={isOpen} onClose={onClose} size="5xl">
      <DialogTitle>{proof.stageName ? `Proof - ${proof.stageName}` : 'Proof preview'}</DialogTitle>
      <DialogBody>
        <div className="space-y-4">
          {sourceUrl ? (
            <>
              {isImage ? (
                <div className="max-h-[70vh] overflow-auto rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                  <img src={sourceUrl} alt="Proof preview" className="mx-auto h-auto max-w-full rounded-md object-contain" />
                </div>
              ) : isPdf ? (
                <iframe
                  src={sourceUrl}
                  title="Proof document preview"
                  className="h-[70vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                  Preview for this file type is not available in the modal.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
              No proof file URL available for this stage.
            </div>
          )}

          {proof.hash && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Hash</p>
              <code className="block font-mono text-xs break-all text-zinc-700 dark:text-zinc-300">{proof.hash}</code>
            </div>
          )}
        </div>
      </DialogBody>
      <DialogActions>
        {sourceUrl && (
          <Button href={sourceUrl} target="_blank" rel="noopener noreferrer" outline>
            Open file in new tab
          </Button>
        )}
        {txUrl && (
          <Button href={txUrl} target="_blank" rel="noopener noreferrer" outline>
            Open transaction
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}
