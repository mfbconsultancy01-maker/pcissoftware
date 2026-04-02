// =============================================================================
// DLD → PCIS SCOUT Transform Pipeline
// =============================================================================
// Maps raw Dubai Land Department API responses (46-column schema) to PCIS
// internal types. Each transform function takes a raw DLD record and returns
// a typed PCIS object.
//
// DLD column reference (from dubaipulse.gov.ae/data/dld-transactions):
//   transaction_id, procedure_id, trans_group_id, trans_group_ar/en,
//   procedure_name_ar/en, instance_date, property_type_id, property_type_ar/en,
//   property_sub_type_id, property_sub_type_ar/en, property_usage_ar/en,
//   reg_type_id, reg_type_ar/en, area_id, area_name_ar/en, building_name_ar/en,
//   project_number, project_name_ar/en, master_project_ar/en,
//   nearest_landmark_ar/en, nearest_metro_ar/en, nearest_mall_ar/en,
//   rooms_ar/en, has_parking, procedure_area, actual_worth,
//   meter_sale_price, rent_value, meter_rent_price,
//   no_of_parties_role_1/2/3
// =============================================================================

import type { Transaction, VolumeByPeriod, VolumeByArea, VolumeByType, BuyerProfile } from './transactionData'

// ---------------------------------------------------------------------------
// Raw DLD Record Type (what the API actually returns)
// ---------------------------------------------------------------------------

export interface RawDLDTransaction {
  transaction_id?: string
  procedure_id?: string
  trans_group_en?: string        // "Sales", "Mortgage", "Gifts"
  trans_group_ar?: string
  procedure_name_en?: string     // "Sell" | "Mortgage" | "Pre Registration Sale" etc.
  instance_date?: string         // "2026-01-15" or ISO
  property_type_en?: string      // "Unit" | "Villa" | "Land" | "Building"
  property_sub_type_en?: string  // "Flat" | "Office" | "Hotel Apartment" etc.
  property_usage_en?: string     // "Residential" | "Commercial" | "Industrial"
  reg_type_en?: string           // "Ready" | "Off-plan"
  area_id?: string
  area_name_en?: string          // "Palm Jumeirah" | "Dubai Marina" etc.
  building_name_en?: string
  project_number?: string
  project_name_en?: string
  master_project_en?: string
  nearest_landmark_en?: string
  nearest_metro_en?: string
  nearest_mall_en?: string
  rooms_en?: string              // "1 B/R" | "2 B/R" | "Studio" | "3 B/R" etc.
  has_parking?: boolean | string
  procedure_area?: number | string  // sqft or sqm (DLD uses sqft)
  actual_worth?: number | string    // AED transaction value
  meter_sale_price?: number | string // AED per sqm
  rent_value?: number | string
  meter_rent_price?: number | string
  no_of_parties_role_1?: number
  no_of_parties_role_2?: number
  no_of_parties_role_3?: number
}

// ---------------------------------------------------------------------------
// Transform: DLD Transaction → PCIS Transaction
// ---------------------------------------------------------------------------

/**
 * Map a DLD property_type_en + property_sub_type_en to a PCIS property type.
 * DLD uses "Unit" as a generic type — the sub_type differentiates.
 */
function mapPropertyType(
  type?: string,
  subType?: string,
): Transaction['propertyType'] {
  const sub = (subType || '').toLowerCase()
  const main = (type || '').toLowerCase()

  if (main === 'villa' || sub.includes('villa')) return 'Villa'
  if (sub.includes('penthouse')) return 'Penthouse'
  if (sub.includes('townhouse') || sub.includes('town house')) return 'Townhouse'
  if (main === 'land' || sub.includes('land') || sub.includes('plot')) return 'Land'
  if (sub.includes('office')) return 'Office'
  if (sub.includes('retail') || sub.includes('shop')) return 'Retail'
  // Default: apartments, flats, hotel apartments, studios → Apartment
  return 'Apartment'
}

/**
 * Map DLD trans_group_en to PCIS transaction type
 */
function mapTransactionType(transGroup?: string): Transaction['transactionType'] {
  const g = (transGroup || '').toLowerCase()
  if (g.includes('mortgage')) return 'Mortgage'
  if (g.includes('gift')) return 'Gift'
  return 'Sale'
}

/**
 * Parse the DLD rooms_en field (e.g. "1 B/R", "2 B/R", "Studio", "3 B/R")
 * into a numeric bedroom count.
 */
function parseBedroomCount(rooms?: string): number {
  if (!rooms) return 0
  const r = rooms.toLowerCase().trim()
  if (r.includes('studio')) return 0
  const match = r.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Safely parse a numeric field that might come as string or number
 */
function num(val?: number | string): number {
  if (val === undefined || val === null || val === '') return 0
  const n = typeof val === 'string' ? parseFloat(val) : val
  return isNaN(n) ? 0 : n
}

/**
 * DLD meter_sale_price is AED per square meter.
 * Convert to AED per square foot (1 sqm = 10.764 sqft).
 */
function meterPriceToSqftPrice(meterPrice: number): number {
  if (!meterPrice) return 0
  return Math.round(meterPrice / 10.764)
}

/**
 * DLD procedure_area is in square feet (confirmed by DLD documentation).
 * Some records may use sqm — handle both.
 */
function parseArea(val?: number | string): number {
  return Math.round(num(val))
}

/**
 * Main transform: raw DLD record → PCIS Transaction
 *
 * Fields that DLD doesn't provide (buyerNationality, paymentMethod) are
 * inferred where possible or set to defaults.
 */
export function transformDLDTransaction(
  raw: RawDLDTransaction,
  areaAvgPrices?: Map<string, number>,
  buildingAvgPrices?: Map<string, number>,
): Transaction {
  const size = parseArea(raw.procedure_area)
  const value = num(raw.actual_worth)
  const meterPrice = num(raw.meter_sale_price)

  // Price per sqft: prefer computed from value/size, fall back to converted meter price
  const priceSqft = size > 0 ? Math.round(value / size) : meterPriceToSqftPrice(meterPrice)

  // Area average lookup
  const areaKey = raw.area_name_en || ''
  const areaAvg = areaAvgPrices?.get(areaKey) || 0
  const buildingKey = raw.building_name_en || ''
  const buildingAvg = buildingAvgPrices?.get(buildingKey)

  // Transaction type determines payment method inference
  const transType = mapTransactionType(raw.trans_group_en)
  const isOffPlan = (raw.reg_type_en || '').toLowerCase() === 'off-plan'

  return {
    id: raw.transaction_id || `dld-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: raw.instance_date || new Date().toISOString().split('T')[0],
    area: raw.area_name_en || 'Unknown',
    areaId: raw.area_id || '',
    subArea: raw.master_project_en || undefined,
    building: raw.building_name_en || raw.project_name_en || 'Unknown',
    unitNumber: undefined, // DLD doesn't expose unit numbers in open data
    propertyType: mapPropertyType(raw.property_type_en, raw.property_sub_type_en),
    bedrooms: parseBedroomCount(raw.rooms_en),
    size,
    transactionValue: value,
    priceSqft,
    transactionType: transType,
    usageType: (raw.property_usage_en || '').toLowerCase().includes('commercial') ? 'Commercial' : 'Residential',
    isOffPlan,
    registrationStatus: 'Registered',
    // DLD open data does NOT include buyer nationality — set to 'Undisclosed'
    buyerNationality: 'Undisclosed',
    // Infer payment method from transaction type
    paymentMethod: transType === 'Mortgage' ? 'Mortgage' : 'Cash',
    // Computed context
    areaAvgPriceSqft: areaAvg,
    buildingAvgPriceSqft: buildingAvg,
    priceVsAreaAvg: areaAvg > 0 ? Math.round(((priceSqft - areaAvg) / areaAvg) * 100) : 0,
    priceVsBuildingAvg: buildingAvg ? Math.round(((priceSqft - buildingAvg) / buildingAvg) * 100) : undefined,
  }
}

// ---------------------------------------------------------------------------
// Batch Transforms: Aggregate DLD data into SCOUT intelligence
// ---------------------------------------------------------------------------

/**
 * Compute area-level average prices from a batch of transactions.
 * Returns a Map: area_name → avg price per sqft.
 */
export function computeAreaAverages(transactions: Transaction[]): Map<string, number> {
  const areaMap = new Map<string, { totalPrice: number; count: number }>()

  for (const tx of transactions) {
    if (tx.priceSqft <= 0 || tx.propertyType === 'Land') continue
    const entry = areaMap.get(tx.area) || { totalPrice: 0, count: 0 }
    entry.totalPrice += tx.priceSqft
    entry.count += 1
    areaMap.set(tx.area, entry)
  }

  const result = new Map<string, number>()
  Array.from(areaMap.entries()).forEach(([area, { totalPrice, count }]) => {
    result.set(area, Math.round(totalPrice / count))
  })
  return result
}

/**
 * Compute building-level average prices from a batch of transactions.
 */
export function computeBuildingAverages(transactions: Transaction[]): Map<string, number> {
  const bldgMap = new Map<string, { totalPrice: number; count: number }>()

  for (const tx of transactions) {
    if (tx.priceSqft <= 0 || tx.propertyType === 'Land' || !tx.building) continue
    const entry = bldgMap.get(tx.building) || { totalPrice: 0, count: 0 }
    entry.totalPrice += tx.priceSqft
    entry.count += 1
    bldgMap.set(tx.building, entry)
  }

  const result = new Map<string, number>()
  Array.from(bldgMap.entries()).forEach(([bldg, { totalPrice, count }]) => {
    result.set(bldg, Math.round(totalPrice / count))
  })
  return result
}

/**
 * Aggregate transactions into monthly volume periods.
 */
export function aggregateVolumeByMonth(transactions: Transaction[]): VolumeByPeriod[] {
  const monthMap = new Map<string, { count: number; total: number; offPlan: number; cash: number }>()

  for (const tx of transactions) {
    const month = tx.date.slice(0, 7) // "2026-01"
    const entry = monthMap.get(month) || { count: 0, total: 0, offPlan: 0, cash: 0 }
    entry.count += 1
    entry.total += tx.transactionValue
    if (tx.isOffPlan) entry.offPlan += 1
    if (tx.paymentMethod === 'Cash') entry.cash += 1
    monthMap.set(month, entry)
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      transactions: data.count,
      totalValue: data.total,
      avgValue: data.count > 0 ? Math.round(data.total / data.count) : 0,
      offPlanPct: data.count > 0 ? Math.round((data.offPlan / data.count) * 100) : 0,
      cashPct: data.count > 0 ? Math.round((data.cash / data.count) * 100) : 0,
    }))
}

/**
 * Aggregate transactions by area with MoM and YoY changes.
 */
export function aggregateVolumeByArea(
  transactions: Transaction[],
  prevMonthTransactions?: Transaction[],
  prevYearTransactions?: Transaction[],
): VolumeByArea[] {
  const areaMap = new Map<string, { areaId: string; count: number; total: number; priceSum: number; priceCount: number }>()

  for (const tx of transactions) {
    const entry = areaMap.get(tx.area) || { areaId: tx.areaId, count: 0, total: 0, priceSum: 0, priceCount: 0 }
    entry.count += 1
    entry.total += tx.transactionValue
    if (tx.priceSqft > 0) {
      entry.priceSum += tx.priceSqft
      entry.priceCount += 1
    }
    areaMap.set(tx.area, entry)
  }

  // Compute prev month counts per area for MoM
  const prevMonthCounts = new Map<string, number>()
  if (prevMonthTransactions) {
    for (const tx of prevMonthTransactions) {
      prevMonthCounts.set(tx.area, (prevMonthCounts.get(tx.area) || 0) + 1)
    }
  }

  // Compute prev year counts per area for YoY
  const prevYearCounts = new Map<string, number>()
  if (prevYearTransactions) {
    for (const tx of prevYearTransactions) {
      prevYearCounts.set(tx.area, (prevYearCounts.get(tx.area) || 0) + 1)
    }
  }

  return Array.from(areaMap.entries())
    .sort(([, a], [, b]) => b.total - a.total)
    .map(([area, data]) => {
      const prevM = prevMonthCounts.get(area) || 0
      const prevY = prevYearCounts.get(area) || 0
      return {
        area,
        areaId: data.areaId,
        transactions: data.count,
        totalValue: data.total,
        avgPriceSqft: data.priceCount > 0 ? Math.round(data.priceSum / data.priceCount) : 0,
        momChange: prevM > 0 ? Math.round(((data.count - prevM) / prevM) * 100) : 0,
        yoyChange: prevY > 0 ? Math.round(((data.count - prevY) / prevY) * 100) : 0,
      }
    })
}

/**
 * Aggregate transactions by property type.
 */
export function aggregateVolumeByType(transactions: Transaction[]): VolumeByType[] {
  const typeMap = new Map<string, { count: number; total: number }>()

  for (const tx of transactions) {
    const entry = typeMap.get(tx.propertyType) || { count: 0, total: 0 }
    entry.count += 1
    entry.total += tx.transactionValue
    typeMap.set(tx.propertyType, entry)
  }

  const totalCount = transactions.length

  return Array.from(typeMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([propertyType, data]) => ({
      propertyType,
      transactions: data.count,
      totalValue: data.total,
      avgValue: data.count > 0 ? Math.round(data.total / data.count) : 0,
      pctOfTotal: totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0,
    }))
}

// ---------------------------------------------------------------------------
// DLD Project → PCIS Off-Plan mapping helpers
// ---------------------------------------------------------------------------

export interface RawDLDProject {
  project_number?: string
  project_name_en?: string
  project_name_ar?: string
  developer_name_en?: string
  area_name_en?: string
  area_id?: string
  master_project_en?: string
  project_status?: string
  total_units?: number | string
  completion_date?: string
}

/**
 * Map DLD project status strings to PCIS off-plan status.
 */
export function mapProjectStatus(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s.includes('completed') || s.includes('handed')) return 'Completed'
  if (s.includes('under construction') || s.includes('construction')) return 'Under Construction'
  if (s.includes('launched') || s.includes('launch')) return 'Launched'
  if (s.includes('announced')) return 'Announced'
  return 'Under Construction'
}

// ---------------------------------------------------------------------------
// DLD Building → PCIS building analytics helpers
// ---------------------------------------------------------------------------

export interface RawDLDBuilding {
  building_name_en?: string
  building_name_ar?: string
  area_name_en?: string
  area_id?: string
  project_name_en?: string
  total_units?: number | string
  parking_count?: number | string
}
