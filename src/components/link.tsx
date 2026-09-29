'use client'

import * as Headless from '@headlessui/react'
import NextLink, { type LinkProps } from 'next/link'
import { usePathname } from 'next/navigation'
import React, { forwardRef } from 'react'
import { useNavigationLoading } from './navigation-loading'

function getHrefPath(href: LinkProps['href']): string | null {
  if (typeof href === 'string') {
    if (href.startsWith('#')) return null
    return href.split('#')[0] || '/'
  }

  if (href.pathname) {
    return href.pathname
  }

  return '/'
}

export const Link = forwardRef(function Link(
  { onClick, href, target, ...props }: LinkProps & React.ComponentPropsWithoutRef<'a'>,
  ref: React.ForwardedRef<HTMLAnchorElement>
) {
  const pathname = usePathname()
  const { startNavigation } = useNavigationLoading()

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)

    if (event.defaultPrevented) return
    if (event.button !== 0) return
    if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
    if (target === '_blank') return
    if (typeof href === 'string' && /^(mailto:|tel:)/.test(href)) return
    if (typeof href === 'string' && /^https?:\/\//.test(href)) {
      try {
        const url = new URL(href)
        if (url.origin !== window.location.origin) return
      } catch {
        return
      }
    }

    const targetPath = getHrefPath(href)
    if (!targetPath || targetPath === pathname) return

    startNavigation()
  }

  return (
    <Headless.DataInteractive>
      <NextLink {...props} href={href} target={target} onClick={handleClick} ref={ref} />
    </Headless.DataInteractive>
  )
})
