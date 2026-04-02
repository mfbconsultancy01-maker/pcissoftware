'use client'

import { useState } from 'react'

interface LoginScreenProps {
  onLogin: (tenant: { id: string; name: string; dashboardType: string }) => void
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // For now, simple local check (later connect to Railway API)
    if (code === 'PCIS-ADMIN' && pin === '1234') {
      const tenant = { id: '1', name: 'Admin', dashboardType: 'admin' }
      localStorage.setItem('pcis_tenant', JSON.stringify(tenant))
      localStorage.setItem('pcis_authenticated', 'true')
      onLogin(tenant)
    } else {
      setError('Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-black"
      style={{
        backgroundImage: 'url("/Dubai-Skyline.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 w-full max-w-md p-8">
        <div className="bg-[#0a0a0a]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif text-pcis-gold tracking-wide">PCIS</h1>
            <p className="text-[10px] text-gray-500 tracking-[0.25em] mt-1">COMMAND CENTER</p>
          </div>

          <h2 className="text-xl font-medium text-white text-center mb-2">Welcome back</h2>
          <p className="text-sm text-gray-400 text-center mb-8">Enter your access code to continue</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Access Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="PCIS-XXXX"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-pcis-gold transition-colors"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="****"
                maxLength={6}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 outline-none focus:border-pcis-gold transition-colors"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pcis-gold text-black font-medium py-3 rounded-lg hover:bg-pcis-gold/90 transition-colors disabled:opacity-50 mt-6"
            >
              {loading ? 'Verifying...' : 'Continue'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-600 mt-8">
            Don't have an access code?{' '}
            <span className="text-pcis-gold cursor-pointer">Contact support</span>
          </p>
        </div>
      </div>
    </div>
  )
}