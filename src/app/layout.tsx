import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
// Clerk dark theme applied via inline variables below
import { AuthProvider } from '@/components/AuthProvider'
import AppLayout from '@/components/AppLayout'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'PCIS P1 — Advisor Intelligence',
  description: 'Private Client Intelligence System — Advisor Dashboard',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/android-icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon-180x180.png', sizes: '180x180', type: 'image/png' },
      { url: '/apple-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/apple-icon-144x144.png', sizes: '144x144', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      appearance={{
        // Dark theme via variables
        variables: {
          colorPrimary: '#c9a55a',
          colorBackground: '#0a0a0a',
          colorInputBackground: 'rgba(255,255,255,0.05)',
          colorInputText: '#ffffff',
          borderRadius: '0.75rem',
        },
        elements: {
          formButtonPrimary: 'bg-[#c9a55a] hover:bg-[#b8943f] text-black',
          card: 'bg-[#0a0a0a]/90 border border-white/10 backdrop-blur-sm',
          headerTitle: 'text-[#c9a55a] font-serif',
          headerSubtitle: 'text-gray-400',
          socialButtonsBlockButton: 'border-white/10 text-white hover:bg-white/5',
          formFieldInput: 'bg-white/5 border-white/10 text-white',
          footerActionLink: 'text-[#c9a55a] hover:text-[#b8943f]',
        },
      }}
    >
      <html lang="en">
        <body className={`${inter.className} ${playfair.variable} bg-pcis-black text-pcis-text`}>
          <AuthProvider>
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
