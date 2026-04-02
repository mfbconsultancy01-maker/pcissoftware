'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function ProfilePage() {
  const [onboarding, setOnboarding] = useState<any>(null)
  const [profile, setProfile] = useState<any>({})
  const [tone, setTone] = useState<any>({})
  const [editing, setEditing] = useState<'profile' | 'tone' | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  // Editable copies
  const [editProfile, setEditProfile] = useState<any>({})
  const [editTone, setEditTone] = useState<any>({})

  useEffect(() => {
    Promise.all([
      api.getOnboardingStatus(),
      api.getBrokerProfile(),
      api.getToneSettings(),
    ]).then(([onb, prof, tn]) => {
      setOnboarding(onb)
      setProfile(prof || {})
      setTone(tn || {})
    }).catch(() => {})
  }, [])

  function startEditProfile() {
    setEditProfile({ ...profile })
    setEditing('profile')
  }

  function startEditTone() {
    setEditTone({ ...tone })
    setEditing('tone')
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await api.updateBrokerProfile(editProfile)
      setProfile(editProfile)
      setEditing(null)
      setSaved('profile')
      setTimeout(() => setSaved(null), 3000)
    } catch {}
    setSaving(false)
  }

  async function saveTone() {
    setSaving(true)
    try {
      await api.updateToneSettings(editTone)
      setTone(editTone)
      setEditing(null)
      setSaved('tone')
      setTimeout(() => setSaved(null), 3000)
    } catch {}
    setSaving(false)
  }

  const ic = "w-full bg-black/30 border border-pcis-border rounded-lg px-3 py-2 text-xs text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none transition-colors"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">AI Profile</h1>
        <p className="text-sm text-pcis-text-secondary mt-1">This is how your AI represents you — edit anything below and it takes effect immediately</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Broker Info */}
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted">BROKER INFORMATION</p>
            {editing === 'profile' ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="text-[10px] text-pcis-text-muted hover:text-white transition-colors">Cancel</button>
                <button onClick={saveProfile} disabled={saving}
                  className="px-3 py-1 rounded text-[10px] font-semibold bg-pcis-gold text-black hover:bg-pcis-gold/90 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={startEditProfile} className="text-[10px] text-pcis-gold hover:text-pcis-gold/80 transition-colors">
                {saved === 'profile' ? '✓ Saved' : 'Edit'}
              </button>
            )}
          </div>

          {editing === 'profile' ? (
            <div className="space-y-3">
              <EditField label="Name" value={editProfile.name || ''} onChange={v => setEditProfile({ ...editProfile, name: v })} placeholder="Your full name" />
              <EditField label="Company" value={editProfile.company || ''} onChange={v => setEditProfile({ ...editProfile, company: v })} placeholder="Company name" />
              <EditField label="Specialization" value={editProfile.specialization || ''} onChange={v => setEditProfile({ ...editProfile, specialization: v })} placeholder="e.g. Luxury villas in Palm Jumeirah" />
              <EditField label="Market" value={editProfile.market || ''} onChange={v => setEditProfile({ ...editProfile, market: v })} placeholder="e.g. Dubai" />
              <EditField label="Languages" value={Array.isArray(editProfile.languages) ? editProfile.languages.join(', ') : editProfile.languages || ''} onChange={v => setEditProfile({ ...editProfile, languages: v.split(',').map((s: string) => s.trim()) })} placeholder="English, Arabic, Dutch" />
              <div>
                <label className="text-[10px] text-pcis-text-muted mb-1 block">Experience</label>
                <textarea className={`${ic} resize-none`} rows={2} value={editProfile.experience || ''} onChange={e => setEditProfile({ ...editProfile, experience: e.target.value })} placeholder="e.g. 15 years in Dubai luxury real estate, previously at Engel & Völkers" />
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              <Row label="Name" value={profile.name || onboarding?.brokerName || '—'} />
              <Row label="Company" value={profile.company || '—'} />
              <Row label="Specialization" value={profile.specialization || '—'} />
              <Row label="Market" value={profile.market || '—'} />
              <Row label="Languages" value={Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages || '—'} />
              <Row label="Experience" value={profile.experience || '—'} />
            </div>
          )}
        </div>

        {/* Tone & Style */}
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted">COMMUNICATION STYLE</p>
            {editing === 'tone' ? (
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="text-[10px] text-pcis-text-muted hover:text-white transition-colors">Cancel</button>
                <button onClick={saveTone} disabled={saving}
                  className="px-3 py-1 rounded text-[10px] font-semibold bg-pcis-gold text-black hover:bg-pcis-gold/90 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <button onClick={startEditTone} className="text-[10px] text-pcis-gold hover:text-pcis-gold/80 transition-colors">
                {saved === 'tone' ? '✓ Saved' : 'Edit'}
              </button>
            )}
          </div>

          {editing === 'tone' ? (
            <div className="space-y-3">
              <EditField label="Formality" value={editTone.formality || ''} onChange={v => setEditTone({ ...editTone, formality: v })} placeholder="e.g. Professional but warm" />
              <EditField label="Response Length" value={editTone.responseLength || ''} onChange={v => setEditTone({ ...editTone, responseLength: v })} placeholder="e.g. Concise, 2-4 sentences" />
              <div>
                <label className="text-[10px] text-pcis-text-muted mb-1 block">Use Emojis</label>
                <div className="flex gap-2">
                  {[true, false].map(v => (
                    <button key={String(v)} onClick={() => setEditTone({ ...editTone, useEmojis: v })}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                        editTone.useEmojis === v ? 'bg-pcis-gold/15 text-pcis-gold border-pcis-gold/30' : 'bg-black/20 text-pcis-text-muted border-pcis-border/50'
                      }`}>
                      {v ? 'Yes 👋' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
              <EditField label="Greeting Style" value={editTone.greetingStyle || ''} onChange={v => setEditTone({ ...editTone, greetingStyle: v })} placeholder="e.g. Always greet by name" />
              <EditField label="Closing Style" value={editTone.closingStyle || ''} onChange={v => setEditTone({ ...editTone, closingStyle: v })} placeholder="e.g. Kind regards, [Name]" />
              <div>
                <label className="text-[10px] text-pcis-text-muted mb-1 block">Phrases to avoid</label>
                <textarea className={`${ic} resize-none`} rows={2} value={editTone.avoidPhrases || ''} onChange={e => setEditTone({ ...editTone, avoidPhrases: e.target.value })} placeholder="e.g. Don't say 'investment opportunity' or 'amazing deal'" />
              </div>
              <div>
                <label className="text-[10px] text-pcis-text-muted mb-1 block">Preferred phrases</label>
                <textarea className={`${ic} resize-none`} rows={2} value={editTone.preferredPhrases || ''} onChange={e => setEditTone({ ...editTone, preferredPhrases: e.target.value })} placeholder="e.g. 'Happy to help', 'Let me look into that'" />
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              <Row label="Formality" value={tone.formality || '—'} />
              <Row label="Response Length" value={tone.responseLength || '—'} />
              <Row label="Emojis" value={tone.useEmojis ? 'Yes' : tone.useEmojis === false ? 'No' : '—'} />
              <Row label="Greeting Style" value={tone.greetingStyle || '—'} />
              <Row label="Closing Style" value={tone.closingStyle || '—'} />
              <Row label="Avoid Phrases" value={tone.avoidPhrases || '—'} />
              <Row label="Preferred Phrases" value={tone.preferredPhrases || '—'} />
            </div>
          )}
        </div>
      </div>

      {/* AI Status */}
      <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
        <p className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted mb-4">AI STATUS</p>
        <div className="grid grid-cols-4 gap-4">
          <StatusCard label="Profile" value={onboarding?.hasProfile ? 'Active' : 'Not configured'} ok={onboarding?.hasProfile} />
          <StatusCard label="Training Data" value={`${onboarding?.conversationsUploaded || 0} conversations`} ok={(onboarding?.conversationsUploaded || 0) > 0} />
          <StatusCard label="Response Model" value="GPT-4o" ok={true} />
          <StatusCard label="Intent Model" value="GPT-4o-mini" ok={true} />
        </div>
        <div className="mt-4 pt-4 border-t border-pcis-border/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-pcis-text-muted">Fine-tune readiness</span>
            <span className="text-[10px] text-pcis-gold">{Math.min(Math.round((onboarding?.conversationsUploaded || 0) * 35 / 300 * 100), 100)}%</span>
          </div>
          <div className="w-full h-1.5 bg-pcis-border/30 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-pcis-gold/60 transition-all" style={{ width: `${Math.min((onboarding?.conversationsUploaded || 0) * 35 / 300 * 100, 100)}%` }} />
          </div>
          <p className="text-[9px] text-pcis-text-muted mt-2">Fine-tuning becomes available at 300 exchanges — the AI will become even more like you</p>
        </div>
      </div>

      {/* Learned Style */}
      {onboarding?.settings?.broker_prompt_summary && (
        <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-5">
          <p className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted mb-2">LEARNED COMMUNICATION STYLE</p>
          <p className="text-[10px] text-pcis-text-muted mb-4">Auto-generated from your uploaded conversations — this is what makes your AI sound like you</p>
          <div className="bg-black/20 rounded-lg border border-pcis-border/30 p-5 max-h-64 overflow-y-auto">
            <pre className="text-xs text-pcis-text-secondary whitespace-pre-wrap leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              {onboarding.settings.broker_prompt_summary}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-pcis-border/20 last:border-0">
      <span className="text-xs text-pcis-text-secondary">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function EditField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] text-pcis-text-muted mb-1 block">{label}</label>
      <input
        className="w-full bg-black/30 border border-pcis-border rounded-lg px-3 py-2 text-xs text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none transition-colors"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function StatusCard({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="bg-black/20 rounded-lg border border-pcis-border/30 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-[9px] text-pcis-text-muted">{label}</span>
      </div>
      <p className="text-xs font-medium">{value}</p>
    </div>
  )
}