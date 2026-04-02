'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { PANEL_REGISTRY, type PanelType } from '../WorkspaceProvider'
import { useWorkspaceNav } from '../useWorkspaceNav'
import { usePlatformKey } from '@/lib/platform'

// ============================================================================
// PCIS Command Centre - System Guide & Navigation Map
// ============================================================================

type EngineKey = 'CIE' | 'SCOUT' | 'ENGINE' | 'FORGE' | 'CROSS'

interface EngineInfo {
  key: EngineKey
  label: string
  fullName: string
  color: string
  description: string
  panels: Array<{ type: PanelType; code: string; name: string; description: string; comingSoon?: boolean }>
}

const ENGINES: EngineInfo[] = [
  {
    key: 'CIE',
    label: 'E1 · CIE',
    fullName: 'Client Intelligence Engine',
    color: '#06b6d4',
    description: 'Profiles every client across 12 psychological dimensions. Know who you\'re talking to before you walk in.',
    panels: [
      { type: 'cie-dashboard', code: 'CID', name: 'CIE Dashboard', description: 'Overview of all client profiles, archetype breakdown, engagement status' },
      { type: 'cie-profile', code: 'CIP', name: 'CIE Profile', description: 'Deep-dive into a single client\'s cognitive profile and dimensions' },
      { type: 'cie-signals', code: 'CIS', name: 'CIE Signals', description: 'Real-time behavioural signals across your client book' },
      { type: 'cie-comparator', code: 'CIC', name: 'Client Comparator', description: 'Side-by-side comparison of client profiles and dimensions' },
      { type: 'cie-engagement', code: 'CIE', name: 'Engagement Intel', description: 'Engagement health, decay tracking, momentum analysis' },
      { type: 'cie-predictions', code: 'CIF', name: 'Prediction Engine', description: 'AI-predicted client behaviour patterns and next moves' },
      { type: 'cie-map', code: 'CIM', name: 'Client Map', description: 'Global client map with archetype markers and CIE score rings' },
      { type: 'cie-grid', code: 'CIG', name: 'Client Grid', description: 'Spreadsheet-style sortable view with all CIE intelligence columns' },
      { type: 'cie-pipeline', code: 'CIPL', name: 'CIE Pipeline', description: 'Kanban deal pipeline with cognitive intelligence overlays' },
      { type: 'prediction-intelligence', code: 'PRI', name: 'Prediction Intelligence', description: 'Full AI behavioral pattern analysis with playbooks and impact projections' },
      { type: 'relationship-intelligence', code: 'RLI', name: 'Relationship Intelligence', description: 'Cross-client relationship mapping, network analysis and influence tracking', comingSoon: true },
    ],
  },
  {
    key: 'SCOUT',
    label: 'E2 · SCOUT',
    fullName: 'Market Intelligence Engine',
    color: '#22c55e',
    description: '30 panels covering every dimension of the Dubai property market. See what\'s moving before anyone else.',
    panels: [
      { type: 'scout-dashboard', code: 'SCT', name: 'SCOUT Dashboard', description: 'Unified market intelligence feed across all domains' },
      { type: 'area-grid', code: 'ARE', name: 'Area Intelligence', description: 'Grid view of all Dubai areas with demand, price, yield metrics' },
      { type: 'transaction-feed', code: 'TXN', name: 'Transaction Feed', description: 'Live transaction data feed with filtering' },
      { type: 'volume-analysis', code: 'VOL', name: 'Volume Analysis', description: 'Transaction volume trends by area and property type' },
      { type: 'price-map', code: 'PRC', name: 'Price Intelligence', description: 'Price per sqft analysis across Dubai areas' },
      { type: 'comparables', code: 'CMP', name: 'Comparables Engine', description: 'Property comparison and valuation benchmarking' },
      { type: 'price-trends', code: 'TRD', name: 'Price Trends', description: 'Historical and projected price movements' },
      { type: 'offplan-feed', code: 'OFP', name: 'Off-Plan Projects', description: 'New development launches and off-plan opportunities' },
      { type: 'developer-analytics', code: 'DEV', name: 'Developer Analytics', description: 'Developer track records, delivery history, pricing patterns' },
      { type: 'macro-dashboard', code: 'MCR', name: 'Macro Intelligence', description: 'GDP, visa, tourism, economic indicators driving demand' },
      { type: 'signal-feed', code: 'SIG', name: 'Market Signals', description: 'AI-detected market opportunities and risk signals' },
      { type: 'news-feed', code: 'NWS', name: 'Dubai News', description: 'Live Dubai real estate and financial news intelligence' },
      { type: 'emerging-areas', code: 'EMG', name: 'Emerging Areas', description: 'Up-and-coming areas with growth potential' },
      { type: 'heat-map', code: 'HMP', name: 'Heat Map', description: 'Visual demand and activity heat map' },
    ],
  },
  {
    key: 'ENGINE',
    label: 'E3 · ENGINE',
    fullName: 'Purpose-Aware Matching Engine',
    color: '#a78bfa',
    description: 'Matches clients to properties based on purpose, not just price. Investment, end-use, Golden Visa, each scored on 4 pillars.',
    panels: [
      { type: 'engine-dashboard', code: 'ENG', name: 'ENGINE Dashboard', description: 'Matching command centre with grade distribution and stats' },
      { type: 'engine-purpose-matrix', code: 'EPM', name: 'Purpose Matrix', description: 'Client-to-purpose mapping with confidence scores' },
      { type: 'engine-match-scorer', code: 'EMS', name: 'Match Scorer', description: '4-pillar deep-dive: Financial, Lifestyle, Investment, Purpose fit' },
      { type: 'engine-client-property', code: 'ECP', name: 'Client-Property Grid', description: 'Heatmap matrix: top clients vs top properties with score intensity and pillar detail' },
    ],
  },
  {
    key: 'FORGE',
    label: 'E4 · FORGE',
    fullName: 'Advisor Action Engine',
    color: '#f59e0b',
    description: 'Turns intelligence into action. Deal briefs, proposals, communications, and lifecycle management, all generated and tracked.',
    panels: [
      { type: 'forge-dashboard', code: 'FDH', name: 'Command Centre', description: 'Pipeline intelligence dashboard with priority actions and market signals' },
      { type: 'forge-deal-room', code: 'FDR', name: 'Deal Room', description: 'Claude-powered deal intelligence briefs for client-property pairings' },
      { type: 'forge-meeting-prep', code: 'FMP', name: 'Meeting Prep', description: 'CIE-driven tactical briefings with cognitive profile analysis' },
      { type: 'forge-opportunity-radar', code: 'FOR', name: 'Opportunity Radar', description: 'Cross-engine pattern detection and hidden opportunity surfacing' },
      { type: 'forge-client-dossier', code: 'FCD', name: 'Client Dossier', description: 'Unified client intelligence file with full CIE, ENGINE, and FORGE data' },
    ],
  },
  {
    key: 'CROSS',
    label: 'Cross-Engine',
    fullName: 'Cross-Engine Intelligence',
    color: '#D4A574',
    description: 'Panels that pull data from all 4 engines into unified views. The connective tissue of PCIS.',
    panels: [
      { type: 'client-360', code: 'C36', name: 'Client DNA', description: 'Single-page intelligence brief: archetype, cognitive traits, communication playbook, meeting prep' },
      { type: 'pipeline', code: 'PPL', name: 'Deal Pipeline', description: 'Live pipeline: clients flowing from profiling → matching → closing' },
      { type: 'notifications', code: 'NTF', name: 'Notifications', description: 'Unified alert feed from all engines, priority-sorted' },
    ],
  },
]

const KEYBOARD_SHORTCUTS = [
  { keys: '⌘K', description: 'Open command bar, type any GO-code or panel name' },
  { keys: '0-9', description: 'Quick-open panels by shortcut number' },
  { keys: 'Alt+1-5', description: 'Load workspace presets (W1-W5)' },
  { keys: '⌘W', description: 'Close focused panel' },
  { keys: '⌘\\', description: 'Split panel right' },
  { keys: '⌘⇧\\', description: 'Split panel below' },
  { keys: 'Ctrl+Tab', description: 'Cycle through panel groups' },
  { keys: '?', description: 'Show keyboard shortcuts overlay' },
]

const PRESETS = [
  { shortcut: 'Alt+1', name: 'Overview', panels: 'Dashboard' },
  { shortcut: 'Alt+2', name: 'Deal Room', panels: 'Clients + Matches + Recommendations' },
  { shortcut: 'Alt+3', name: 'Market Watch', panels: 'Intel + Predictions + Matches + Properties' },
  { shortcut: 'Alt+4', name: 'Morning Brief', panels: 'Morning Brief + Dashboard' },
  { shortcut: 'Alt+5', name: 'Relationships', panels: 'Relationships + Clients' },
]

// ============================================================================
// PCIS AI Knowledge Base
// ============================================================================

interface KnowledgeEntry {
  keywords: string[]
  answer: string
  action?: { type: PanelType; label: string }
}

const PCIS_KNOWLEDGE: KnowledgeEntry[] = [
  // System overview
  {
    keywords: ['what is pcis', 'about pcis', 'system', 'overview', 'explain pcis', 'how does pcis work'],
    answer: 'PCIS is a Bloomberg-terminal-style intelligence OS built for Dubai private client real estate advisors. It runs on 4 engines: CIE for client profiling, SCOUT for market intelligence, ENGINE for purpose-aware matching, and FORGE for advisor actions. Over 67 panels, all tiled in a keyboard-first workspace.',
  },
  // Navigation
  {
    keywords: ['navigate', 'open panel', 'how to open', 'go code', 'go-code', 'command bar', 'find panel'],
    answer: 'Hit ⌘K to open the Command Bar, then type a 3-letter GO-code like CID for CIE Dashboard, or just start typing a panel name. You can also click any panel name here in the Command Centre to open it directly.',
  },
  {
    keywords: ['keyboard', 'shortcut', 'shortcuts', 'hotkey', 'keybind'],
    answer: 'Here are the main ones: ⌘K opens the command bar, ⌘\\ splits right, ⌘⇧\\ splits below. Alt+1 through Alt+5 load workspace presets. ⌘W closes the focused panel, and Ctrl+Tab cycles through panel groups.',
  },
  {
    keywords: ['split', 'tile', 'layout', 'side by side', 'arrange'],
    answer: 'You can use ⌘\\ to split a panel to the right for a side-by-side view, or ⌘⇧\\ to split below for a stacked view. Opening via ⌘K adds panels as tabs in the focused group. Drag the edges to resize.',
  },
  {
    keywords: ['preset', 'workspace preset', 'alt+1', 'workspace layout', 'saved layout'],
    answer: 'Alt+1 through Alt+5 load preset workspace layouts. Right now you have: Alt+1 Overview, Alt+2 Deal Room, Alt+3 Market Watch, Alt+4 Morning Brief, and Alt+5 Relationships. Engine-specific presets are coming soon.',
  },
  // CIE Engine
  {
    keywords: ['cie', 'client intelligence', 'profiling', 'client profile', 'psychology', 'archetype'],
    answer: 'CIE is the Client Intelligence Engine. It profiles every client across 12 psychological dimensions like risk appetite, decision speed, communication style, and loyalty. Each client gets an archetype classification. You can see all profiles in the CIE Dashboard.',
    action: { type: 'cie-dashboard', label: 'Open CIE Dashboard' },
  },
  {
    keywords: ['cie dashboard', 'cid'],
    answer: 'The CIE Dashboard (GO: CID) gives you an overview of all client profiles, the archetype breakdown, and engagement status across your client book.',
    action: { type: 'cie-dashboard', label: 'Open CIE Dashboard' },
  },
  {
    keywords: ['cie profile', 'cip', 'client deep dive', 'dimension'],
    answer: 'CIE Profile (GO: CIP) is where you do a deep-dive into a single client\'s cognitive profile and all 12 dimensions. Great for understanding their decision-making patterns before a meeting.',
    action: { type: 'cie-profile', label: 'Open CIE Profile' },
  },
  {
    keywords: ['signal', 'cie signal', 'cis', 'behavioural signal'],
    answer: 'CIE Signals (GO: CIS) tracks real-time behavioural signals across your client book. Think engagement spikes, decay alerts, and momentum changes.',
    action: { type: 'cie-signals', label: 'Open CIE Signals' },
  },
  {
    keywords: ['comparator', 'compare client', 'cic', 'side by side client'],
    answer: 'The Client Comparator (GO: CIC) lets you compare two or more client profiles side-by-side across all dimensions. Really useful when deciding who to prioritise.',
    action: { type: 'cie-comparator', label: 'Open Client Comparator' },
  },
  {
    keywords: ['engagement', 'decay', 'momentum', 'cie engagement'],
    answer: 'Engagement Intel (GO: CIE) tracks engagement health, decay patterns, and momentum. It helps you spot clients going cold before it\'s too late.',
    action: { type: 'cie-engagement', label: 'Open Engagement Intel' },
  },
  {
    keywords: ['prediction', 'cie prediction', 'cif', 'next move', 'forecast client'],
    answer: 'CIE Predictions (GO: CIF) uses AI to predict client behaviour patterns and their likely next moves, all based on engagement history.',
    action: { type: 'cie-predictions', label: 'Open Predictions' },
  },
  {
    keywords: ['client map', 'map', 'cim', 'global map', 'world map', 'location', 'geography'],
    answer: 'Client Map (GO: CIM) shows all your profiled clients on a global map. Markers are coloured by archetype, ring progress shows CIE score, and arcs connect clients to your Dubai HQ.',
    action: { type: 'cie-map', label: 'Open Client Map' },
  },
  {
    keywords: ['client grid', 'grid', 'cig', 'spreadsheet', 'table', 'sortable'],
    answer: 'Client Grid (GO: CIG) is a spreadsheet-style sortable view of all clients. You can sort by CIE score, archetype, engagement, momentum, predictions, and more. Filter by archetype or engagement status.',
    action: { type: 'cie-grid', label: 'Open Client Grid' },
  },
  {
    keywords: ['cie pipeline', 'cipl', 'kanban', 'deal stage', 'client pipeline'],
    answer: 'CIE Pipeline (GO: CIPL) shows your deal pipeline as a Kanban board with CIE intelligence overlays. Each card shows archetype, CIE score, engagement, and next touch. Drag cards between stages.',
    action: { type: 'cie-pipeline', label: 'Open CIE Pipeline' },
  },
  // SCOUT Engine
  {
    keywords: ['scout', 'market intelligence', 'market data', 'property data', 'scraping'],
    answer: 'SCOUT is the Market Intelligence Engine. It pulls data from Dubai property sources and scores every property on both investment and lifestyle dimensions. The SCOUT Dashboard gives you the unified market feed.',
    action: { type: 'scout-dashboard', label: 'Open SCOUT Dashboard' },
  },
  {
    keywords: ['scout dashboard', 'sct', 'market overview'],
    answer: 'The SCOUT Dashboard (GO: SCT) is your unified market intelligence hub. It aggregates all 5 SCOUT sub-domains: areas, transactions, pricing, off-plan, and developer analytics.',
    action: { type: 'scout-dashboard', label: 'Open SCOUT Dashboard' },
  },
  {
    keywords: ['area', 'areas', 'area intelligence', 'are', 'neighbourhood', 'location'],
    answer: 'Area Intelligence (GO: ARE) shows a grid view of all Dubai areas with demand scores, price trends, yield metrics, and growth indicators.',
    action: { type: 'area-grid', label: 'Open Area Intelligence' },
  },
  {
    keywords: ['transaction', 'txn', 'transaction feed', 'sales data', 'recent sales'],
    answer: 'The Transaction Feed (GO: TXN) shows live transaction data across Dubai. You can filter by area, price range, property type, and date.',
    action: { type: 'transaction-feed', label: 'Open Transaction Feed' },
  },
  {
    keywords: ['off-plan', 'offplan', 'new development', 'ofp', 'launch', 'new project'],
    answer: 'Off-Plan Projects (GO: OFP) tracks new development launches and off-plan opportunities across all Dubai developers.',
    action: { type: 'offplan-feed', label: 'Open Off-Plan Feed' },
  },
  {
    keywords: ['price', 'pricing', 'price trend', 'trd', 'price map', 'prc', 'sqft', 'per foot'],
    answer: 'For pricing, you have two panels. Price Intelligence (GO: PRC) shows price per sqft analysis, and Price Trends (GO: TRD) shows historical and projected price movements. Both live in SCOUT.',
    action: { type: 'price-trends', label: 'Open Price Trends' },
  },
  {
    keywords: ['comparable', 'comp', 'cmp', 'valuation', 'benchmark'],
    answer: 'The Comparables Engine (GO: CMP) handles property comparison and valuation benchmarking against similar properties in the same area.',
    action: { type: 'comparables', label: 'Open Comparables' },
  },
  {
    keywords: ['developer', 'dev', 'developer analytics', 'track record'],
    answer: 'Developer Analytics (GO: DEV) gives you developer track records, delivery history, and pricing patterns across Dubai developers.',
    action: { type: 'developer-analytics', label: 'Open Developer Analytics' },
  },
  {
    keywords: ['macro', 'mcr', 'gdp', 'economy', 'visa', 'tourism'],
    answer: 'Macro Intelligence (GO: MCR) covers GDP, visa data, tourism numbers, and all the economic indicators that drive Dubai property demand.',
    action: { type: 'macro-dashboard', label: 'Open Macro Intelligence' },
  },
  {
    keywords: ['emerging', 'emg', 'growth area', 'up and coming'],
    answer: 'Emerging Areas (GO: EMG) identifies up-and-coming Dubai areas with early growth signals and development potential. Good for spotting the next big thing.',
    action: { type: 'emerging-areas', label: 'Open Emerging Areas' },
  },
  {
    keywords: ['heat map', 'hmp', 'hot area', 'demand map'],
    answer: 'The Heat Map (GO: HMP) gives you a visual demand and activity map across Dubai areas. You can see where the action is at a glance.',
    action: { type: 'heat-map', label: 'Open Heat Map' },
  },
  // ENGINE
  {
    keywords: ['engine', 'matching', 'purpose', 'purpose-aware', 'match client', 'match property'],
    answer: 'ENGINE is the Purpose-Aware Matching Engine. Instead of just matching on price, it matches clients to properties based on their intent: Investment, End-Use, or Mixed. Every match is scored on 4 pillars: Financial Alignment, Lifestyle Fit, Value Creation, and Timing.',
    action: { type: 'engine-dashboard', label: 'Open ENGINE Dashboard' },
  },
  {
    keywords: ['engine dashboard', 'eng', 'match overview'],
    answer: 'The ENGINE Dashboard (GO: ENG) is the matching command centre. You get grade distribution, match stats, and quick access to all matching tools.',
    action: { type: 'engine-dashboard', label: 'Open ENGINE Dashboard' },
  },
  {
    keywords: ['purpose matrix', 'epm', 'client purpose', 'investment vs end use'],
    answer: 'Purpose Matrix (GO: EPM) maps each client to their primary purpose, whether that\'s Investment, End-Use, or Mixed, along with confidence scores.',
    action: { type: 'engine-purpose-matrix', label: 'Open Purpose Matrix' },
  },
  {
    keywords: ['match scorer', 'ems', 'pillar', '4 pillar', 'scoring', 'match score'],
    answer: 'Match Scorer (GO: EMS) shows the 4-pillar breakdown for any match: Financial Alignment, Lifestyle Fit, Investment Potential, and Purpose Fit. It\'s where you go for the deep analysis.',
    action: { type: 'engine-match-scorer', label: 'Open Match Scorer' },
  },
  {
    keywords: ['client property grid', 'ecp', 'matrix view', 'heatmap grid', 'match grid'],
    answer: 'Client-Property Grid (GO: ECP) is a heatmap matrix showing top clients vs top properties with score intensity. Click any cell to see the full 4-pillar breakdown. Great for spotting opportunities visually.',
    action: { type: 'engine-client-property', label: 'Open Client-Property Grid' },
  },
  // FORGE
  {
    keywords: ['forge', 'advisor', 'action', 'output', 'deal brief', 'proposal', 'communication'],
    answer: 'FORGE is the Advisor Action Engine. It takes all the intelligence from the other engines and turns it into things you can actually use: deal briefs, proposals, communications, and lifecycle management. All generated and tracked.',
    action: { type: 'forge-dashboard', label: 'Open FORGE Dashboard' },
  },
  {
    keywords: ['forge dashboard', 'fdh', 'action queue'],
    answer: 'The FORGE Dashboard (GO: FDH) is your action command centre with a priority queue and status tracking across all advisor activities.',
    action: { type: 'forge-dashboard', label: 'Open FORGE Dashboard' },
  },
  {
    keywords: ['deal brief', 'fdb', 'talking point', 'approach strategy'],
    answer: 'Deal Briefs (GO: FDB) generates AI-powered deal briefs with approach strategy, talking points, and client-specific insights. Perfect for meeting prep.',
    action: { type: 'forge-deal-brief', label: 'Open Deal Briefs' },
  },
  {
    keywords: ['proposal', 'fpr', 'client proposal'],
    answer: 'Proposals (GO: FPR) generates multi-section client proposals with property recommendations tailored to the client\'s purpose.',
    action: { type: 'forge-proposal', label: 'Open Proposals' },
  },
  {
    keywords: ['comm advisor', 'fca', 'communication', 'email', 'whatsapp', 'message', 'draft'],
    answer: 'Comm Advisor (GO: FCA) generates channel-specific communication drafts for email, WhatsApp, and call scripts, complete with tone analysis.',
    action: { type: 'forge-comm-advisor', label: 'Open Comm Advisor' },
  },
  {
    keywords: ['lifecycle', 'fcl', 'overdue', 'phase', 'client lifecycle'],
    answer: 'Lifecycle Actions (GO: FCL) manages phase-based client lifecycle milestones with overdue tracking and next-step guidance. Keeps things from slipping through the cracks.',
    action: { type: 'forge-lifecycle', label: 'Open Lifecycle Actions' },
  },
  {
    keywords: ['client dossier', 'fcd', 'dossier', 'meeting prep', 'client file', 'unified profile'],
    answer: 'Client Dossier (GO: FCD) is the unified intelligence file per client. It pulls CIE cognitive profile, ENGINE match scores, and all FORGE deliverables into one view. Open this before any client meeting.',
    action: { type: 'forge-client-dossier', label: 'Open Client Dossier' },
  },
  // Cross-engine
  {
    keywords: ['client dna', 'c36', 'dna report', 'client brief', 'intelligence brief', 'cheat sheet'],
    answer: 'Client DNA (GO: C36) generates a single-page intelligence brief for any client. It covers their cognitive archetype, personality profile, communication do\'s and don\'ts, meeting preparation advice, risk factors, and strengths to leverage. Think of it as an advisor cheat sheet powered entirely by CIE data.',
    action: { type: 'client-360', label: 'Open Client DNA' },
  },
  {
    keywords: ['pipeline', 'ppl', 'deal pipeline', 'deal stage', 'funnel'],
    answer: 'Pipeline (GO: PPL) shows your live deal pipeline. Clients flow through stages from Lead In to Qualified, Matched, Proposed, Negotiating, and finally Closed Won.',
    action: { type: 'pipeline', label: 'Open Pipeline' },
  },
  {
    keywords: ['notification', 'ntf', 'alert', 'notification centre'],
    answer: 'Notifications (GO: NTF) is a unified alert feed pulling from all 4 engines. You\'ll see CIE decay alerts, SCOUT opportunities, ENGINE A+ matches, and FORGE overdue actions all in one place.',
    action: { type: 'notifications', label: 'Open Notifications' },
  },
  {
    keywords: ['command centre', 'cmd', 'guide', 'help', 'where am i'],
    answer: 'You\'re in the Command Centre! This is your interactive guide to the entire PCIS system. Browse engines, panels, shortcuts, and presets using the tabs above.',
  },
  // How many panels
  {
    keywords: ['how many panel', 'total panel', 'panel count', 'how many screens'],
    answer: `PCIS currently has ${Object.keys(PANEL_REGISTRY).length} panels across 4 engines plus cross-engine views. CIE has 6, SCOUT has 13, ENGINE has 6, FORGE has 6, and then there are several cross-engine panels on top of that.`,
  },
  // Getting started
  {
    keywords: ['getting started', 'new', 'beginner', 'where to start', 'first time', 'tutorial'],
    answer: 'Welcome to PCIS! The fastest way to start is hitting ⌘K to open the command bar. Type any panel name or GO-code. Try "CID" for client profiles, "SCT" for market data, or "PPL" for your pipeline. Alt+1 loads the overview preset if you want everything at once.',
  },
  // Specific client questions
  {
    keywords: ['find client', 'search client', 'client list', 'my clients', 'client book'],
    answer: 'Head to the CIE Dashboard (GO: CID) to see all your clients with profiles and engagement status. For a deep-dive into any specific client, use Client DNA (GO: C36) for a full intelligence brief.',
    action: { type: 'cie-dashboard', label: 'Open CIE Dashboard' },
  },
  // Property search
  {
    keywords: ['find property', 'search property', 'property list', 'browse properties'],
    answer: 'For browsing properties, you have a few options. SCOUT Dashboard (GO: SCT) for a market overview, Area Intelligence (GO: ARE) to browse by area, Transaction Feed (GO: TXN) for recent sales, or Off-Plan (GO: OFP) for new developments.',
    action: { type: 'scout-dashboard', label: 'Open SCOUT Dashboard' },
  },
  // Match / pairing
  {
    keywords: ['best match', 'pair client', 'which property', 'suggest', 'recommend property'],
    answer: 'That\'s what ENGINE is built for. Check Match Scorer (GO: EMS) for a detailed 4-pillar breakdown of any match, or Client-Property Grid (GO: ECP) for the visual heatmap matrix.',
    action: { type: 'engine-match-scorer', label: 'Open Match Scorer' },
  },
  // Meeting prep
  {
    keywords: ['meeting', 'prepare', 'prep', 'client meeting', 'before meeting'],
    answer: 'For meeting prep, I\'d start with Client DNA (GO: C36) for the full intelligence brief including communication do\'s and don\'ts and meeting preparation advice, then split right with ⌘\\ and open Deal Briefs (GO: FDB) for talking points and approach strategy.',
    action: { type: 'client-360', label: 'Open Client DNA' },
  },
]

function findAnswer(query: string): { answer: string; action?: { type: PanelType; label: string } } {
  const q = query.toLowerCase().trim()

  // Score each knowledge entry by keyword match count
  let bestMatch: KnowledgeEntry | null = null
  let bestScore = 0

  for (const entry of PCIS_KNOWLEDGE) {
    let score = 0
    for (const kw of entry.keywords) {
      if (q.includes(kw)) {
        score += kw.length // Longer keyword matches score higher
      }
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }

  if (bestMatch && bestScore > 0) {
    return { answer: bestMatch.answer, action: bestMatch.action }
  }

  // Fallback
  return {
    answer: 'Hmm, I\'m not sure about that one. Try asking about an engine like CIE, SCOUT, ENGINE, or FORGE. Or ask about a specific panel, navigation shortcuts, or just how to get started. You can also browse the Engines & Panels tab above for the full system map.',
  }
}

// ============================================================================
// AI Orb Chat Component
// ============================================================================

function PCISOrb({ isActive, onClick, paused }: { isActive: boolean; onClick: () => void; paused?: boolean }) {
  const orbSize = 48
  const glowSize = 100
  const ringSize = 68

  return (
    <button
      onClick={onClick}
      className="relative group"
      style={{ width: orbSize, height: orbSize }}
      aria-label={isActive ? 'Close PCIS Assistant' : 'Open PCIS Assistant'}
    >
      {/* Deep ambient glow - wide soft halo */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: glowSize,
          height: glowSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(212,165,116,0.2) 0%, rgba(212,165,116,0.06) 35%, transparent 65%)',
          animation: 'pcis-glow 4s ease-in-out infinite',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />

      {/* Second glow layer - tighter, brighter */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: glowSize * 0.7,
          height: glowSize * 0.7,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(212,165,116,0.15) 0%, transparent 60%)',
          animation: 'pcis-glow-2 3s ease-in-out infinite',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />

      {/* Rotating ring - tilted for 3D perspective */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: ringSize,
          height: ringSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotateX(65deg)',
          border: '1px solid rgba(212,165,116,0.12)',
          animation: 'pcis-ring-spin 10s linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      >
        <div
          className="absolute w-1.5 h-1.5 rounded-full"
          style={{
            top: -1,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(212,165,116,0.5)',
            boxShadow: '0 0 8px rgba(212,165,116,0.4)',
          }}
        />
      </div>

      {/* Second ring - counter-rotating, different tilt */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: ringSize * 0.85,
          height: ringSize * 0.85,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotateX(75deg) rotateY(20deg)',
          border: '1px solid rgba(212,165,116,0.07)',
          animation: 'pcis-ring-spin-reverse 14s linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
        }}
      />

      {/* Shadow underneath the sphere for grounding */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: orbSize * 0.7,
          height: 6,
          bottom: -4,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(ellipse, rgba(212,165,116,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(3px)',
        }}
      />

      {/* Core sphere - multiple stacked gradient layers for depth */}
      <div
        className="absolute rounded-full transition-all duration-500"
        style={{
          width: orbSize,
          height: orbSize,
          top: 0,
          left: 0,
          // Base color: dark gold core
          background: isActive
            ? 'radial-gradient(circle at 40% 35%, #f5deb3 0%, #D4A574 22%, #b8864a 42%, #7a5525 65%, #3d2a12 85%, #1a0f05 100%)'
            : 'radial-gradient(circle at 40% 35%, #e8d5b7 0%, #D4A574 20%, #a97a42 40%, #6b4820 62%, #2c1a08 82%, #0d0600 100%)',
          boxShadow: isActive
            ? '0 4px 20px rgba(212,165,116,0.4), 0 0 40px rgba(212,165,116,0.15), inset 0 -6px 14px rgba(0,0,0,0.6), inset 0 4px 6px rgba(255,248,230,0.08)'
            : '0 4px 16px rgba(212,165,116,0.25), 0 0 30px rgba(212,165,116,0.08), inset 0 -6px 14px rgba(0,0,0,0.6), inset 0 4px 6px rgba(255,248,230,0.05)',
        }}
      >
        {/* Subsurface scattering layer - warm backlit edge */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 65% 70%, rgba(212,165,116,0.12) 0%, transparent 50%)',
          }}
        />

        {/* Primary specular highlight - sharp, bright, offset top-left */}
        <div
          className="absolute rounded-full"
          style={{
            width: 14,
            height: 9,
            top: '16%',
            left: '22%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.25) 40%, transparent 100%)',
            transform: 'rotate(-30deg)',
            filter: 'blur(0.5px)',
          }}
        />

        {/* Secondary specular - smaller, softer, slightly below primary */}
        <div
          className="absolute rounded-full"
          style={{
            width: 7,
            height: 5,
            top: '28%',
            left: '18%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, transparent 100%)',
            transform: 'rotate(-20deg)',
          }}
        />

        {/* Rim light - thin bright edge on the lit side */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(255,248,230,0.08) 0%, transparent 30%, transparent 85%, rgba(212,165,116,0.06) 100%)',
          }}
        />

        {/* Fresnel rim glow - subtle edge brightness all around */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, transparent 55%, rgba(212,165,116,0.08) 80%, rgba(212,165,116,0.04) 100%)',
          }}
        />

        {/* Reflected light from bottom - warm bounce */}
        <div
          className="absolute rounded-full"
          style={{
            width: 10,
            height: 6,
            bottom: '14%',
            right: '22%',
            background: 'radial-gradient(ellipse, rgba(245,222,179,0.12) 0%, transparent 100%)',
            transform: 'rotate(25deg)',
          }}
        />

        {/* Ambient occlusion - darkens the bottom curve */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.2) 85%, rgba(0,0,0,0.35) 100%)',
          }}
        />

        {/* Subtle inner shimmer that pulses */}
        <div
          className="absolute inset-2 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(255,248,230,0.04) 0%, transparent 60%)',
            animation: 'pcis-shimmer 5s ease-in-out infinite',
            animationPlayState: paused ? 'paused' : 'running',
          }}
        />
      </div>

      {/* Orbiting particle 1 - elliptical path */}
      <div
        className="absolute w-1 h-1 rounded-full pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          backgroundColor: 'rgba(212,165,116,0.8)',
          boxShadow: '0 0 6px rgba(212,165,116,0.5), 0 0 2px rgba(255,255,255,0.3)',
          animation: 'pcis-orbit 6s linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
          transformOrigin: '0 0',
        }}
      />

      {/* Orbiting particle 2 - wider orbit, slower */}
      <div
        className="absolute w-0.5 h-0.5 rounded-full pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          backgroundColor: 'rgba(212,165,116,0.5)',
          boxShadow: '0 0 4px rgba(212,165,116,0.3)',
          animation: 'pcis-orbit-2 9s linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
          transformOrigin: '0 0',
        }}
      />

      {/* Orbiting particle 3 - tiny, fast, close orbit */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 2,
          height: 2,
          top: '50%',
          left: '50%',
          backgroundColor: 'rgba(245,222,179,0.6)',
          boxShadow: '0 0 3px rgba(245,222,179,0.4)',
          animation: 'pcis-orbit-3 4s linear infinite',
          animationPlayState: paused ? 'paused' : 'running',
          transformOrigin: '0 0',
        }}
      />

      {/* CSS Animations */}
      <style>{`
        @keyframes pcis-glow {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes pcis-glow-2 {
          0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes pcis-ring-spin {
          0% { transform: translate(-50%, -50%) rotateX(65deg) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotateX(65deg) rotate(360deg); }
        }
        @keyframes pcis-ring-spin-reverse {
          0% { transform: translate(-50%, -50%) rotateX(75deg) rotateY(20deg) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotateX(75deg) rotateY(20deg) rotate(-360deg); }
        }
        @keyframes pcis-shimmer {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes pcis-orbit {
          0% { transform: rotate(0deg) translateX(30px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(30px) rotate(-360deg); }
        }
        @keyframes pcis-orbit-2 {
          0% { transform: rotate(120deg) translateX(38px) rotate(-120deg); }
          100% { transform: rotate(480deg) translateX(38px) rotate(-480deg); }
        }
        @keyframes pcis-orbit-3 {
          0% { transform: rotate(240deg) translateX(20px) rotate(-240deg); }
          100% { transform: rotate(600deg) translateX(20px) rotate(-600deg); }
        }
      `}</style>
    </button>
  )
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
  action?: { type: PanelType; label: string }
}

// ============================================================================
// Component
// ============================================================================

export default function CommandCentreView(): React.ReactElement {
  const { openPanelByType } = useWorkspaceNav()
  const [activeEngine, setActiveEngine] = useState<EngineKey | null>(null)
  const [activeSection, setActiveSection] = useState<'engines' | 'shortcuts' | 'presets'>('engines')
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Hey, I\'m your PCIS Assistant. Ask me anything about the system, whether that\'s engines, panels, navigation, shortcuts, or just how to get started.' },
  ])
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(true)
  const pk = usePlatformKey()

  // Pause CSS animations when panel is not in viewport
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [chatOpen])

  const handleSend = useCallback(() => {
    const q = chatInput.trim()
    if (!q) return
    const userMsg: ChatMessage = { role: 'user', text: q }
    const { answer, action } = findAnswer(q)
    const assistantMsg: ChatMessage = { role: 'assistant', text: answer, action }
    setChatMessages(prev => [...prev, userMsg, assistantMsg])
    setChatInput('')
  }, [chatInput])

  const activeEngineData = activeEngine ? ENGINES.find(e => e.key === activeEngine) : null

  return (
    <div ref={rootRef} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <h2
          className="text-lg font-semibold text-pcis-text tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          PCIS Command Centre
        </h2>
        <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
          System Guide · Navigation Map · Keyboard Reference
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex-shrink-0 py-3 border-b border-pcis-border/10 flex gap-2">
        {(['engines', 'shortcuts', 'presets'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-3 py-1.5 text-[9px] font-medium uppercase tracking-wider rounded transition-all ${
              activeSection === section
                ? 'bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/50'
                : 'bg-white/[0.02] text-white/70 border border-white/[0.04] hover:bg-white/[0.04]'
            }`}
          >
            {section === 'engines' ? 'Engines & Panels' : section === 'shortcuts' ? 'Keyboard Shortcuts' : 'Workspace Presets'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 pr-2">

        {/* ===== ENGINES SECTION ===== */}
        {activeSection === 'engines' && (
          <div className="space-y-3">
            {/* How to navigate */}
            <div className="bg-pcis-gold/[0.05] border border-pcis-gold/20 rounded-lg p-3">
              <p className="text-[9px] text-pcis-gold font-medium uppercase tracking-wider mb-1">How to Open Any Panel</p>
              <p className="text-[10px] text-white/70 leading-relaxed">
                Press <span className="text-white/90 font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[9px]">{pk('⌘K')}</span> to
                open the command bar, then type a <span className="text-pcis-gold font-semibold">GO-code</span> (the 3-letter code next to each panel below)
                or the panel name. Click any panel below to open it directly.
              </p>
            </div>

            {/* Engine Cards */}
            <div className="grid grid-cols-5 gap-2">
              {ENGINES.map(engine => (
                <button
                  key={engine.key}
                  onClick={() => setActiveEngine(activeEngine === engine.key ? null : engine.key)}
                  className={`rounded-lg p-3 text-left transition-all border ${
                    activeEngine === engine.key
                      ? 'border-white/20 bg-white/[0.06]'
                      : 'border-white/[0.04] bg-white/[0.02] hover:border-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: engine.color }} />
                    <span className="text-[9px] font-bold text-white/90 uppercase tracking-wider">{engine.label}</span>
                  </div>
                  <p className="text-[8px] text-white/50 leading-relaxed">{engine.fullName}</p>
                  <div className="mt-2 text-[8px] text-white/40">
                    {engine.panels.length} panels
                  </div>
                </button>
              ))}
            </div>

            {/* Expanded Engine Detail */}
            {activeEngineData && (
              <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                {/* Engine Header */}
                <div className="p-3 border-b border-white/[0.04]" style={{ backgroundColor: `${activeEngineData.color}08` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeEngineData.color }} />
                    <span className="text-[11px] font-bold text-white/90">{activeEngineData.fullName}</span>
                  </div>
                  <p className="text-[9px] text-white/60 leading-relaxed">{activeEngineData.description}</p>
                </div>

                {/* Panel List */}
                <div className="divide-y divide-white/[0.03]">
                  {activeEngineData.panels.map(panel => (
                    <button
                      key={panel.code}
                      onClick={() => !panel.comingSoon && openPanelByType(panel.type, 'tab')}
                      className={`w-full text-left px-3 py-2.5 transition-colors group flex items-start gap-3 ${panel.comingSoon ? 'opacity-50 cursor-default' : 'hover:bg-white/[0.03]'}`}
                    >
                      {/* GO-code */}
                      <span
                        className="text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded flex-shrink-0 mt-0.5"
                        style={{ color: activeEngineData.color, backgroundColor: `${activeEngineData.color}15` }}
                      >
                        {panel.code}
                      </span>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-white/90 group-hover:text-pcis-gold transition-colors flex items-center gap-2">
                          {panel.name}
                          {panel.comingSoon && <span className="text-[7px] font-mono font-normal uppercase tracking-widest text-pcis-gold/60 border border-pcis-gold/20 rounded px-1.5 py-0.5">Coming Soon</span>}
                        </p>
                        <p className="text-[8px] text-white/50 mt-0.5 leading-relaxed">
                          {panel.description}
                        </p>
                      </div>

                      {/* Open arrow */}
                      {!panel.comingSoon && <span className="text-[10px] text-white/20 group-hover:text-pcis-gold flex-shrink-0 mt-1 transition-colors">
                        →
                      </span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* All GO-codes quick reference (when no engine selected) */}
            {!activeEngine && (
              <div className="space-y-2">
                <p className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider">All GO-Codes Quick Reference</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {ENGINES.flatMap(engine =>
                    engine.panels.map(panel => (
                      <button
                        key={panel.code}
                        onClick={() => !panel.comingSoon && openPanelByType(panel.type, 'tab')}
                        className={`bg-white/[0.02] border border-white/[0.04] rounded px-2 py-1.5 text-left transition-all group ${panel.comingSoon ? 'opacity-40 cursor-default' : 'hover:border-white/[0.08]'}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[8px] font-mono font-bold"
                            style={{ color: engine.color }}
                          >
                            {panel.code}
                          </span>
                          <span className="text-[8px] text-white/60 group-hover:text-white/90 truncate transition-colors">
                            {panel.name}
                          </span>
                          {panel.comingSoon && <span className="text-[6px] text-pcis-gold/50 font-mono uppercase">Soon</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== SHORTCUTS SECTION ===== */}
        {activeSection === 'shortcuts' && (
          <div className="space-y-3">
            <div className="bg-pcis-gold/[0.05] border border-pcis-gold/20 rounded-lg p-3">
              <p className="text-[9px] text-pcis-gold font-medium uppercase tracking-wider mb-1">Bloomberg-Style Navigation</p>
              <p className="text-[10px] text-white/70 leading-relaxed">
                PCIS is keyboard-first. Every panel, client, and property is reachable without touching the mouse.
                The command bar (<span className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[9px] text-white/90">{pk('⌘K')}</span>)
                is your primary navigation. Type GO-codes, panel names, client names, or property names to instantly navigate.
              </p>
            </div>

            <div className="border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Keyboard Shortcuts</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {KEYBOARD_SHORTCUTS.map((shortcut, idx) => (
                  <div key={idx} className="px-3 py-2.5 flex items-center gap-4">
                    <span className="text-[11px] font-mono font-bold text-pcis-gold bg-white/[0.04] px-2.5 py-1 rounded w-24 text-center flex-shrink-0">
                      {pk(shortcut.keys)}
                    </span>
                    <span className="text-[10px] text-white/70">{shortcut.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel Tiling Guide */}
            <div className="border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Panel Tiling</span>
              </div>
              <div className="p-3 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-[9px] font-mono text-pcis-gold bg-white/[0.04] px-2 py-1 rounded flex-shrink-0">{pk('⌘\\')}</span>
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Split Right</p>
                    <p className="text-[8px] text-white/50 mt-0.5">Opens a new panel to the right of the current one. Use to compare two views side-by-side.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[9px] font-mono text-pcis-gold bg-white/[0.04] px-2 py-1 rounded flex-shrink-0">{pk('⌘⇧\\')}</span>
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Split Below</p>
                    <p className="text-[8px] text-white/50 mt-0.5">Opens a new panel below the current row. Use for overview + detail layouts.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-[9px] font-mono text-pcis-gold bg-white/[0.04] px-2 py-1 rounded flex-shrink-0">Tabs</span>
                  <div>
                    <p className="text-[10px] text-white/80 font-medium">Tabbed Panels</p>
                    <p className="text-[8px] text-white/50 mt-0.5">Opening a panel via {pk('⌘K')} adds it as a tab in the focused group. Click tabs to switch between stacked panels.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Workflow Examples */}
            <div className="border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Example Workflows</span>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <p className="text-[9px] text-pcis-gold font-medium uppercase tracking-wider mb-1">Client Meeting Prep</p>
                  <p className="text-[9px] text-white/60 leading-relaxed">
                    <span className="font-mono text-white/80">{pk('⌘K')} → C36</span> to open Client DNA → select client →
                    <span className="font-mono text-white/80"> {pk('⌘\\')}</span> to split right →
                    <span className="font-mono text-white/80"> {pk('⌘K')} → FDB</span> for Deal Briefs
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-pcis-gold font-medium uppercase tracking-wider mb-1">Morning Market Check</p>
                  <p className="text-[9px] text-white/60 leading-relaxed">
                    <span className="font-mono text-white/80">{pk('⌘K')} → SCT</span> for SCOUT Dashboard →
                    <span className="font-mono text-white/80"> {pk('⌘\\')}</span> →
                    <span className="font-mono text-white/80"> {pk('⌘K')} → NTF</span> for Notifications
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-pcis-gold font-medium uppercase tracking-wider mb-1">Deal Execution</p>
                  <p className="text-[9px] text-white/60 leading-relaxed">
                    <span className="font-mono text-white/80">{pk('⌘K')} → PPL</span> for Pipeline →
                    <span className="font-mono text-white/80"> {pk('⌘\\')}</span> →
                    <span className="font-mono text-white/80"> {pk('⌘K')} → FDH</span> for FORGE Dashboard →
                    <span className="font-mono text-white/80"> {pk('⌘\\')}</span> →
                    <span className="font-mono text-white/80"> {pk('⌘K')} → FCA</span> for Comm Advisor
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== PRESETS SECTION ===== */}
        {activeSection === 'presets' && (
          <div className="space-y-3">
            <div className="bg-pcis-gold/[0.05] border border-pcis-gold/20 rounded-lg p-3">
              <p className="text-[9px] text-pcis-gold font-medium uppercase tracking-wider mb-1">Workspace Presets</p>
              <p className="text-[10px] text-white/70 leading-relaxed">
                Presets instantly load a pre-arranged panel layout. Press
                <span className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[9px] text-white/90 mx-1">Alt+1</span>
                through
                <span className="font-mono bg-white/[0.06] px-1.5 py-0.5 rounded text-[9px] text-white/90 mx-1">Alt+5</span>
                to instantly switch between workspace configurations.
              </p>
            </div>

            {/* Current Presets */}
            <div className="border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Current Presets</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {PRESETS.map((preset, idx) => (
                  <div key={idx} className="px-3 py-3 flex items-start gap-4">
                    <span className="text-[10px] font-mono font-bold text-pcis-gold bg-white/[0.04] px-2.5 py-1 rounded w-16 text-center flex-shrink-0">
                      {preset.shortcut}
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold text-white/90">{preset.name}</p>
                      <p className="text-[8px] text-white/50 mt-0.5">{preset.panels}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Engine Presets */}
            <div className="border border-white/[0.04] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-white/[0.04] bg-white/[0.02]">
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Suggested Engine Presets</span>
                <span className="text-[8px] text-white/40 ml-2">Coming soon</span>
              </div>
              <div className="divide-y divide-white/[0.03]">
                {[
                  { name: 'Client Deep-Dive', panels: 'CIE Dashboard + Client 360 + Match Scorer', engines: ['CIE', 'ENGINE'] },
                  { name: 'Deal Execution', panels: 'FORGE Dashboard + Deal Briefs + Comm Advisor', engines: ['FORGE'] },
                  { name: 'Market Scan', panels: 'SCOUT Dashboard + Emerging Areas + Price Trends', engines: ['SCOUT'] },
                  { name: 'Pipeline Flow', panels: 'Pipeline + Notifications + FORGE Lifecycle', engines: ['CROSS', 'FORGE'] },
                  { name: 'Full Intelligence', panels: 'CIE Dashboard + SCOUT Dashboard + ENGINE Dashboard + FORGE Dashboard', engines: ['CIE', 'SCOUT', 'ENGINE', 'FORGE'] },
                ].map((preset, idx) => (
                  <div key={idx} className="px-3 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[10px] font-semibold text-white/90">{preset.name}</p>
                      <div className="flex gap-1">
                        {preset.engines.map(e => {
                          const eng = ENGINES.find(en => en.key === e)
                          return (
                            <span
                              key={e}
                              className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                              style={{ color: eng?.color, backgroundColor: `${eng?.color}15` }}
                            >
                              {e}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <p className="text-[8px] text-white/50">{preset.panels}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* How to build your own */}
            <div className="border border-white/[0.04] rounded-lg p-3 space-y-2">
              <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Build Your Own Layout</p>
              <div className="space-y-1.5">
                <p className="text-[9px] text-white/60 leading-relaxed">
                  <span className="text-white/80 font-medium">1.</span> Open your first panel via <span className="font-mono text-pcis-gold">{pk('⌘K')}</span>
                </p>
                <p className="text-[9px] text-white/60 leading-relaxed">
                  <span className="text-white/80 font-medium">2.</span> Split right (<span className="font-mono text-pcis-gold">{pk('⌘\\')}</span>) or below (<span className="font-mono text-pcis-gold">{pk('⌘⇧\\')}</span>) to add more panels
                </p>
                <p className="text-[9px] text-white/60 leading-relaxed">
                  <span className="text-white/80 font-medium">3.</span> Use <span className="font-mono text-pcis-gold">{pk('⌘K')}</span> in each panel slot to choose what goes there
                </p>
                <p className="text-[9px] text-white/60 leading-relaxed">
                  <span className="text-white/80 font-medium">4.</span> Drag panel edges to resize. Your layout is your workspace.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== AI ASSISTANT ORB + CHAT ===== */}
      <div className="flex-shrink-0 border-t border-pcis-border/10 pt-4">
        {/* Collapsed state: orb + prompt */}
        {!chatOpen && (
          <div className="flex flex-col items-center gap-3 py-2">
            <PCISOrb isActive={false} onClick={() => setChatOpen(true)} paused={!isVisible} />
            <p className="text-[9px] text-white/40 uppercase tracking-wider">
              Ask me anything about PCIS
            </p>
          </div>
        )}

        {/* Expanded chat */}
        {chatOpen && (
          <div className="space-y-3">
            {/* Chat header with orb */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PCISOrb isActive={true} onClick={() => setChatOpen(false)} paused={!isVisible} />
                <div>
                  <p className="text-[10px] font-semibold text-pcis-gold">PCIS Assistant</p>
                  <p className="text-[8px] text-white/40">Full knowledge of all 4 engines · {Object.keys(PANEL_REGISTRY).length} panels</p>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-2 py-1"
              >
                ✕
              </button>
            </div>

            {/* Chat messages */}
            <div className="bg-black/30 border border-white/[0.06] rounded-lg max-h-48 overflow-y-auto p-3 space-y-2.5">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-pcis-gold/20 border border-pcis-gold/30'
                        : 'bg-white/[0.04] border border-white/[0.06]'
                    }`}
                  >
                    <p className={`text-[10px] leading-relaxed ${
                      msg.role === 'user' ? 'text-pcis-gold' : 'text-white/80'
                    }`}>
                      {pk(msg.text)}
                    </p>
                    {msg.action && (
                      <button
                        onClick={() => openPanelByType(msg.action!.type, 'split-right')}
                        className="mt-1.5 text-[9px] font-medium text-pcis-gold bg-pcis-gold/10 border border-pcis-gold/30 rounded px-2 py-1 hover:bg-pcis-gold/20 transition-colors"
                      >
                        → {msg.action.label}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder="Ask about engines, panels, navigation..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[10px] text-white/90 placeholder:text-white/30 focus:outline-none focus:border-pcis-gold/40 transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!chatInput.trim()}
                className="px-4 py-2 text-[9px] font-bold uppercase tracking-wider bg-pcis-gold/20 text-pcis-gold border border-pcis-gold/40 rounded-lg hover:bg-pcis-gold/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>

            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {['What is PCIS?', 'How do I navigate?', 'Meeting prep', 'Find a property'].map(q => (
                <button
                  key={q}
                  onClick={() => {
                    setChatInput(q)
                    // Auto-send after setting
                    const { answer, action } = findAnswer(q)
                    setChatMessages(prev => [...prev, { role: 'user', text: q }, { role: 'assistant', text: answer, action }])
                  }}
                  className="text-[8px] text-white/50 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-1 hover:bg-white/[0.06] hover:text-white/70 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
