'use client'

import React, { useState } from 'react'
import { mockTransactionData, type BuildingAnalytics, type Transaction } from '@/lib/transactionData'

interface MetricData {
  label: string
  value: number | string
  format: (v: number | string) => string
}

interface BuyerNationalityItem {
  nationality: string
  pct: number
}

function PriceTrendChart({ data }: { data: number[] }): React.ReactElement | null {
  if (!data || !data.length) return null

  const min: number = Math.min(...data)
  const max: number = Math.max(...data)
  const range: number = max - min || 1
  const width: number = 240
  const height: number = 60
  const padding: number = 4
  const allMonths: string[] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  // Use only as many month labels as data points
  const months: string[] = allMonths.slice(0, data.length)

  const points: string = data
    .map((v: number, i: number) => {
      const x: number = padding + (data.length > 1 ? (i / (data.length - 1)) * (width - 2 * padding) : (width - 2 * padding) / 2)
      const y: number = height - padding - ((v - min) / range) * (height - 2 * padding)
      return `${x},${y}`
    })
    .join(' ')

  const areaPoints: string = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`

  const lastX: number = data.length > 1 ? width - padding : padding + (width - 2 * padding) / 2
  const lastY: number = height - padding - ((data[data.length - 1] - min) / range) * (height - 2 * padding)

  const isUptrend: boolean = data[data.length - 1] > data[0]
  const lineColor: string = isUptrend ? '#22c55e' : '#ef4444'

  return (
    <div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        <polyline points={areaPoints} fill={isUptrend ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)'} />
        <polyline points={points} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="3" fill={lineColor} />
      </svg>
      <div className="flex justify-between text-[8px] text-pcis-text-muted/60 mt-2 px-1">
        <span>{months[0]}</span>
        <span>{months[months.length - 1]}</span>
      </div>
    </div>
  )
}

function BuyerNationalityBars({ data }: { data: BuyerNationalityItem[] }): React.ReactElement {
  return (
    <div className="space-y-2.5">
      {data.map((item: BuyerNationalityItem) => {
        const isTop: boolean = data.indexOf(item) === 0
        const barColor: string = isTop ? '#d4a574' : '#3b82f6'

        return (
          <div key={item.nationality} className="flex items-center gap-2.5">
            <span className="text-[10px] font-semibold text-pcis-text w-24">{item.nationality}</span>
            <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: barColor }} />
            </div>
            <span className="text-[10px] font-bold text-pcis-text tabular-nums w-10 text-right">{item.pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

export default function BuildingAnalyticsView(): React.ReactElement {
  const buildings: BuildingAnalytics[] = mockTransactionData.buildingAnalytics
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingAnalytics>(buildings[0])

  const priceVsColor: string = selectedBuilding.priceVsAreaAvg >= 0 ? '#22c55e' : '#ef4444'

  const metrics: MetricData[] = [
    {
      label: 'Total Txns',
      value: selectedBuilding.totalTransactions,
      format: (v: number | string) => String(v),
    },
    {
      label: 'Avg AED/sqft',
      value: selectedBuilding.avgPriceSqft,
      format: (v: number | string) => (typeof v === 'number' ? v.toLocaleString() : v),
    },
    {
      label: 'Last Txn Date',
      value: selectedBuilding.lastTransactionDate,
      format: (v: number | string) => String(v),
    },
    {
      label: 'Last Txn Price',
      value: selectedBuilding.lastTransactionPrice,
      format: (v: number | string) => `${((v as number) / 1e6).toFixed(1)}M`,
    },
    {
      label: 'vs Area Avg',
      value: selectedBuilding.priceVsAreaAvg,
      format: (v: number | string) => `${(v as number) >= 0 ? '+' : ''}${v}%`,
    },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Building Analytics
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">{buildings.length} Buildings Tracked</p>
        </div>
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        <div className="w-40 flex-shrink-0 border-r border-pcis-border/10 overflow-y-auto">
          <div className="space-y-1 p-2.5">
            {buildings.map((building: BuildingAnalytics) => (
              <button
                key={building.building}
                onClick={() => setSelectedBuilding(building)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors text-[10px] border ${
                  selectedBuilding.building === building.building
                    ? 'bg-white/[0.04] border-pcis-gold/20 text-pcis-gold font-bold'
                    : 'bg-white/[0.02] border-pcis-border/10 text-pcis-text hover:bg-white/[0.03]'
                }`}
              >
                <div className="font-semibold truncate">{building.building}</div>
                <div className="text-[8px] text-pcis-text-muted mt-0.5">{building.area}</div>
                <div className="text-[8px] text-pcis-text-muted/60 mt-1 space-y-0.5">
                  <div>{building.avgPriceSqft.toLocaleString()} AED/sqft</div>
                  <div>{building.totalTransactions} txns</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 px-3 py-3 overflow-y-auto">
          <div className="flex-shrink-0 mb-4 pb-3 border-b border-pcis-border/10">
            <h3 className="text-[18px] font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>
              {selectedBuilding.building}
            </h3>
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-1">{selectedBuilding.area}</p>
          </div>

          <div className="grid grid-cols-5 gap-2 flex-shrink-0 mb-4">
            {metrics.map((metric: MetricData, idx: number) => (
              <div key={idx} className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
                <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block mb-1">{metric.label}</span>
                <span className="text-[11px] font-bold tabular-nums block" style={{ color: idx === 4 ? priceVsColor : '#d4a574' }}>
                  {metric.format(metric.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-shrink-0 mb-4">
            <h4 className="text-[12px] font-semibold text-pcis-text uppercase tracking-wide pb-1.5 border-b border-pcis-border/10 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Price Trend
            </h4>
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-3">
              <PriceTrendChart data={selectedBuilding.priceTrend} />
            </div>
          </div>

          {selectedBuilding.topBuyerNationalities && selectedBuilding.topBuyerNationalities.length > 0 && (
          <div className="flex-shrink-0 mb-4">
            <h4 className="text-[12px] font-semibold text-pcis-text uppercase tracking-wide pb-1.5 border-b border-pcis-border/10 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
              Top Buyer Nationalities
            </h4>
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-3">
              <BuyerNationalityBars data={selectedBuilding.topBuyerNationalities} />
            </div>
          </div>
          )}

          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-[12px] font-semibold text-pcis-text uppercase tracking-wide pb-1.5 border-b border-pcis-border/10 mb-2 flex-shrink-0" style={{ fontFamily: "'Playfair Display', serif" }}>
              Recent Transactions
            </h4>
            <div className="flex-1 overflow-y-auto min-h-0">
              {selectedBuilding.transactions.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-white/[0.01] border-b border-pcis-border/10">
                      <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-2.5 py-2">Date</th>
                      <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-2.5 py-2">Type</th>
                      <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-2.5 py-2">Beds</th>
                      <th className="text-left text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-2.5 py-2">Size</th>
                      <th className="text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-2.5 py-2">Price</th>
                      <th className="text-right text-[8px] text-pcis-text-muted/60 uppercase tracking-wider font-semibold px-2.5 py-2">AED/sqft</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBuilding.transactions.map((txn: any) => (
                      <tr key={txn.id} className="border-b border-pcis-border/5 hover:bg-white/[0.02] transition-colors">
                        <td className="text-[10px] text-pcis-text-muted px-2.5 py-2">{txn.date}</td>
                        <td className="text-[10px] text-pcis-text px-2.5 py-2">{txn.propertyType}</td>
                        <td className="text-[10px] font-bold text-pcis-text tabular-nums px-2.5 py-2">{txn.bedrooms}</td>
                        <td className="text-[10px] text-pcis-text-muted tabular-nums px-2.5 py-2">{(txn.size || 0).toLocaleString()}</td>
                        <td className="text-right text-[10px] font-bold text-pcis-gold tabular-nums px-2.5 py-2">
                          {(((txn.transactionValue || txn.price || 0)) / 1e6).toFixed(1)}M
                        </td>
                        <td className="text-right text-[10px] text-pcis-text-muted tabular-nums px-2.5 py-2">
                          {Math.round(txn.priceSqft || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex items-center justify-center h-20">
                  <span className="text-pcis-text-muted/40 text-[10px]">No transactions</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
