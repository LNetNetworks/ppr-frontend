'use client'

import { Button } from '@/components/button'
import { Heading } from '@/components/heading'
import { Text, TextLink } from '@/components/text'
import { getWebsiteTitle } from '@/lib/app-config'
import { useKeycloak } from '@react-keycloak/web'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginContent() {
  const { keycloak, initialized } = useKeycloak()
  const router = useRouter()
  const searchParams = useSearchParams()
  const websiteTitle = getWebsiteTitle()

  useEffect(() => {
    if (initialized && keycloak?.authenticated) {
      // Redirect to the page user was trying to access, or home
      const redirectTo = searchParams.get('redirect') || '/'
      router.push(redirectTo)
    }
  }, [initialized, keycloak, router, searchParams])

  const handleLogin = () => {
    if (keycloak) {
      const redirectUri = window.location.origin + (searchParams.get('redirect') || '/')
      keycloak.login({
        redirectUri,
      })
    }
  }

  if (!initialized) {
    return (
      <div className="grid w-full max-w-sm grid-cols-1 gap-8">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (keycloak?.authenticated) {
    return null // Will redirect
  }

  return (
    <div className="grid w-full max-w-sm grid-cols-1 gap-8">
      <h1 className="text-2xl font-bold">{websiteTitle}</h1>

      <Heading>Sign in to your account</Heading>
      <Button onClick={handleLogin} className="w-full" type="button">
        Sign in with Keycloak
      </Button>
      <Text>
        Don't have an account?{' '}
        <TextLink href="/register">
          <strong>Sign up</strong>
        </TextLink>
      </Text>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="grid w-full max-w-sm grid-cols-1 gap-8">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
