'use client'

import { ChevronRightIcon, HomeIcon } from '@heroicons/react/20/solid'
import clsx from 'clsx'
import { Link } from './link'
import { generateBreadcrumbs, isRoleSegment } from './breadcrumb.utils'
import { usePathname } from 'next/navigation'

export function Breadcrumb({ className }: { className?: string }) {
  const pathname = usePathname()
  const breadcrumbs = generateBreadcrumbs(pathname)
  const firstSegment = pathname?.split('/').filter(Boolean)[0]
  const shouldShowHomeIcon = isRoleSegment(firstSegment)

  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={clsx('mb-6', className)}>
      <ol className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => (
          <li key={`${item.href}-${index}`} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRightIcon
                className="size-4 shrink-0 text-zinc-400 dark:text-zinc-500"
                aria-hidden="true"
              />
            )}
            {item.isCurrent ? (
              <span className="font-medium text-zinc-900 dark:text-white" aria-current="page">
                {index === 0 && shouldShowHomeIcon ? (
                  <span className="flex items-center gap-1.5">
                    <HomeIcon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {index === 0 && shouldShowHomeIcon ? (
                  <span className="flex items-center gap-1.5">
                    <HomeIcon className="size-4 shrink-0" aria-hidden="true" />
                    {item.label}
                  </span>
                ) : (
                  item.label
                )}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
