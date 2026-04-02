'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function LeadsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all')

  useEffect(() => { api.getContacts().then(d => setContacts(Array.isArray(d) ? d : [])).catch(() => {}) }, [])

  const hot = contacts.filter(c => c.commercialScore >= 8)
  const warm = contacts.filter(c => c.commercialScore >= 5 && c.commercialScore < 8)
  const cold = contacts.filter(c => c.commercialScore < 5)

  const filtered = contacts.filter(c => {
    if (filter === 'hot') return c.commercialScore >= 8
    if (filter === 'warm') return c.commercialScore >= 5 && c.commercialScore < 8
    if (filter === 'cold') return c.commercialScore < 5
    return true
  }).sort((a, b) => (b.commercialScore || 0) - (a.commercialScore || 0))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-sm text-pcis-text-secondary mt-1">{contacts.length} contacts tracked by your AI</p>
        </div>
        <div className="flex gap-2">
          {([['all', `All (${contacts.length})`], ['hot', `Hot (${hot.length})`], ['warm', `Warm (${warm.length})`], ['cold', `Cold (${cold.length})`]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id as any)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                filter === id ? 'bg-pcis-gold/15 text-pcis-gold border-pcis-gold/30' : 'bg-black/20 text-pcis-text-muted border-pcis-border/50 hover:text-white'
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
          <p className="text-xs text-pcis-text-muted">Hot Leads</p>
          <p className="text-2xl font-bold mt-1 text-red-400">{hot.length}</p>
          <p className="text-[10px] text-pcis-text-muted mt-1">Score 8-10 · Ready to close</p>
        </div>
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
          <p className="text-xs text-pcis-text-muted">Warm Leads</p>
          <p className="text-2xl font-bold mt-1 text-yellow-400">{warm.length}</p>
          <p className="text-[10px] text-pcis-text-muted mt-1">Score 5-7 · Nurturing</p>
        </div>
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
          <p className="text-xs text-pcis-text-muted">Conversion Rate</p>
          <p className="text-2xl font-bold mt-1 text-pcis-gold">{contacts.length > 0 ? `${Math.round(hot.length / contacts.length * 100)}%` : '—'}</p>
          <p className="text-[10px] text-pcis-text-muted mt-1">Contact → Hot lead</p>
        </div>
      </div>

      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
        {filtered.length === 0 ? (
          <p className="text-sm text-pcis-text-muted text-center py-8">No contacts found</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="text-[10px] text-pcis-text-muted border-b border-pcis-border/50 uppercase tracking-wider">
                <td className="pb-2 pl-2">#</td><td className="pb-2">Contact</td><td className="pb-2">Phone</td>
                <td className="pb-2">Score</td><td className="pb-2">Category</td><td className="pb-2">Messages</td>
                <td className="pb-2 text-right pr-2">Last Contact</td>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 25).map((c, i) => (
                <tr key={c.id} className="border-b border-pcis-border/20 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 pl-2 text-xs text-pcis-text-muted">{i + 1}</td>
                  <td className="py-3 text-sm font-medium">{c.name || 'Unknown'}</td>
                  <td className="py-3 text-xs text-pcis-text-secondary">{c.phoneNumber}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1.5 bg-pcis-border/30 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.commercialScore >= 8 ? 'bg-red-500' : c.commercialScore >= 5 ? 'bg-yellow-500' : 'bg-white/10'}`}
                          style={{ width: `${(c.commercialScore || 0) * 10}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${c.commercialScore >= 8 ? 'text-red-400' : c.commercialScore >= 5 ? 'text-yellow-400' : 'text-pcis-text-muted'}`}>{c.commercialScore || 0}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      c.commercialCategory === 'HOT' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      c.commercialCategory === 'WARM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-black/20 text-pcis-text-muted border-pcis-border/30'
                    }`}>{c.commercialCategory || 'COLD'}</span>
                  </td>
                  <td className="py-3 text-sm text-pcis-text-secondary">{c.totalMessages || 0}</td>
                  <td className="py-3 text-xs text-pcis-text-muted text-right pr-2">
                    {c.lastContactAt ? new Date(c.lastContactAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}