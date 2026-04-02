'use client'

import { usePathname } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import Header from '@/components/Header'
import PersonalAssistant from '@/components/PersonalAssistant'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isSignedIn, isLoaded } = useAuth()
  const isWorkspace = pathname === '/workspace'
  const isAuthPage = pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')

  // Full-screen layout for auth pages (no sidebar/header)
  if (isAuthPage || (!isLoaded) || (!isSignedIn)) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen relative z-10">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className={`flex-1 min-h-0 overflow-hidden ${isWorkspace ? '' : 'overflow-y-auto p-6'}`}>
          {children}
        </main>
      </div>
      <PersonalAssistant />
    </div>
  )
}
