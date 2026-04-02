'use client';

import { useState, useMemo } from 'react';
import {
  economicIndicators,
  constructionData,
  mortgageMarket,
  type EconomicIndicator,
} from '@/lib/macroData';

const CATEGORIES = ['All', 'GDP', 'Inflation', 'Employment', 'Trade', 'FDI', 'Construction', 'Banking'] as const;
type Category = typeof CATEGORIES[number];

// SVG Sparkline Component
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  const padding = 2;

  const points = data
    .map((value, i) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Bar Chart Component for construction/mortgage data
function BarChart({
  data,
  height = 40,
  barColor = '#d4a574',
}: {
  data: number[];
  height?: number;
  barColor?: string;
}) {
  const max = Math.max(...data);
  const barWidth = 100 / data.length;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${data.length * 10} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
    >
      {data.map((value, i) => {
        const barHeight = (value / max) * height * 0.9;
        const y = height - barHeight;
        return (
          <rect
            key={i}
            x={i * 10}
            y={y}
            width={8}
            height={barHeight}
            fill={barColor}
            opacity="0.8"
          />
        );
      })}
    </svg>
  );
}

// Trend Arrow
function TrendArrow({ trend }: { trend: 'up' | 'down' | 'stable' | 'flat' }) {
  if (trend === 'up') return <span className="text-emerald-400">▲</span>;
  if (trend === 'down') return <span className="text-rose-400">▼</span>;
  return <span className="text-white/40">—</span>;
}

// Indicator Card
function IndicatorCard({ indicator }: { indicator: EconomicIndicator }) {
  const isPositiveDirection =
    (indicator.isPositiveForRE && indicator.trend === 'up') ||
    (!indicator.isPositiveForRE && indicator.trend === 'down');

  const valueColor = isPositiveDirection ? 'text-emerald-400' : 'text-rose-400';
  const sparklineColor = isPositiveDirection ? 'text-emerald-400/60' : 'text-rose-400/60';

  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-sm font-medium text-white/90">{indicator.name}</h4>
          <p className="text-[8px] text-white/40 uppercase tracking-wider mt-0.5">
            {indicator.category}
          </p>
        </div>
        <span className="text-xs bg-white/[0.04] border border-white/[0.08] text-white/70 px-2 py-1 rounded">
          {indicator.category}
        </span>
      </div>

      {/* Value & Trend */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2 mb-1">
          <span className={`text-xl font-semibold tabular-nums ${valueColor}`}>
            {indicator.currentValue.toLocaleString()}
          </span>
          <span className="text-xs text-white/70">{indicator.unit}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendArrow trend={indicator.trend} />
          <span className={`text-xs font-medium ${isPositiveDirection ? 'text-emerald-400' : 'text-rose-400'}`}>
            {indicator.changePercent > 0 ? '+' : ''}{indicator.changePercent.toFixed(1)}%
          </span>
          <span className="text-[8px] text-white/40">YoY</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className={`mb-3 h-5 ${sparklineColor}`}>
        <Sparkline data={indicator.history} />
      </div>

      {/* Impact Assessment */}
      <p className="text-[11px] text-white/70 leading-tight mb-2 flex-1">
        {indicator.impactOnRealEstate}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <p className="text-[8px] text-white/40">{indicator.source}</p>
        <p className="text-[8px] text-white/40">{indicator.lastUpdated}</p>
      </div>
    </div>
  );
}

export default function EconomicIndicatorsView() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('All');

  // Filter indicators
  const filteredIndicators = useMemo(() => {
    if (selectedCategory === 'All') return economicIndicators;
    return economicIndicators.filter((ind) => ind.category === selectedCategory.toLowerCase());
  }, [selectedCategory]);

  // Summary statistics
  const positiveIndicators = useMemo(() => {
    return filteredIndicators.filter(
      (ind) =>
        (ind.isPositiveForRE && ind.trend === 'up') ||
        (!ind.isPositiveForRE && ind.trend === 'down')
    );
  }, [filteredIndicators]);

  const negativeIndicators = useMemo(() => {
    return filteredIndicators.filter(
      (ind) =>
        (ind.isPositiveForRE && ind.trend === 'down') ||
        (!ind.isPositiveForRE && ind.trend === 'up')
    );
  }, [filteredIndicators]);

  // Construction data aggregation
  const totalUnitsUnderConstruction = constructionData.bySegment.reduce(
    (sum, seg) => sum + seg.units,
    0
  );

  // Mortgage market calculations
  const totalMortgageValue = mortgageMarket.totalMortgageValue12m;
  const mortgageGrowth = mortgageMarket.mortgageGrowthYoY;
  const avgRate = mortgageMarket.avgMortgageRate;
  const avgLTV = mortgageMarket.avgLTV;
  const approvalRate = mortgageMarket.approvalRate;
  const processingDays = mortgageMarket.avgProcessingDays;

  return (
    <div className="h-full flex flex-col bg-white/[0.01]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.04]">
        <h2
          className="text-2xl font-bold text-white/90 mb-1"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Economic Indicators
        </h2>
        <p className="text-xs text-white/70 mb-4">
          Dubai Economic Health & Real Estate Impact
        </p>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`text-xs px-3 py-1.5 rounded border transition-all ${
                selectedCategory === category
                  ? 'bg-[#d4a574]/10 border-[#d4a574] text-[#d4a574]'
                  : 'bg-white/[0.02] border-white/[0.08] text-white/70 hover:border-white/[0.12]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-6">
          {/* Indicator Cards Grid */}
          {filteredIndicators.length > 0 && (
            <section>
              <h3
                className="text-lg font-semibold text-white/90 mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Key Indicators ({filteredIndicators.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredIndicators.map((indicator) => (
                  <IndicatorCard key={indicator.id} indicator={indicator} />
                ))}
              </div>
            </section>
          )}

          {/* Construction Activity Section */}
          <section className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
            <h3
              className="text-lg font-semibold text-white/90 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Construction Activity
            </h3>

            {/* Units Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Under Construction
                </p>
                <p className="text-2xl font-bold text-[#d4a574] tabular-nums">
                  {(totalUnitsUnderConstruction / 1000).toFixed(0)}K
                </p>
                <p className="text-[8px] text-white/40 mt-1">units</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Delivered (12m)
                </p>
                <p className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {(constructionData.unitsDelivered12m / 1000).toFixed(1)}K
                </p>
                <p className="text-[8px] text-white/40 mt-1">units</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Expected (12m)
                </p>
                <p className="text-2xl font-bold text-white/90 tabular-nums">
                  {(constructionData.unitsExpected12m / 1000).toFixed(1)}K
                </p>
                <p className="text-[8px] text-white/40 mt-1">units</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Expected (24m)
                </p>
                <p className="text-2xl font-bold text-white/90 tabular-nums">
                  {(constructionData.unitsExpected24m / 1000).toFixed(1)}K
                </p>
                <p className="text-[8px] text-white/40 mt-1">units</p>
              </div>
            </div>

            {/* Cost Index */}
            <div className="mb-5 p-3 bg-white/[0.02] border border-white/[0.04] rounded">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs text-white/70">Construction Cost Index</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-white/90 tabular-nums">
                    {constructionData.constructionCostIndex}
                  </span>
                  <TrendArrow trend={constructionData.constructionCostChange > 0 ? 'up' : constructionData.constructionCostChange < 0 ? 'down' : 'stable'} />
                  <span className="text-xs text-white/70">
                    {constructionData.constructionCostChange > 0 ? '+' : ''}{constructionData.constructionCostChange.toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-[8px] text-white/40">YoY change</p>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-xs text-white/70 mb-2">Monthly Deliveries (12m)</p>
                <BarChart data={constructionData.monthlyDeliveries} barColor="#d4a574" />
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-xs text-white/70 mb-2">Monthly Permits (12m)</p>
                <BarChart data={constructionData.monthlyPermits} barColor="#60a5fa" />
              </div>
            </div>

            {/* Segment Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left text-white/70 font-medium px-3 py-2">Segment</th>
                    <th className="text-right text-white/70 font-medium px-3 py-2">Under Construction</th>
                    <th className="text-right text-white/70 font-medium px-3 py-2">% of Total</th>
                    <th className="text-right text-white/70 font-medium px-3 py-2">Delivered (12m)</th>
                  </tr>
                </thead>
                <tbody>
                  {constructionData.bySegment.map((seg) => {
                    const pct = ((seg.units / totalUnitsUnderConstruction) * 100).toFixed(1);
                    return (
                      <tr key={seg.segment} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="text-white/90 px-3 py-2">{seg.segment}</td>
                        <td className="text-right text-white/70 px-3 py-2 tabular-nums">
                          {seg.units.toLocaleString()}
                        </td>
                        <td className="text-right text-[#d4a574] px-3 py-2 tabular-nums">{seg.pctOfTotal.toFixed(1)}%</td>
                        <td className="text-right text-emerald-400 px-3 py-2 tabular-nums">
                          {seg.units.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Mortgage Market Section */}
          <section className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
            <h3
              className="text-lg font-semibold text-white/90 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Mortgage Market
            </h3>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Total Value
                </p>
                <p className="text-xl font-bold text-[#d4a574] tabular-nums">
                  AED {(totalMortgageValue / 1e9).toFixed(1)}B
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendArrow trend={mortgageGrowth > 0 ? 'up' : 'down'} />
                  <span className={`text-xs font-medium ${mortgageGrowth > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {mortgageGrowth > 0 ? '+' : ''}{mortgageGrowth.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Avg Rate
                </p>
                <p className="text-xl font-bold text-white/90 tabular-nums">
                  {avgRate.toFixed(2)}%
                </p>
                <p className="text-[8px] text-white/40 mt-1">per annum</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Avg LTV
                </p>
                <p className="text-xl font-bold text-white/90 tabular-nums">
                  {avgLTV.toFixed(1)}%
                </p>
                <p className="text-[8px] text-white/40 mt-1">loan-to-value</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Approval Rate
                </p>
                <p className="text-xl font-bold text-emerald-400 tabular-nums">
                  {approvalRate.toFixed(1)}%
                </p>
                <p className="text-[8px] text-white/40 mt-1">of applications</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Processing Days
                </p>
                <p className="text-xl font-bold text-white/90 tabular-nums">
                  {processingDays}
                </p>
                <p className="text-[8px] text-white/40 mt-1">avg approval</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1">
                  Lenders
                </p>
                <p className="text-xl font-bold text-white/90 tabular-nums">
                  {mortgageMarket.topLenders.length}+
                </p>
                <p className="text-[8px] text-white/40 mt-1">active banks</p>
              </div>
            </div>

            {/* Rate Trend Sparkline */}
            <div className="mb-5 p-3 bg-white/[0.02] border border-white/[0.04] rounded">
              <p className="text-xs text-white/70 mb-2">12-Month Rate Trend</p>
              <div className="h-8 text-[#d4a574]/60">
                <Sparkline data={mortgageMarket.rateHistory} />
              </div>
            </div>

            {/* Top Lenders Table */}
            <div className="mb-5 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left text-white/70 font-medium px-3 py-2">Bank</th>
                    <th className="text-right text-white/70 font-medium px-3 py-2">Market Share</th>
                    <th className="text-right text-white/70 font-medium px-3 py-2">Avg Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {mortgageMarket.topLenders.map((lender) => (
                    <tr key={lender.bank} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="text-white/90 px-3 py-2">{lender.bank}</td>
                      <td className="text-right text-[#d4a574] px-3 py-2 tabular-nums">
                        {lender.marketShare.toFixed(1)}%
                      </td>
                      <td className="text-right text-white/70 px-3 py-2 tabular-nums">
                        {lender.avgRate.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Volume & Rate Trend Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-xs text-white/70 mb-2">Monthly Volume (12m)</p>
                <BarChart data={mortgageMarket.monthlyMortgageVolume} barColor="#10b981" />
              </div>
              <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
                <p className="text-xs text-white/70 mb-2">Rate Volatility</p>
                <BarChart data={mortgageMarket.rateHistory.map(r => r * 100)} barColor="#d4a574" />
              </div>
            </div>
          </section>

          {/* Impact Assessment Summary */}
          <section className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
            <h3
              className="text-lg font-semibold text-white/90 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Impact Summary for Real Estate
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Positive Factors */}
              <div>
                <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                  <span>●</span> Positive Factors ({positiveIndicators.length})
                </h4>
                <div className="space-y-2">
                  {positiveIndicators.slice(0, 5).map((ind) => (
                    <div
                      key={ind.id}
                      className="bg-emerald-400/5 border border-emerald-400/10 rounded p-2 text-xs text-white/80"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{ind.name}</span>
                        <span className="text-emerald-400 font-semibold">+{ind.changePercent.toFixed(1)}%</span>
                      </div>
                      <p className="text-white/60 mt-1">{ind.impactOnRealEstate}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Negative Factors */}
              <div>
                <h4 className="text-sm font-medium text-rose-400 mb-3 flex items-center gap-2">
                  <span>●</span> Risk Factors ({negativeIndicators.length})
                </h4>
                <div className="space-y-2">
                  {negativeIndicators.slice(0, 5).map((ind) => (
                    <div
                      key={ind.id}
                      className="bg-rose-400/5 border border-rose-400/10 rounded p-2 text-xs text-white/80"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium">{ind.name}</span>
                        <span className="text-rose-400 font-semibold">{ind.changePercent.toFixed(1)}%</span>
                      </div>
                      <p className="text-white/60 mt-1">{ind.impactOnRealEstate}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overall Assessment */}
            <div className="mt-4 p-3 bg-white/[0.02] border border-white/[0.04] rounded">
              <p className="text-xs text-white/70 leading-relaxed">
                {positiveIndicators.length > negativeIndicators.length
                  ? '✓ Overall Dubai real estate market shows strong fundamentals. Multiple positive economic indicators support sustained demand and investment activity.'
                  : positiveIndicators.length === negativeIndicators.length
                  ? '• Market shows mixed signals. Monitor key indicators closely for shifting momentum.'
                  : '⚠ Market faces headwinds from multiple economic factors. Consider defensive positioning and selective opportunities.'}
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
