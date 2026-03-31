'use client'

import jsPDF from 'jspdf'

// ============================================================================
// Deal Intelligence Memorandum -- PDF Generator v4
// ============================================================================
// Clean, McKinsey-grade narrative document:
//   Page 1: Title page (brand, property, client, date)
//   Page 2: Table of Contents
//   Page 3+: Pure narrative sections (no metrics, no tables, no dashboards)
//   Final: Compact disclaimer
// ============================================================================

const GOLD      = '#C9A55A'
const GOLD_DARK = '#A07D3A'
const CREAM     = '#F8F6F1'
const TEXT_1    = '#1A1A1A'
const TEXT_2    = '#4A4A4A'
const TEXT_3    = '#8A8A8A'
const BORDER    = '#E5E0D5'

const DEAL_SECTIONS = [
  'EXECUTIVE SUMMARY',
  'STRATEGIC RATIONALE',
  'FINANCIAL ANALYSIS',
  'MARKET POSITIONING',
  'RISK ASSESSMENT',
  'LIFESTYLE AND VALUE PROPOSITION',
  'RECOMMENDED NEXT STEPS'
]
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

export interface DealPdfData {
  clientName: string
  clientType: string
  propertyName: string
  propertyArea: string
  matchScore: number
  matchGrade: string
  content: string
  propertyPrice?: number
  propertySqft?: number
  propertyBedrooms?: number
  propertyType?: string
  budgetMin?: number
  budgetMax?: number
  pillarScores?: {
    financialFit: number
    lifestyleFit: number
    investmentFit: number
    purposeAlignment: number
  }
  areaData?: {
    demandScore?: number
    rentalYield?: number
    priceChange30d?: number
    transactionCount90d?: number
    avgPriceSqft?: number
    outlook?: string
  }
  purpose?: string
  dealStage?: string
  archetype?: string
}

function parseSections(text: string): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = []
  const re = new RegExp(`(${DEAL_SECTIONS.join('|')})`, 'g')
  const parts = text.split(re).filter(Boolean)
  for (let i = 0; i < parts.length; i++) {
    if (DEAL_SECTIONS.includes(parts[i].trim())) {
      out.push({ heading: parts[i].trim(), body: (parts[i + 1] || '').trim() })
      i++
    }
  }
  return out
}

function wrap(doc: jsPDF, text: string, maxW: number, fs: number): string[] {
  doc.setFontSize(fs)
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (doc.getTextWidth(t) > maxW && cur) { lines.push(cur); cur = w }
    else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}

function clean(t: string): string {
  return t
    .replace(/^#{1,6}\s*/g, '').replace(/#{1,6}\s*/g, '')
    .replace(/\*{1,3}/g, '').replace(/_{1,3}/g, ' ')
    .replace(/~{2}/g, '').replace(/`{1,3}/g, '')
    .replace(/^>\s*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/---+/g, '').replace(/===+/g, '').replace(/\|/g, ' ')
    .trim()
}

// ══════════════════════════════════════════════════════════════════════════════
export function generateDealMemorandum(data: DealPdfData): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210, PH = 297, ML = 20, MR = 20, CW = PW - ML - MR
  let y = 0, pg = 1
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  // ── Helpers ─────────────────────────────────────────────────────────────
  const footer = () => {
    doc.setDrawColor(GOLD); doc.setLineWidth(0.3)
    doc.line(ML, PH - 14, PW - MR, PH - 14)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(TEXT_3)
    doc.text('PCIS Solutions  |  Confidential', ML, PH - 10)
    doc.text(`Page ${pg}`, PW - MR, PH - 10, { align: 'right' })
  }

  const pageHeader = () => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(GOLD)
    doc.text('P C I S   S O L U T I O N S', ML, 12)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(TEXT_3)
    doc.text('Deal Intelligence Memorandum', PW - MR, 12, { align: 'right' })
    doc.setDrawColor(GOLD); doc.setLineWidth(0.2)
    doc.line(ML, 14.5, PW - MR, 14.5)
  }

  const newPg = () => {
    footer(); doc.addPage(); pg++; pageHeader(); y = 22
  }

  const chk = (need: number) => { if (y + need > PH - 20) newPg() }

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 1 -- CLEAN TITLE PAGE
  // ════════════════════════════════════════════════════════════════════════
  doc.setFillColor(GOLD); doc.rect(0, 0, PW, 2, 'F')

  // Brand
  y = 25
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(GOLD)
  doc.text('P C I S   S O L U T I O N S', ML, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(TEXT_3)
  doc.text('Property & Client Intelligence', ML, y + 4)

  // Gold rule
  y = 42
  doc.setDrawColor(GOLD); doc.setLineWidth(0.8)
  doc.line(ML, y, ML + 32, y)

  // Title
  y = 58
  doc.setFont('helvetica', 'bold'); doc.setFontSize(32); doc.setTextColor(TEXT_1)
  doc.text('Deal Intelligence', ML, y)
  doc.text('Memorandum', ML, y + 13)

  y += 17
  doc.setDrawColor(GOLD); doc.setLineWidth(1)
  doc.line(ML, y, ML + 50, y)

  // ── Client / Property block ────────────────────────────────────────────
  y += 14
  doc.setFillColor(CREAM); doc.setDrawColor(GOLD); doc.setLineWidth(0.2)
  doc.roundedRect(ML, y, CW, 48, 2, 2, 'FD')

  const bTop = y

  // Client
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(TEXT_3)
  doc.text('PREPARED FOR', ML + 7, bTop + 9)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(TEXT_1)
  doc.text(data.clientName, ML + 7, bTop + 18)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(GOLD_DARK)
  doc.text(`${data.clientType}${data.dealStage ? '  |  ' + data.dealStage : ''}`, ML + 7, bTop + 24)

  // Divider
  doc.setDrawColor(BORDER); doc.setLineWidth(0.15)
  doc.line(ML + 7, bTop + 28, PW - MR - 7, bTop + 28)

  // Property
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(TEXT_3)
  doc.text('SUBJECT PROPERTY', ML + 7, bTop + 33)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(TEXT_1)
  doc.text(data.propertyName || 'Property', ML + 7, bTop + 40)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(TEXT_2)
  doc.text(data.propertyArea || '', ML + 7, bTop + 45)

  // ── Confidentiality & Date ─────────────────────────────────────────────
  y = PH - 42
  doc.setDrawColor(BORDER); doc.setLineWidth(0.15)
  doc.line(ML, y, PW - MR, y)
  y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(TEXT_3)
  doc.text('STRICTLY PRIVATE & CONFIDENTIAL', ML, y)
  y += 3.5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5)
  const cLines = wrap(doc, 'This document has been prepared exclusively for the intended recipient by PCIS Solutions. It contains proprietary research and analysis. Reproduction or distribution without written consent is prohibited.', CW, 5.5)
  for (const l of cLines) { doc.text(l, ML, y); y += 2.8 }
  y += 3
  doc.setFontSize(7.5); doc.setTextColor(TEXT_2); doc.text(date, ML, y)

  // Cover footer
  doc.setDrawColor(GOLD); doc.setLineWidth(0.3)
  doc.line(ML, PH - 14, PW - MR, PH - 14)
  doc.setFontSize(6); doc.setTextColor(TEXT_3)
  doc.text('PCIS Solutions  |  Confidential', ML, PH - 10)
  doc.setFillColor(GOLD); doc.rect(0, PH - 2, PW, 2, 'F')

  // ════════════════════════════════════════════════════════════════════════
  // PAGE 2 -- TABLE OF CONTENTS
  // ════════════════════════════════════════════════════════════════════════
  doc.addPage(); pg++; pageHeader()

  y = 32
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(TEXT_1)
  doc.text('Table of Contents', ML, y)

  y += 3
  doc.setDrawColor(GOLD); doc.setLineWidth(0.6)
  doc.line(ML, y, ML + 40, y)

  y += 14

  const sections = parseSections(data.content)
  const sectionNames = sections.length > 0
    ? sections.map(s => s.heading)
    : DEAL_SECTIONS

  sectionNames.forEach((name, idx) => {
    // Roman numeral
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(GOLD)
    doc.text(ROMAN[idx] || String(idx + 1), ML + 2, y)

    // Section name -- title case
    const titleCase = name.split(' ').map(w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ')
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(TEXT_1)
    doc.text(titleCase, ML + 16, y)

    // Dotted leader line
    doc.setDrawColor(BORDER); doc.setLineWidth(0.15)
    const textEnd = ML + 16 + doc.getTextWidth(titleCase) + 3
    const lineEnd = PW - MR - 5
    if (textEnd < lineEnd) {
      doc.setLineDashPattern([0.5, 1.5], 0)
      doc.line(textEnd, y - 0.5, lineEnd, y - 0.5)
      doc.setLineDashPattern([], 0)
    }

    y += 11
  })

  footer()

  // ════════════════════════════════════════════════════════════════════════
  // CONTENT PAGES -- pure narrative, no metrics, no tables
  // ════════════════════════════════════════════════════════════════════════
  if (sections.length === 0) {
    const fn = `PCIS_Deal_Memo_${data.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(fn); return
  }

  doc.addPage(); pg++; pageHeader(); y = 22

  sections.forEach((section, idx) => {
    // Section header needs ~20mm
    chk(22)

    // Gold accent bar + heading
    doc.setFillColor(GOLD); doc.rect(ML, y, 2, 10, 'F')

    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(GOLD_DARK)
    doc.text(`SECTION ${ROMAN[idx] || String(idx + 1)}`, ML + 6, y + 3)

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(TEXT_1)
    doc.text(section.heading, ML + 6, y + 9.5)

    y += 15

    // Body paragraphs
    const paragraphs = section.body.split('\n').filter(p => p.trim())

    for (const para of paragraphs) {
      const c = clean(para)
      if (!c) continue

      const isBullet = c.startsWith('-') || c.startsWith('*') || /^\d+[\.\)]\s/.test(c)

      if (isBullet) {
        const bt = c.replace(/^[-*]\s*/, '').replace(/^\d+[\.\)]\s*/, '')
        const bl = wrap(doc, bt, CW - 16, 9)
        chk(bl.length * 4 + 2)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(TEXT_2)
        doc.setFillColor(GOLD); doc.circle(ML + 9, y - 0.5, 0.6, 'F')
        for (const l of bl) { chk(4.5); doc.text(l, ML + 14, y); y += 4 }
        y += 1
      } else {
        const pl = wrap(doc, c, CW - 6, 9.5)
        chk(pl.length * 4.2 + 2)
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(TEXT_2)
        for (const l of pl) { chk(4.5); doc.text(l, ML + 6, y); y += 4.2 }
        y += 2.5
      }
    }

    // Light divider between sections (not after last)
    if (idx < sections.length - 1) {
      y += 3
      chk(4)
      doc.setDrawColor(BORDER); doc.setLineWidth(0.12)
      doc.line(ML + 6, y, PW - MR, y)
      y += 6
    }
  })

  footer()

  // ════════════════════════════════════════════════════════════════════════
  // DISCLAIMER (compact -- fits on last page if space allows)
  // ════════════════════════════════════════════════════════════════════════
  chk(80)
  y += 8
  doc.setDrawColor(BORDER); doc.setLineWidth(0.12)
  doc.line(ML, y, PW - MR, y)
  y += 6

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(TEXT_1)
  doc.text('Important Notice & Disclaimer', ML, y)
  y += 2
  doc.setDrawColor(GOLD); doc.setLineWidth(0.4)
  doc.line(ML, y, ML + 35, y)
  y += 6

  const discs = [
    ['Purpose', 'This memorandum has been prepared by PCIS Solutions exclusively for the named recipient to support the evaluation of the referenced property opportunity. It should be read in conjunction with independent professional advice.'],
    ['No Financial Advice', 'The analysis herein is based on market data available at the time of preparation and should not be construed as financial, legal, or investment advice. All valuations, projections, and scenarios are indicative. PCIS Solutions recommends consulting qualified advisors before making investment decisions.'],
    ['Methodology', 'Assessments are based on proprietary research evaluating financial suitability, lifestyle alignment, investment potential, and strategic fit. Findings should be considered alongside independent due diligence.'],
    ['Confidentiality', 'This document is strictly confidential. No part may be reproduced or distributed without written consent from PCIS Solutions.'],
  ]

  for (const [t, b] of discs) {
    chk(14)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(TEXT_1)
    doc.text(t, ML, y); y += 3.5
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(TEXT_3)
    const dl = wrap(doc, b, CW, 6.5)
    for (const l of dl) { chk(3.5); doc.text(l, ML, y); y += 3.2 }
    y += 3
  }

  // Sign-off
  y += 4
  doc.setDrawColor(GOLD); doc.setLineWidth(0.2)
  doc.line(ML, y, ML + 25, y)
  y += 5
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(GOLD_DARK)
  doc.text('PCIS Solutions', ML, y)
  y += 3.5
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(TEXT_3)
  doc.text('Advisory Division  |  ' + date, ML, y)

  footer()
  doc.setFillColor(GOLD); doc.rect(0, PH - 2, PW, 2, 'F')

  // Save
  const fn = `PCIS_Deal_Memo_${data.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fn)
}
