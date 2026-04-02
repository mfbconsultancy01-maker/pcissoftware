// =============================================================================
// PCIS P1 — API Response Transforms
// =============================================================================
// Maps PCISP1 backend API responses to frontend mock data shapes.
// This bridge layer lets pages gradually migrate from mock to live data.
// =============================================================================

import type {
  Property, PropertyDetail, Client, Match, Recommendation,
  IntelFeedItem, IntelFeedType, AreaMetric,
} from './mockData'

/**
 * Transform a backend property into the frontend Property shape
 */
export function transformProperty(p: any): Property {
  return {
    id: p.id,
    name: p.title || p.name || '',
    area: p.area || p.city || p.location || '',
    bedrooms: p.bedrooms || 0,
    price: Number(p.priceAmount) || Number(p.price) || 0,
    currency: p.currency || 'AED',
    type: p.type || 'Apartment',
    features: p.features || [],
  }
}

/**
 * Transform backend match into frontend Match shape
 */
export function transformMatch(m: any): Match {
  const breakdown = m.scoreBreakdown || {}
  const score = Number(m.overallScore) || 0
  return {
    id: m.id,
    clientId: m.clientId,
    propertyId: m.propertyId || '',
    grade: score >= 0.9 ? 'A+' : score >= 0.8 ? 'A' : score >= 0.7 ? 'B+' : score >= 0.6 ? 'B' : score >= 0.4 ? 'C' : 'D',
    overallScore: score,
    pillars: {
      clientFit: breakdown.clientFit || 0,
      financial: breakdown.financialAlignment || breakdown.financial || 0,
      value: breakdown.valueCreation || breakdown.value || 0,
      timing: breakdown.timing || 0,
    },
    aiIntelligence: m.engineNarrative || m.matchReason || '',
    createdAt: m.createdAt || new Date().toISOString(),
  }
}

/**
 * Transform backend client into frontend Client shape
 */
export function transformClient(c: any): Partial<Client> {
  return {
    id: c.id,
    name: `${c.firstName} ${c.lastName}`,
    initials: `${(c.firstName || '')[0] || ''}${(c.lastName || '')[0] || ''}`.toUpperCase(),
    type: c.tier === 'A' ? 'UHNW' : c.tier === 'B' ? 'HNW' : 'Affluent',
    email: c.email || '',
    phone: c.phone || '',
    location: c.cityOfResidence || c.countryOfResidence || '',
    onboardedAt: c.createdAt || '',
  }
}

/**
 * Transform a property into an intel feed item
 */
export function propertyToIntelItem(p: any): IntelFeedItem {
  const score = p.opportunity?.overallScore || 0
  return {
    id: `intel-${p.id}`,
    type: 'New Listing' as IntelFeedType,
    headline: p.title || p.name || 'New Property',
    description: p.opportunity?.opportunityNarrative || `${p.type} in ${p.area || 'Dubai'} — AED ${(Number(p.priceAmount) || 0).toLocaleString()}`,
    relevantClientIds: [],
    urgency: score >= 70 ? 'High' : score >= 50 ? 'Medium' : 'Low',
    timestamp: p.createdAt || new Date().toISOString(),
    tags: [p.externalSource || 'SCOUT', p.area || ''].filter(Boolean),
  }
}
