'use client'

import { useState, useMemo } from 'react'
import { clients, getClient, getProperty } from '@/lib/mockData'
import { getCIEClient, ARCHETYPES, DIMENSION_META } from '@/lib/cieData'
import { getEngineMatchesForClient, getClientPurpose, PURPOSE_CONFIGS } from '@/lib/engineData'
import { getArea } from '@/lib/marketData'
import { useMeetingPrep } from '@/hooks/useForgeAI'

type MeetingType = 'Property Presentation' | 'Portfolio Review' | 'Initial Consultation' | 'Follow-Up' | 'Negotiation'

const MEETING_TYPES: MeetingType[] = [
  'Property Presentation',
  'Portfolio Review',
  'Initial Consultation',
  'Follow-Up',
  'Negotiation'
]

const MEETING_SECTIONS = [
  'CLIENT COGNITIVE PROFILE',
  'OPENING STRATEGY',
  'CONVERSATION ARCHITECTURE',
  'OBJECTION PLAYBOOK',
  'DECISION TRIGGERS & CLOSING',
  "COMMUNICATION DO'S AND DON'TS"
]

interface ClientCardProps {
  clientId: string
  isSelected: boolean
  onSelect: (id: string) => void
}

const ClientCard: React.FC<ClientCardProps> = ({ clientId, isSelected, onSelect }) => {
  const client = getClient(clientId)
  const cieClient = getCIEClient(clientId)
  const archetypeData = ARCHETYPES.find(a => a.id === cieClient?.archetype)
  const matches = getEngineMatchesForClient(clientId)

  if (!client || !cieClient) return null

  return (
    <button
      onClick={() => onSelect(clientId)}
      className={`w-full text-left px-2.5 py-2 rounded border transition-all ${
        isSelected
          ? 'bg-[#f59e0b]/15 border-[#f59e0b]/40'
          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]'
      }`}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="font-semibold text-white/90 text-[9px]">{client.name}</div>
          {archetypeData && (
            <div
              className="px-1.5 py-0.5 rounded-full text-[7px] font-semibold whitespace-nowrap"
              style={{ backgroundColor: `${archetypeData.color}20`, color: archetypeData.color }}
            >
              {archetypeData.label}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between text-[8px] text-white/60">
          <span>Deal: {client.dealStage}</span>
          <span>Score: {cieClient.engagement?.engagementScore || 0}</span>
        </div>
      </div>
    </button>
  )
}

interface CognitiveDimensionBarProps {
  dimension: string
  value: number
  shortCode: string
}

const CognitiveDimensionBar: React.FC<CognitiveDimensionBarProps> = ({ dimension, value, shortCode }) => {
  let colour = '#ef4444' // red
  if (value >= 40 && value < 70) colour = '#f59e0b' // amber
  if (value >= 70) colour = '#10b981' // green

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[7px] text-white/40 font-mono uppercase">{shortCode}</span>
        <span className="text-[7px] text-white/50">{value}</span>
      </div>
      <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  )
}

interface CognitiveProfileProps {
  clientId: string
}

const CognitiveProfile: React.FC<CognitiveProfileProps> = ({ clientId }) => {
  const cieClient = getCIEClient(clientId)
  const archetypeData = ARCHETYPES.find(a => a.id === cieClient?.archetype)

  if (!cieClient || !archetypeData) return null

  const scores = cieClient.profile?.scores || []
  const engagementScore = cieClient.engagement?.engagementScore || 0
  const momentum = cieClient.engagement?.momentum || 'neutral'

  const sortedScores = [...scores].sort((a, b) => b.value - a.value)
  const topDimensions = sortedScores.slice(0, 3)
  const bottomDimensions = sortedScores.slice(-3).reverse()

  return (
    <div className="space-y-4">
      {/* Archetype Badge */}
      <div className="space-y-2">
        <div
          className="inline-block px-3 py-1.5 rounded-full border text-[9px] font-semibold"
          style={{
            backgroundColor: `${archetypeData.color}20`,
            borderColor: `${archetypeData.color}40`,
            color: archetypeData.color
          }}
        >
          {archetypeData.label}
        </div>
        <p className="text-[8px] text-white/60 leading-relaxed">{archetypeData.description}</p>
      </div>

      {/* Engagement Score */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded px-2.5 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[8px] text-white/40 uppercase tracking-wider">Engagement Score</span>
          <span className="text-[10px] font-semibold text-white/90">{engagementScore}</span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-[#f59e0b] transition-all"
            style={{ width: `${engagementScore}%` }}
          />
        </div>
        <div className="text-[7px] text-white/40 mt-1.5 uppercase tracking-wider">
          Momentum: {momentum}
        </div>
      </div>

      {/* Cognitive Dimensions */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded px-2.5 py-2.5">
        <h3 className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2.5">
          Cognitive Profile
        </h3>
        <div className="space-y-2">
          {scores.map(score => {
            const meta = DIMENSION_META.find(d => d.name === score.dimension)
            return (
              <CognitiveDimensionBar
                key={score.dimension}
                dimension={score.dimension}
                value={score.value}
                shortCode={meta?.shortCode || '?'}
              />
            )
          })}
        </div>
      </div>

      {/* Top & Bottom Dimensions */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded px-2.5 py-2">
          <h4 className="text-[7px] text-[#10b981] uppercase tracking-wider font-semibold mb-1.5">
            Strengths
          </h4>
          <div className="space-y-1">
            {topDimensions.map(score => {
              const meta = DIMENSION_META.find(d => d.name === score.dimension)
              return (
                <div key={score.dimension} className="text-[8px] text-white/70">
                  <div className="font-medium">{meta?.shortCode}</div>
                  <div className="text-white/50">{score.value}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.06] rounded px-2.5 py-2">
          <h4 className="text-[7px] text-[#ef4444] uppercase tracking-wider font-semibold mb-1.5">
            Development Areas
          </h4>
          <div className="space-y-1">
            {bottomDimensions.map(score => {
              const meta = DIMENSION_META.find(d => d.name === score.dimension)
              return (
                <div key={score.dimension} className="text-[8px] text-white/70">
                  <div className="font-medium">{meta?.shortCode}</div>
                  <div className="text-white/50">{score.value}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface MeetingConfigProps {
  selectedClientId: string | null
  meetingType: MeetingType
  onMeetingTypeChange: (type: MeetingType) => void
  propertiesToDiscuss: string[]
  onPropertiesChange: (properties: string[]) => void
  advisorNotes: string
  onAdvisorNotesChange: (notes: string) => void
}

const MeetingConfig: React.FC<MeetingConfigProps> = ({
  selectedClientId,
  meetingType,
  onMeetingTypeChange,
  propertiesToDiscuss,
  onPropertiesChange,
  advisorNotes,
  onAdvisorNotesChange
}) => {
  const matches = selectedClientId ? getEngineMatchesForClient(selectedClientId) : []

  return (
    <div className="space-y-3">
      {/* Meeting Type */}
      <div>
        <label className="text-[8px] text-white/40 uppercase tracking-wider block mb-1.5">
          Meeting Type
        </label>
        <select
          value={meetingType}
          onChange={(e) => onMeetingTypeChange(e.target.value as MeetingType)}
          className="w-full px-2.5 py-1.5 rounded border bg-white/[0.03] border-white/[0.08] text-white/70 text-[8px] focus:outline-none focus:border-[#f59e0b]/40 focus:ring-1 focus:ring-[#f59e0b]/20"
        >
          {MEETING_TYPES.map(type => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Properties to Discuss */}
      {matches.length > 0 && (
        <div>
          <label className="text-[8px] text-white/40 uppercase tracking-wider block mb-1.5">
            Properties to Discuss
          </label>
          <div className="space-y-1.5 bg-white/[0.02] border border-white/[0.06] rounded p-2">
            {matches.slice(0, 5).map(match => {
              const property = getProperty(match.propertyId)
              return (
                <label key={match.propertyId} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={propertiesToDiscuss.includes(match.propertyId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onPropertiesChange([...propertiesToDiscuss, match.propertyId])
                      } else {
                        onPropertiesChange(propertiesToDiscuss.filter(id => id !== match.propertyId))
                      }
                    }}
                    className="w-3 h-3 rounded accent-[#f59e0b]"
                  />
                  <span className="text-[8px] text-white/70">{property?.name || match.propertyId}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* Advisor Notes */}
      <div>
        <label className="text-[8px] text-white/40 uppercase tracking-wider block mb-1.5">
          Advisor Notes
        </label>
        <textarea
          value={advisorNotes}
          onChange={(e) => onAdvisorNotesChange(e.target.value)}
          placeholder="Add context for this meeting..."
          className="w-full px-2.5 py-1.5 rounded border bg-white/[0.03] border-white/[0.08] text-white/70 text-[8px] focus:outline-none focus:border-[#f59e0b]/40 focus:ring-1 focus:ring-[#f59e0b]/20 placeholder:text-white/30 resize-none h-20"
        />
      </div>
    </div>
  )
}

interface AIOutputProps {
  content: string
}

const AIOutput: React.FC<AIOutputProps> = ({ content }) => {
  const parseSections = (text: string) => {
    const sections: { heading: string; content: string }[] = []
    let currentContent = text

    for (const sectionTitle of MEETING_SECTIONS) {
      const regex = new RegExp(`${sectionTitle}[\\s\\n]+([\\s\\S]*?)(?=${MEETING_SECTIONS.slice(MEETING_SECTIONS.indexOf(sectionTitle) + 1).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')}|$)`, 'i')
      const match = currentContent.match(regex)

      if (match) {
        sections.push({
          heading: sectionTitle,
          content: match[1].trim()
        })
      }
    }

    return sections.length > 0 ? sections : [{ heading: 'Meeting Preparation', content }]
  }

  const sections = parseSections(content)

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => (
        <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded px-3 py-2.5">
          <h3 className="text-[9px] font-semibold text-[#f59e0b] uppercase tracking-wider mb-2">
            {section.heading}
          </h3>
          <div className="text-[8px] text-white/70 leading-relaxed whitespace-pre-wrap">
            {section.content}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function FORGEMeetingPrepView() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [meetingType, setMeetingType] = useState<MeetingType>('Initial Consultation')
  const [propertiesToDiscuss, setPropertiesToDiscuss] = useState<string[]>([])
  const [advisorNotes, setAdvisorNotes] = useState('')
  const { content, loading, error, tokens, cached, generate, reset } = useMeetingPrep()

  const selectedClient = selectedClientId ? getClient(selectedClientId) : null
  const selectedCIE = selectedClientId ? getCIEClient(selectedClientId) : null
  const selectedMatches = selectedClientId ? getEngineMatchesForClient(selectedClientId) : []
  const selectedPurpose = selectedClientId ? getClientPurpose(selectedClientId) : null

  const handleGenerateMeetingPrep = async () => {
    if (!selectedClient || !selectedCIE) return

    const archetypeData = ARCHETYPES.find(a => a.id === selectedCIE.archetype)
    const purposeConfig = selectedPurpose ? PURPOSE_CONFIGS.find(c => c.id === selectedPurpose.primaryPurpose) : null

    const payload = {
      clientName: selectedClient.name,
      clientType: selectedClient.type,
      clientCategory: selectedClient.category,
      budgetMin: selectedClient.financialProfile.budgetMin,
      budgetMax: selectedClient.financialProfile.budgetMax,
      location: selectedClient.location,
      dealStage: selectedClient.dealStage,
      archetype: selectedCIE.archetype,
      archetypeLabel: archetypeData?.label || '',
      archetypeDescription: archetypeData?.description || '',
      archetypeStrengths: archetypeData?.strengths || [],
      archetypeRisks: archetypeData?.risks || [],
      cognitiveScores: selectedCIE.profile?.scores || [],
      keyTraits: selectedCIE.topDimensions || [],
      communicationTips: archetypeData?.strengths || [],
      approachStrategy: purposeConfig?.description || '',
      engagementScore: selectedCIE.engagement?.engagementScore || 0,
      engagementMomentum: selectedCIE.engagement?.momentum || 'neutral',
      matchCount: selectedMatches.length,
      topMatchScore: selectedMatches[0]?.overallScore || 0,
      primaryPurpose: selectedPurpose?.primaryPurpose || '',
      purposeConfidence: selectedPurpose?.confidence || 0,
      topMatches: selectedMatches.slice(0, 5).map(m => ({
        propertyName: getProperty(m.propertyId)?.name || m.propertyId,
        area: m.areaId || '',
        score: m.overallScore,
        grade: m.grade,
      })),
      meetingType,
      propertiesToDiscuss,
      advisorNotes
    }

    await generate(payload)
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-black/40 via-black/20 to-black/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <h2 className="text-[11px] font-semibold text-white/90 uppercase tracking-wider">
          FORGE -- Meeting Prep
        </h2>
        <p className="text-[8px] text-white/40 mt-1">Cognitive Intelligence Engine</p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        {/* Left Sidebar: Client List */}
        <div className="w-[35%] flex flex-col gap-2 overflow-hidden">
          <div className="text-[8px] text-white/40 uppercase tracking-wider font-semibold px-1">
            Select Client
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {clients.map(client => (
              <ClientCard
                key={client.id}
                clientId={client.id}
                isSelected={selectedClientId === client.id}
                onSelect={setSelectedClientId}
              />
            ))}
          </div>
        </div>

        {/* Right Panel: Configuration & Profile */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {selectedClientId ? (
            <>
              {/* Tabs-like toggle for config/profile */}
              <div className="grid grid-cols-2 gap-2 max-h-[50%] overflow-hidden">
                {/* Profile */}
                <div className="overflow-y-auto">
                  <div className="text-[8px] text-white/40 uppercase tracking-wider font-semibold px-2 mb-2">
                    Cognitive Profile
                  </div>
                  <div className="px-2 space-y-2">
                    <CognitiveProfile clientId={selectedClientId} />
                  </div>
                </div>

                {/* Meeting Config */}
                <div className="overflow-y-auto">
                  <div className="text-[8px] text-white/40 uppercase tracking-wider font-semibold px-2 mb-2">
                    Meeting Configuration
                  </div>
                  <div className="px-2">
                    <MeetingConfig
                      selectedClientId={selectedClientId}
                      meetingType={meetingType}
                      onMeetingTypeChange={setMeetingType}
                      propertiesToDiscuss={propertiesToDiscuss}
                      onPropertiesChange={setPropertiesToDiscuss}
                      advisorNotes={advisorNotes}
                      onAdvisorNotesChange={setAdvisorNotes}
                    />
                  </div>
                </div>
              </div>

              {/* AI Meeting Prep Button */}
              <div className="flex gap-2 px-2">
                <button
                  onClick={handleGenerateMeetingPrep}
                  disabled={loading}
                  className="px-2.5 py-1 rounded border border-[#f59e0b]/30 bg-[#f59e0b]/10 text-[#f59e0b] hover:bg-[#f59e0b]/20 disabled:opacity-50 disabled:cursor-not-allowed text-[9px] font-semibold tracking-wider uppercase transition-all"
                >
                  {loading ? 'Generating...' : 'AI Meeting Prep'}
                </button>
                {(content || cached) && (
                  <button
                    onClick={reset}
                    className="px-2.5 py-1 rounded border border-white/[0.12] bg-white/[0.03] text-white/70 hover:bg-white/[0.06] text-[9px] font-semibold tracking-wider uppercase transition-all"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Token & Status Info */}
              {(cached || tokens > 0) && (
                <div className="text-[7px] text-white/40 px-2 flex gap-2">
                  {cached && <span>Cached</span>}
                  {tokens > 0 && <span>{tokens} tokens</span>}
                </div>
              )}

              {error && (
                <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded px-2.5 py-1.5 text-[8px] text-[#ef4444]">
                  {error}
                </div>
              )}

              {/* AI Output */}
              {content && (
                <div className="flex-1 overflow-y-auto border-t border-white/[0.06] pt-3 px-2">
                  <div className="text-[8px] text-white/40 uppercase tracking-wider font-semibold mb-2">
                    Meeting Preparation
                  </div>
                  <AIOutput content={content} />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[9px] text-white/40 uppercase tracking-wider">
                Select a client to begin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
