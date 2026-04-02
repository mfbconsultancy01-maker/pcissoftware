'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from './AuthProvider'

// ============================================================================
// PCIS Personal Assistant -- Floating Chat
// ============================================================================
// Floating chat bubble in bottom-right corner. Text + voice input, text output.
// British English, private-banking tone. Knows the entire PCIS ecosystem.
// ============================================================================

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isFeedback?: boolean
}

// ── Speech Recognition Type ──────────────────────────────────────────────
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } }
  resultIndex: number
}

interface SpeechRecognitionInstance {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance
    webkitSpeechRecognition: new () => SpeechRecognitionInstance
  }
}

export default function PersonalAssistant() {
  const { userName, tenant } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [hasGreeted, setHasGreeted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // ── Send greeting on first open ──────────────────────────────────────
  const sendGreeting = useCallback(async () => {
    if (hasGreeted) return
    setHasGreeted(true)
    setIsLoading(true)

    try {
      const greetMsg: Message = { role: 'user', content: '[PA opened -- greet the user]', timestamp: new Date() }

      const res = await fetch('/api/pa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Please greet me -- this is the start of our conversation.' }],
          userName: userName || undefined,
          tenantName: tenant?.name || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to get greeting')

      const data = await res.json()
      setMessages([{
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
      }])
    } catch {
      setMessages([{
        role: 'assistant',
        content: `Good day${userName ? ', ' + userName : ''}. Your PA is at your service -- how may I support you?`,
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }, [hasGreeted, userName, tenant])

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      sendGreeting()
    }
  }, [isOpen, hasGreeted, sendGreeting])

  // ── Send Message ─────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    const userMsg: Message = { role: 'user', content: text, timestamp: new Date() }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {
      // Send full conversation history (excluding the hidden greeting prompt)
      const apiMessages = updatedMessages
        .filter(m => m.role === 'assistant' || (m.role === 'user' && !m.content.startsWith('[PA opened')))
        .map(m => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/pa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          userName: userName || undefined,
          tenantName: tenant?.name || undefined,
        }),
      })

      if (!res.ok) throw new Error('Request failed')

      const data = await res.json()
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        isFeedback: data.isFeedback || false,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I do beg your pardon -- something went awry. Might we try again in a moment?',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // ── Voice Input (Web Speech API) ─────────────────────────────────────
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-GB'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev ? prev + ' ' + transcript : transcript)
      setIsListening(false)
    }

    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  // ── Handle Enter key ─────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Format time ──────────────────────────────────────────────────────
  const fmtTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <>
      {/* ── Chat Window ───────────────────────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 w-[380px] h-[520px] bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl shadow-2xl flex flex-col z-[9999] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#111111] border-b border-[#2A2A2A]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A55A] to-[#A07D3A] flex items-center justify-center">
                <span className="text-white text-xs font-bold">PA</span>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-white">Personal Assistant</div>
                <div className="text-[10px] text-[#C9A55A]">PCIS Solutions</div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#666] hover:text-white transition-colors text-lg leading-none px-1"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-[#333]">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-[#C9A55A]/15 border border-[#C9A55A]/30 text-[#E8DCC8]'
                    : 'bg-[#1A1A1A] border border-[#2A2A2A] text-[#CCCCCC]'
                } rounded-lg px-3.5 py-2.5`}>
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                  <div className={`flex items-center gap-2 text-[9px] mt-1.5 ${msg.role === 'user' ? 'text-[#C9A55A]/50' : 'text-[#555]'}`}>
                    {fmtTime(msg.timestamp)}
                    {msg.isFeedback && (
                      <span className="text-[8px] bg-[#C9A55A]/15 text-[#C9A55A] px-1.5 py-0.5 rounded">Forwarded to team</span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#C9A55A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#C9A55A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#C9A55A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-3 py-2.5 bg-[#111111] border-t border-[#2A2A2A]">
            <div className="flex items-end gap-2">
              {/* Mic button */}
              <button
                onClick={toggleListening}
                className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500/20 border border-red-500/50 text-red-400 animate-pulse'
                    : 'bg-[#1A1A1A] border border-[#333] text-[#888] hover:text-[#C9A55A] hover:border-[#C9A55A]/50'
                }`}
                title={isListening ? 'Stop listening' : 'Speak'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>

              {/* Text input */}
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="flex-1 bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-[13px] text-white placeholder-[#555] resize-none focus:outline-none focus:border-[#C9A55A]/50 max-h-20 overflow-y-auto"
                style={{ minHeight: '36px' }}
              />

              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-[#C9A55A] hover:bg-[#B8944A] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Button ───────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-5 right-5 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-[9999] transition-all duration-200 overflow-hidden ${
          isOpen
            ? 'bg-[#333] hover:bg-[#444] scale-90'
            : 'hover:scale-105 scale-100'
        }`}
        title="Personal Assistant"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <img src="/favicon.png" alt="PA" className="w-full h-full object-cover rounded-full" />
        )}
      </button>
    </>
  )
}
