import '@/styles/tailwind.css'
import { ToastProvider } from '@/components/toast'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import { KeycloakProvider } from '@/components/keycloak-provider'
import { getServerWebsiteTitle } from '@/lib/server-public-env'

// Downloaded at build time and served from this domain, so no request leaves
// the user's browser for a third party. Exposed as a CSS variable that
// tailwind.css reads through --font-sans.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const websiteTitle = getServerWebsiteTitle()

export const metadata: Metadata = {
  title: {
    template: `%s - ${websiteTitle}`,
    default: websiteTitle,
  },
  description: `${websiteTitle} is a platform for tracking and verifying the impact of projects.`,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} text-zinc-950 antialiased lg:bg-zinc-100 dark:bg-zinc-900 dark:text-white dark:lg:bg-zinc-950`}
    >
      <body>
        <Script src="/env.js" strategy="beforeInteractive" />
        <KeycloakProvider>
          <ToastProvider>{children}</ToastProvider>
        </KeycloakProvider>
      </body>
    </html>
  )
}
