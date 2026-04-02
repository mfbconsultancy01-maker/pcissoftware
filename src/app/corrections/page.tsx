'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'

export default function CorrectionsPage() {
  const [convs, setConvs] = useState<any[]>([])
  const [selectedConv, setSelectedConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [correcting, setCorrecting] = useState<string | null>(null) // message ID being corrected
  const [correctionText, setCorrectionText] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<string[]>([])
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  useEffect(() => {
    api.getConversations().then(d => setConvs(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  async function selectConv(conv: any) {
    setSelectedConv(conv)
    setCorrecting(null)
    try {
      const msgs = await api.getConversationMessages(conv.id)
      setMessages(Array.isArray(msgs) ? msgs : [])
    } catch { setMessages([]) }
  }

  async function submitCorrection(messageId: string) {
    if (!correctionText.trim() || submitting) return
    setSubmitting(true)

    try {
      await api.submitCorrection(messageId, correctionText.trim(), correctionNote.trim() || undefined)
      setSubmitted([...submitted, messageId])
      setCorrecting(null)
      setCorrectionText('')
      setCorrectionNote('')
    } catch {}

    setSubmitting(false)
  }

  async function sendFeedback() {
    if (!feedbackText.trim()) return
    try {
      await api.submitFeedback(feedbackText.trim())
      setFeedbackSent(true)
      setFeedbackText('')
      setTimeout(() => setFeedbackSent(false), 3000)
    } catch {}
  }

  // Sort conversations — most recent first, prioritize ones with AI responses
  const sorted = [...convs]
    .sort((a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .slice(0, 20)

  // Find AI response + client message pairs for correction
  const aiExchanges = messages.reduce((pairs: any[], msg, i) => {
    if (msg.direction === 'outbound' && msg.responseType !== 'manual') {
      // Find the client message this was responding to
      const clientMsg = messages.slice(0, i).reverse().find((m: any) => m.direction === 'inbound')
      if (clientMsg) {
        pairs.push({ client: clientMsg, ai: msg })
      }
    }
    return pairs
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Corrections & Training</h1>
        <p className="text-sm text-pcis-text-secondary mt-1">Review AI responses and teach your AI how you'd respond instead</p>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Conversation list */}
        <div className="w-72 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg overflow-hidden flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-pcis-border/50">
            <p className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted">CONVERSATIONS TO REVIEW</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {sorted.map(conv => (
              <div key={conv.id} onClick={() => selectConv(conv)}
                className={`px-4 py-3 border-b border-pcis-border/20 cursor-pointer transition-colors ${
                  selectedConv?.id === conv.id ? 'bg-pcis-gold/10 border-l-2 border-l-pcis-gold' : 'hover:bg-white/[0.03]'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold flex-shrink-0 ${
                    conv.needsHuman ? 'bg-red-500/15 text-red-400' : 'bg-pcis-border text-pcis-text-muted'
                  }`}>{conv.contact?.name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{conv.contact?.name || conv.contact?.phoneNumber || 'Unknown'}</p>
                    <p className="text-[10px] text-pcis-text-muted truncate mt-0.5">{conv.lastMessagePreview || '—'}</p>
                  </div>
                  <span className="text-[9px] text-pcis-text-muted flex-shrink-0">{conv.lastMessageAt ? timeAgo(new Date(conv.lastMessageAt)) : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review panel */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {!selectedConv ? (
            <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-12 text-center flex-1 flex items-center justify-center">
              <div>
                <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="mx-auto mb-3 text-pcis-text-muted/20">
                  <path d="M2 2h12v9H5l-3 3V2z" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5 6h6M5 8h3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                </svg>
                <p className="text-sm text-pcis-text-muted">Select a conversation to review AI responses</p>
                <p className="text-xs text-pcis-text-muted/60 mt-1">Click any AI response to correct it and teach your AI</p>
              </div>
            </div>
          ) : (
            <>
              {/* How it works banner */}
              <div className="bg-pcis-gold/5 border border-pcis-gold/10 rounded-lg px-4 py-3 flex-shrink-0">
                <p className="text-[10px] text-pcis-gold font-semibold">HOW CORRECTIONS WORK</p>
                <p className="text-[10px] text-pcis-text-secondary mt-0.5">Click "Correct this" on any AI response → Write how you'd actually respond → Submit. Your AI learns from every correction and gets more like you over time.</p>
              </div>

              {/* AI exchanges */}
              <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg overflow-hidden flex-shrink-0">
                <div className="p-4 border-b border-pcis-border/50">
                  <p className="text-xs font-semibold">{selectedConv.contact?.name || selectedConv.contact?.phoneNumber}</p>
                  <p className="text-[10px] text-pcis-text-muted">{aiExchanges.length} AI response{aiExchanges.length !== 1 ? 's' : ''} to review</p>
                </div>

                {aiExchanges.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-pcis-text-muted">No AI responses in this conversation to review</p>
                  </div>
                ) : (
                  <div className="divide-y divide-pcis-border/20">
                    {aiExchanges.map(({ client, ai }: any) => (
                      <div key={ai.id} className="p-4">
                        {/* Client message */}
                        <div className="mb-2">
                          <span className="text-[9px] text-pcis-text-muted font-semibold">CLIENT:</span>
                          <p className="text-xs text-pcis-text-secondary mt-0.5 bg-black/20 rounded-lg px-3 py-2">{client.content}</p>
                        </div>

                        {/* AI response */}
                        <div className="mb-2">
                          <span className="text-[9px] text-pcis-gold font-semibold">YOUR AI RESPONDED:</span>
                          <p className="text-xs mt-0.5 bg-pcis-gold/5 border border-pcis-gold/10 rounded-lg px-3 py-2">{ai.content}</p>
                        </div>

                        {/* Correction actions */}
                        {submitted.includes(ai.id) ? (
                          <div className="flex items-center gap-2 mt-2">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-green-400">
                              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                              <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-[10px] text-green-400 font-medium">Correction submitted — your AI will learn from this</span>
                          </div>
                        ) : correcting === ai.id ? (
                          <div className="mt-3 bg-black/20 rounded-lg border border-pcis-border/50 p-3">
                            <p className="text-[9px] text-pcis-text-muted font-semibold mb-2">WRITE HOW YOU'D ACTUALLY RESPOND:</p>
                            <textarea
                              value={correctionText}
                              onChange={e => setCorrectionText(e.target.value)}
                              placeholder="Type your ideal response here..."
                              className="w-full bg-black/30 border border-pcis-border rounded-lg px-3 py-2 text-xs text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none resize-none"
                              rows={3}
                              autoFocus
                            />
                            <textarea
                              value={correctionNote}
                              onChange={e => setCorrectionNote(e.target.value)}
                              placeholder="Optional: why is this better? (e.g. 'I never quote prices on first contact')"
                              className="w-full bg-black/30 border border-pcis-border rounded-lg px-3 py-2 text-xs text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none resize-none mt-2"
                              rows={2}
                            />
                            <div className="flex items-center justify-between mt-2">
                              <button onClick={() => { setCorrecting(null); setCorrectionText(''); setCorrectionNote('') }}
                                className="text-[10px] text-pcis-text-muted hover:text-white transition-colors">
                                Cancel
                              </button>
                              <button onClick={() => submitCorrection(ai.id)} disabled={!correctionText.trim() || submitting}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                                  correctionText.trim() && !submitting ? 'bg-pcis-gold text-black hover:bg-pcis-gold/90' : 'bg-pcis-border/30 text-pcis-text-muted cursor-not-allowed'
                                }`}>
                                {submitting ? 'Submitting...' : 'Submit Correction'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => { setCorrecting(ai.id); setCorrectionText(ai.content) }}
                              className="text-[10px] text-pcis-gold hover:text-pcis-gold/80 font-medium transition-colors">
                              ✎ Correct this
                            </button>
                            <span className="text-[10px] text-pcis-text-muted/30">|</span>
                            <button onClick={() => setSubmitted(prev => [...prev, ai.id])}
                              className="text-[10px] text-green-400/60 hover:text-green-400 transition-colors">
                              ✓ Looks good
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick feedback */}
              <div className="bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg p-4 flex-shrink-0">
                <p className="text-[10px] font-bold tracking-[0.12em] text-pcis-text-muted mb-2">GENERAL FEEDBACK</p>
                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder="e.g. 'Never mention pricing until they've asked twice' or 'Always suggest a viewing for Palm Jumeirah inquiries'..."
                  className="w-full bg-black/30 border border-pcis-border rounded-lg px-4 py-2.5 text-xs text-pcis-text placeholder:text-pcis-text-muted/40 focus:outline-none focus:border-pcis-gold/30 resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between mt-2">
                  {feedbackSent && <span className="text-[10px] text-green-400">Feedback sent</span>}
                  {!feedbackSent && <span />}
                  <button onClick={sendFeedback} disabled={!feedbackText.trim()}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                      feedbackText.trim() ? 'bg-pcis-gold text-black hover:bg-pcis-gold/90' : 'bg-pcis-border/30 text-pcis-text-muted cursor-not-allowed'
                    }`}>
                    Send Feedback
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}