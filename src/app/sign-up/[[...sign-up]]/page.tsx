'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative">
      {/* Same milky way background as the portal */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url("/milky-bg.jpeg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.10,
          mixBlendMode: 'screen',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-[#111111] border border-[#c9a55a]/20 backdrop-blur-sm shadow-[0_0_60px_rgba(201,165,90,0.08)]',
              headerTitle: 'text-[#c9a55a] text-2xl',
              headerSubtitle: 'text-gray-400',
              formButtonPrimary: 'bg-[#c9a55a] hover:bg-[#b8943f] text-black font-medium',
              formFieldInput: 'bg-white/5 border-white/10 text-white placeholder-gray-500',
              socialButtonsBlockButton: 'border-white/10 text-white hover:bg-white/5',
              footerActionLink: 'text-[#c9a55a] hover:text-[#b8943f]',
              dividerLine: 'bg-white/10',
              dividerText: 'text-gray-500',
            },
          }}
        />
      </div>
    </div>
  )
}
