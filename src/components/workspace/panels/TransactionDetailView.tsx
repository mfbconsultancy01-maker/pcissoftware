'use client'

import React, { useMemo } from 'react'
import { mockTransactionData, type Transaction } from '@/lib/transactionData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

const { transactions } = mockTransactionData

// ============================================================================
// PCIS Transaction Detail View — Workspace Panel
// ============================================================================
// Deep-dive into a single transaction: specs, pricing context, comparables,
// market analysis. Context-linked to area profiles.
// ============================================================================

function MetricCard({
  label,
  value,
  unit = '',
  color = 'text-pcis-text',
  subtext = '',
}: {
  label: string
  value: string | number
  unit?: string
  color?: string
  subtext?: string
}) {
  return (
    <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
      <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1.5 font-semibold">
        {label}
      </div>
      <div className={`text-[13px] font-bold tabular-nums ${color}`}>
        {typeof value === 'number' ? value.toLocaleString('en-US') : value} {unit}
      </div>
      {subtext && <div className="text-[8px] text-pcis-text-muted/60 mt-1">{subtext}</div>}
    </div>
  )
}

export default function TransactionDetailView({ entityId }: { entityId: string }) {
  const nav = useWorkspaceNav()
  const txn = useMemo(() => transactions.find((t: Transaction) => t.id === entityId), [entityId])

  if (!txn) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-pcis-text-muted text-[10px]">Transaction not found</div>
          <div className="text-pcis-text-muted/50 text-[9px] mt-1">{entityId}</div>
        </div>
      </div>
    )
  }

  // Format date
  const txnDate = new Date(txn.date)
  const dateStr = txnDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })

  // Calculate building average if available
  const buildingAvg = txn.buildingAvgPriceSqft || txn.areaAvgPriceSqft

  // Color for price comparison
  const vsBuildingColor = txn.priceSqft >= buildingAvg ? 'text-green-400' : 'text-red-400'
  const vsBuildingPercent = ((txn.priceSqft - buildingAvg) / buildingAvg * 100).toFixed(1)

  return (
    <div className="h-full flex flex-col space-y-3 overflow-y-auto">
      {/* ---- Header Card ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {txn.building}
            </h2>
            {txn.unitNumber && (
              <div className="text-[10px] text-pcis-text-muted mt-0.5">Unit {txn.unitNumber}</div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <AreaLink areaId={txn.areaId} className="text-[10px] text-pcis-gold hover:text-pcis-gold/80">
                {txn.area}
              </AreaLink>
              <span className="text-[9px] text-pcis-text-muted">·</span>
              <span className="text-[9px] text-pcis-text-muted">{dateStr}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] px-1.5 py-0.5 rounded-lg bg-pcis-gold/[0.08] text-pcis-gold border border-pcis-gold/20 font-bold uppercase tracking-wider">
              {txn.propertyType.toUpperCase()}
            </span>
            {txn.bedrooms > 0 && (
              <span className="text-[8px] px-1.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
                {txn.bedrooms} BED
              </span>
            )}
            <span className={`text-[8px] px-1.5 py-0.5 rounded-lg font-bold uppercase tracking-wider ${
              txn.transactionType === 'Sale' ? 'bg-white/[0.03] text-pcis-text-muted border border-pcis-border/10' :
              txn.transactionType === 'Mortgage' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
              'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {txn.transactionType.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ---- Key Metrics (2 Rows of 3 Cards) ---- */}
      <div className="grid grid-cols-3 gap-2.5">
        <MetricCard
          label="PRICE"
          value={(txn.transactionValue / 1e6).toFixed(2)}
          unit="M AED"
          color="text-pcis-gold"
        />
        <MetricCard
          label="PRICE/SQFT"
          value={txn.priceSqft.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          unit="AED"
          color="text-pcis-text"
        />
        <MetricCard
          label="SIZE"
          value={(txn.size / 1000).toFixed(1)}
          unit="K SQFT"
          color="text-pcis-text"
        />
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <MetricCard
          label="BEDROOMS"
          value={txn.bedrooms}
          color="text-pcis-text"
        />
        <MetricCard
          label="VS AREA AVG"
          value={`${txn.priceVsAreaAvg > 0 ? '+' : ''}${txn.priceVsAreaAvg}`}
          unit="%"
          color={txn.priceVsAreaAvg >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <MetricCard
          label="VS BLDG AVG"
          value={`${parseFloat(vsBuildingPercent) > 0 ? '+' : ''}${vsBuildingPercent}`}
          unit="%"
          color={vsBuildingColor}
        />
      </div>

      {/* ---- Transaction Details Card ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4">
        <h3 className="text-[12px] font-semibold text-pcis-text uppercase tracking-wide pb-1.5 border-b border-pcis-border/10 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Transaction Details
        </h3>

        <div className="space-y-3">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Date</div>
              <div className="text-[10px] text-pcis-text">{dateStr}</div>
            </div>
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Registration Status</div>
              <div className="text-[10px] text-pcis-text">{txn.registrationStatus}</div>
            </div>
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Usage Type</div>
              <div className="text-[10px] text-pcis-text">{txn.usageType}</div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Plan Status</div>
              <div className="flex items-center gap-1">
                {txn.isOffPlan ? (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">OFF-PLAN</span>
                ) : (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">READY</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Buyer Nationality</div>
              <div className="text-[10px] text-pcis-text">{txn.buyerNationality}</div>
            </div>
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Seller Nationality</div>
              <div className="text-[10px] text-pcis-text">{txn.sellerNationality || '—'}</div>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Payment Method</div>
              <div className="flex items-center gap-1">
                {txn.paymentMethod === 'Cash' ? (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">CASH</span>
                ) : (
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">MORTGAGE</span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mb-1 font-semibold">Mortgage Provider</div>
              <div className="text-[10px] text-pcis-text">{txn.mortgageProvider || '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Market Context Card ---- */}
      <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4">
        <h3 className="text-[12px] font-semibold text-pcis-text uppercase tracking-wide pb-1.5 border-b border-pcis-border/10 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Market Context
        </h3>

        <div className="space-y-3">
          {/* Area Average */}
          <div>
            <div className="text-[10px] text-pcis-text-muted mb-2">
              Area Average Price/SQFT: <span className="text-pcis-text tabular-nums font-bold">{txn.areaAvgPriceSqft.toLocaleString('en-US')}</span>
            </div>
            <div className="w-full bg-pcis-border/10 rounded h-3 overflow-hidden flex">
              <div
                className="bg-pcis-gold/30"
                style={{ width: `${Math.min((txn.areaAvgPriceSqft / txn.priceSqft) * 100, 100)}%` }}
              />
              <div
                className="bg-pcis-gold/70"
                style={{ width: `${Math.min(((txn.priceSqft - txn.areaAvgPriceSqft) / txn.priceSqft) * 100, 100)}%` }}
              />
            </div>
            <div className="text-[8px] text-pcis-text-muted/60 mt-1.5 flex justify-between">
              <span>Avg</span>
              <span className={txn.priceVsAreaAvg >= 0 ? 'text-green-400' : 'text-red-400'}>
                {txn.priceVsAreaAvg >= 0 ? '+' : ''}{txn.priceVsAreaAvg}% vs Area
              </span>
            </div>
          </div>

          {/* Building Average (if available) */}
          {txn.buildingAvgPriceSqft && (
            <div>
              <div className="text-[10px] text-pcis-text-muted mb-2">
                Building Average Price/SQFT: <span className="text-pcis-text tabular-nums font-bold">{txn.buildingAvgPriceSqft.toLocaleString('en-US')}</span>
              </div>
              <div className="w-full bg-pcis-border/10 rounded h-3 overflow-hidden flex">
                <div
                  className="bg-pcis-gold/30"
                  style={{ width: `${Math.min((txn.buildingAvgPriceSqft / txn.priceSqft) * 100, 100)}%` }}
                />
                <div
                  className="bg-pcis-gold/70"
                  style={{ width: `${Math.min(((txn.priceSqft - txn.buildingAvgPriceSqft) / txn.priceSqft) * 100, 100)}%` }}
                />
              </div>
              <div className="text-[8px] text-pcis-text-muted/60 mt-1.5 flex justify-between">
                <span>Avg</span>
                <span className={vsBuildingColor}>
                  {parseFloat(vsBuildingPercent) > 0 ? '+' : ''}{vsBuildingPercent}% vs Building
                </span>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="border-t border-pcis-border/10 pt-2.5 mt-2.5">
            <div className="text-[8px] text-pcis-text-muted/70 leading-relaxed">
              {txn.priceVsAreaAvg >= 0 ? (
                <span className="text-green-400/70">
                  Premium transaction: {txn.priceVsAreaAvg}% above {txn.area} average
                </span>
              ) : (
                <span className="text-red-400/70">
                  Value transaction: {Math.abs(txn.priceVsAreaAvg)}% below {txn.area} average
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Area Link Button ---- */}
      <button
        onClick={() => nav.openArea(txn.areaId)}
        className="w-full bg-pcis-gold/[0.08] border border-pcis-gold/20 rounded-lg px-4 py-2.5 text-[10px] font-semibold text-pcis-gold hover:bg-pcis-gold/15 transition-colors"
      >
        View {txn.area} Area Profile
      </button>
    </div>
  )
}
