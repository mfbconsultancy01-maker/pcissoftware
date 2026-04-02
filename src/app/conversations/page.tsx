'use client'

import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'

export default function ConversationsPage() {
  const [convs, setConvs] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'escalated' | 'hot'>('all')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [resolving, setResolving] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    load()
    const i = setInterval(load, 10000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Auto-focus input when selecting an escalated conversation
  useEffect(() => {
    if (selected?.needsHuman) setTimeout(() => inputRef.current?.focus(), 200)
  }, [selected])

  async function load() {
    try {
      const d = await api.getConversations()
      const list = Array.isArray(d) ? d : []
      setConvs(list)
      // Refresh selected conversation if it's still selected
      if (selected) {
        const updated = list.find((c: any) => c.id === selected.id)
        if (updated) setSelected(updated)
      }
    } catch {}
  }

  async function select(conv: any) {
    setSelected(conv)
    setReplyText('')
    try {
      const msgs = await api.getConversationMessages(conv.id)
      setMessages(Array.isArray(msgs) ? msgs : [])
    } catch { setMessages([]) }
  }

  async function sendReply() {
    if (!replyText.trim() || !selected || sending) return
    setSending(true)

    try {
      // Call backend to send message via WhatsApp
      const result = await api.sendMessage(selected.id, replyText.trim())

      if (result) {
        // Add message to local state immediately
        setMessages(prev => [...prev, {
          id: `local-${Date.now()}`,
          direction: 'outbound',
          content: replyText.trim(),
          createdAt: new Date().toISOString(),
          responseType: 'manual'
        }])
        setReplyText('')

        // Refresh conversation to get updated state
        setTimeout(() => {
          select(selected)
          load()
        }, 1000)
      }
    } catch (err) {
      console.error('Send failed:', err)
    }

    setSending(false)
  }

  async function resolveEscalation() {
    if (!selected || resolving) return
    setResolving(true)

    try {
      await api.resolveConversation(selected.id)
      setSelected({ ...selected, needsHuman: false })
      // Refresh list
      setTimeout(load, 500)
    } catch {}

    setResolving(false)
  }

  const escalatedCount = convs.filter(c => c.needsHuman).length
  const hotCount = convs.filter(c => c.contact?.commercialScore >= 8).length

  const filtered = convs.filter(c => {
    if (filter === 'escalated') return c.needsHuman
    if (filter === 'hot') return c.contact?.commercialScore >= 8
    return true
  }).sort((a: any, b: any) => {
    // Escalated first, then by last message time
    if (a.needsHuman && !b.needsHuman) return -1
    if (!a.needsHuman && b.needsHuman) return 1
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-sm text-pcis-text-secondary mt-1">{convs.length} total · {escalatedCount > 0 ? `${escalatedCount} need your attention` : 'All handled by AI'}</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'escalated', 'hot'] as const).map(f => {
            const count = f === 'all' ? convs.length : f === 'escalated' ? escalatedCount : hotCount
            return (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  filter === f ? 'bg-pcis-gold/15 text-pcis-gold border-pcis-gold/30' : 'bg-black/20 text-pcis-text-muted border-pcis-border/50 hover:text-white'
                } ${f === 'escalated' && escalatedCount > 0 && filter !== f ? 'border-red-500/30 text-red-400' : ''}`}>
                {f === 'all' ? `All (${count})` : f === 'escalated' ? `Escalated (${count})` : `Hot (${count})`}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex gap-4" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Conversation List */}
        <div className="w-80 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg overflow-hidden flex flex-col flex-shrink-0">
          <div className="p-3 border-b border-pcis-border/50">
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase">{filtered.length} conversations</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-xs text-pcis-text-muted">{filter === 'escalated' ? 'No escalated conversations' : 'No conversations yet'}</p>
              </div>
            ) : filtered.map(conv => (
              <div key={conv.id} onClick={() => select(conv)}
                className={`px-4 py-3 border-b border-pcis-border/20 cursor-pointer transition-colors ${
                  selected?.id === conv.id ? 'bg-pcis-gold/10 border-l-2 border-l-pcis-gold' : 'hover:bg-white/[0.03]'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0 ${
                    conv.needsHuman ? 'bg-red-500/15 text-red-400' : conv.contact?.commercialScore >= 8 ? 'bg-pcis-gold/15 text-pcis-gold' : 'bg-pcis-border text-pcis-text-muted'
                  }`}>{conv.contact?.name?.charAt(0) || '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{conv.contact?.name || conv.contact?.phoneNumber || 'Unknown'}</p>
                      {conv.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-pcis-gold text-black text-[8px] font-bold flex items-center justify-center flex-shrink-0">{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-xs text-pcis-text-muted truncate mt-0.5">{conv.lastMessagePreview || 'No messages'}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[9px] text-pcis-text-muted">{conv.lastMessageAt ? timeAgo(new Date(conv.lastMessageAt)) : ''}</span>
                    {conv.needsHuman && <span className="text-[7px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">ESCALATED</span>}
                    {!conv.needsHuman && conv.contact?.commercialScore >= 8 && <span className="text-[7px] font-bold text-pcis-gold bg-pcis-gold/10 px-1.5 py-0.5 rounded">HOT</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border rounded-lg overflow-hidden flex flex-col">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="mx-auto mb-3 text-pcis-text-muted/20">
                  <path d="M2 2h12v9H5l-3 3V2z" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <p className="text-sm text-pcis-text-muted">Select a conversation</p>
                {escalatedCount > 0 && (
                  <p className="text-xs text-red-400 mt-1">{escalatedCount} conversation{escalatedCount > 1 ? 's' : ''} need your attention</p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-4 border-b border-pcis-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                    selected.needsHuman ? 'bg-red-500/15 text-red-400' : 'bg-pcis-gold/15 text-pcis-gold'
                  }`}>{selected.contact?.name?.charAt(0) || '?'}</div>
                  <div>
                    <p className="text-sm font-semibold">{selected.contact?.name || selected.contact?.phoneNumber}</p>
                    <p className="text-[10px] text-pcis-text-muted">{selected.contact?.phoneNumber} · Score: {selected.contact?.commercialScore || 0}/10 · {selected.contact?.commercialCategory || 'NEW'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selected.needsHuman && (
                    <button onClick={resolveEscalation} disabled={resolving}
                      className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-green-500/15 text-green-400 border border-green-500/20 hover:bg-green-500/25 transition-colors">
                      {resolving ? 'Resolving...' : '✓ Mark Resolved'}
                    </button>
                  )}
                  <span className={`text-[10px] px-2.5 py-1.5 rounded-lg ${
                    selected.needsHuman ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'
                  }`}>{selected.needsHuman ? 'Needs You' : 'AI Handling'}</span>
                </div>
              </div>

              {/* Escalation banner */}
              {selected.needsHuman && (
                <div className="px-4 py-2.5 bg-red-500/5 border-b border-red-500/10 flex items-center gap-2">
                  <span className="text-[10px] text-red-400">This conversation was escalated to you. Reply below or mark as resolved to return it to AI.</span>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg: any) => (
                  <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg text-sm ${
                      msg.direction === 'outbound'
                        ? msg.responseType === 'manual'
                          ? 'bg-blue-500/10 border border-blue-500/15'  // Manual reply
                          : 'bg-pcis-gold/10 border border-pcis-gold/15'  // AI response
                        : 'bg-black/30 border border-pcis-border/30'  // Client message
                    }`}>
                      <div className="px-4 py-2.5"><p className="whitespace-pre-wrap">{msg.content}</p></div>
                      <div className="px-4 py-1.5 border-t border-black/10 flex items-center justify-between gap-4">
                        <span className="text-[10px] text-pcis-text-muted">
                          {msg.direction === 'outbound'
                            ? msg.responseType === 'manual' ? '👤 You' : '🤖 AI'
                            : '💬 Client'}
                        </span>
                        <span className="text-[10px] text-pcis-text-muted">{new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              {/* Reply Input */}
              <div className="p-3 border-t border-pcis-border/50 bg-black/20">
                <div className="flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendReply()
                      }
                    }}
                    placeholder={selected.needsHuman ? 'Type your reply — this will be sent via WhatsApp...' : 'Override AI — send a personal message...'}
                    className="flex-1 bg-black/30 border border-pcis-border rounded-lg px-4 py-2.5 text-sm text-pcis-text placeholder:text-pcis-text-muted/40 focus:border-pcis-gold/30 focus:outline-none transition-colors resize-none"
                    rows={1}
                  />
                  <button onClick={sendReply} disabled={sending || !replyText.trim()}
                    className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all flex-shrink-0 ${
                      sending ? 'bg-pcis-gold/20 text-pcis-gold cursor-wait' :
                      replyText.trim() ? 'bg-pcis-gold text-black hover:bg-pcis-gold/90' :
                      'bg-pcis-border/30 text-pcis-text-muted cursor-not-allowed'
                    }`}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <p className="text-[9px] text-pcis-text-muted/50 mt-1.5">Enter to send · Shift+Enter for new line</p>
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