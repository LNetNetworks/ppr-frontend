interface ProgressBarProps {
  progress: number
  label?: string
}

export default function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div>
      <h4 className="sr-only">Progress</h4>
      {label && <p className="text-sm font-medium text-zinc-900 dark:text-white">{label}</p>}
      <div aria-hidden="true" className={label ? 'mt-4' : ''}>
        <div className="overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
          <div
            style={{ width: `${progress}%` }}
            className="h-2 rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-500"
          />
        </div>
      </div>
    </div>
  )
}
