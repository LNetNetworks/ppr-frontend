import { BarsArrowUpIcon, MagnifyingGlassIcon } from '@heroicons/react/16/solid'

interface HeaderWithSearchBarProps {
  title: string
  placeholder?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  description?: string
}

export default function HeaderWithSearchBar({
  title,
  placeholder = 'Search candidates',
  searchValue,
  onSearchChange,
  description,
}: HeaderWithSearchBarProps) {
  return (
    <div className="border-b border-zinc-200 pb-5 dark:border-white/10">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-white">{title}</h3>
          {description && <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{description}</p>}
        </div>
        <div className="mt-3 flex sm:mt-0 sm:ml-4">
          <div className="-mr-px grid grow grid-cols-1 focus-within:relative">
            <input
              id="query"
              name="query"
              type="text"
              placeholder={placeholder}
              aria-label={placeholder}
              value={searchValue || ''}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="col-start-1 row-start-1 block w-full rounded-l-md bg-white py-1.5 pr-3 pl-10 text-base text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 placeholder:text-zinc-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:pl-9 sm:text-sm/6 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-400 dark:focus:outline-blue-500"
            />
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center text-zinc-500 sm:size-4 dark:text-zinc-400"
            />
          </div>
          <button
            type="button"
            className="flex shrink-0 items-center gap-x-1.5 rounded-r-md bg-white px-3 py-2 text-sm font-semibold text-zinc-950 outline-1 -outline-offset-1 outline-zinc-950/10 hover:bg-zinc-50 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:hover:bg-white/20 dark:focus:outline-blue-500"
          >
            <BarsArrowUpIcon aria-hidden="true" className="-ml-0.5 size-4 text-zinc-500 dark:text-zinc-400" />
            Sort
          </button>
        </div>
      </div>
    </div>
  )
}
