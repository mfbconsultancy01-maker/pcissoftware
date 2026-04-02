'use client';

import { useMemo } from 'react';
import { tourismData, type SourceMarket, type EventPeak } from '@/lib/macroData';

// ============================================================================
// SVG CHART COMPONENTS
// ============================================================================

// Sparkline Component
function Sparkline({ data, color = '#d4a574' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 60;
  const height = 24;
  const padding = 2;

  const points = data
    .map((value: number, i: number) => {
      const x = padding + (i / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// Area Chart for Monthly Visitors
function VisitorAreaChart({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 80;
  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data
    .map((value: number, i: number) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = height - padding - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-2">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Grid lines */}
        {[0, 1, 2].map((i: number) => {
          const y = height - padding - (i / 2) * chartHeight;
          return (
            <line key={`grid-${i}`} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          );
        })}
        {/* Area */}
        <polygon points={areaPoints} fill="rgba(212, 165, 116, 0.1)" stroke="none" />
        {/* Line */}
        <polyline points={points} fill="none" stroke="#d4a574" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="grid grid-cols-12 gap-1 px-1 text-[8px] text-white/40 uppercase tracking-wider">
        {months.map((m: string) => (
          <div key={m} className="text-center">{m}</div>
        ))}
      </div>
    </div>
  );
}

// Line Chart for Monthly Occupancy
function OccupancyLineChart({ data }: { data: number[] }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 80;
  const padding = 8;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = data
    .map((value: number, i: number) => {
      const x = padding + (i / (data.length - 1)) * chartWidth;
      const y = height - padding - ((value - min) / range) * chartHeight;
      return `${x},${y}`;
    })
    .join(' ');

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="space-y-2">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Grid lines */}
        {[0, 1, 2].map((i: number) => {
          const y = height - padding - (i / 2) * chartHeight;
          return (
            <line key={`grid-${i}`} x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          );
        })}
        {/* Line */}
        <polyline points={points} fill="none" stroke="#d4a574" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {/* Dots */}
        {data.map((value: number, i: number) => {
          const x = padding + (i / (data.length - 1)) * chartWidth;
          const y = height - padding - ((value - min) / range) * chartHeight;
          return <circle key={`dot-${i}`} cx={x} cy={y} r="1.5" fill="#d4a574" />;
        })}
      </svg>
      <div className="grid grid-cols-12 gap-1 px-1 text-[8px] text-white/40 uppercase tracking-wider">
        {months.map((m: string) => (
          <div key={m} className="text-center">{m}</div>
        ))}
      </div>
    </div>
  );
}

// Horizontal Stacked Bar for Tourism Segments
function TourismSegmentsBar({ business, leisure, medical }: { business: number; leisure: number; medical: number }) {
  const total = business + leisure + medical;

  return (
    <div className="flex gap-0 h-6 rounded overflow-hidden">
      <div
        className="bg-blue-500/70 hover:bg-blue-500/90 transition-colors flex items-center justify-center text-[9px] font-medium text-white"
        style={{ width: `${(business / total) * 100}%` }}
        title={`Business: ${business}%`}
      >
        {business > 15 && `${business}%`}
      </div>
      <div
        className="bg-emerald-500/70 hover:bg-emerald-500/90 transition-colors flex items-center justify-center text-[9px] font-medium text-white"
        style={{ width: `${(leisure / total) * 100}%` }}
        title={`Leisure: ${leisure}%`}
      >
        {leisure > 15 && `${leisure}%`}
      </div>
      <div
        className="bg-amber-500/70 hover:bg-amber-500/90 transition-colors flex items-center justify-center text-[9px] font-medium text-white"
        style={{ width: `${(medical / total) * 100}%` }}
        title={`Medical: ${medical}%`}
      >
        {medical > 15 && `${medical}%`}
      </div>
    </div>
  );
}

// ============================================================================
// TREND ARROW
// ============================================================================

function TrendArrow({ value, isPositive = true }: { value: number; isPositive?: boolean }) {
  const color = isPositive ? (value > 0 ? 'text-emerald-400' : 'text-rose-400') : value > 0 ? 'text-rose-400' : 'text-emerald-400';

  if (value > 0) {
    return <span className={`${color}`}>▲</span>;
  } else if (value < 0) {
    return <span className={`${color}`}>▼</span>;
  }
  return <span className="text-white/40">—</span>;
}

// ============================================================================
// METRIC CARD COMPONENT
// ============================================================================

function MetricCard({ label, value, unit = '', subtitle = '', trend = null }: { label: string; value: string | number; unit?: string; subtitle?: string; trend?: number | null }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3 flex flex-col justify-between h-full hover:bg-white/[0.04] transition-colors">
      <div>
        <div className="text-[8px] text-white/40 uppercase tracking-wider mb-2">{label}</div>
        <div className="text-xl font-semibold text-white/90">
          {value}
          {unit && <span className="text-sm text-white/70">{unit}</span>}
        </div>
      </div>
      {subtitle && <div className="text-[11px] text-white/70 mt-2">{subtitle}</div>}
      {trend !== null && (
        <div className="flex items-center gap-1 mt-2 text-[11px]">
          <TrendArrow value={trend} />
          <span className={trend > 0 ? 'text-emerald-400' : 'text-rose-400'}>{Math.abs(trend)}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TourismDemandView() {
  const sortedMarkets = useMemo(() => {
    return [...tourismData.topSourceMarkets].sort((a: SourceMarket, b: SourceMarket) => b.visitors - a.visitors);
  }, []);

  const eventsByImpact = useMemo(() => {
    return [...tourismData.eventDrivenPeaks].sort((a: EventPeak, b: EventPeak) => b.visitorBoost - a.visitorBoost);
  }, []);

  // Investment funnel: assume 1% of visitors become inquiries, 25% of inquiries convert to transactions
  const visitorInquiries = Math.round(tourismData.totalVisitors12m * 0.01);
  const propertyTransactions = Math.round(visitorInquiries * 0.25);

  return (
    <div className="h-full flex flex-col bg-white/[0.01] rounded-sm overflow-hidden">
      {/* ========== HEADER ========== */}
      <div className="border-b border-white/[0.04] px-4 py-3 bg-white/[0.02]">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tourism & Demand Drivers
            </h1>
            <p className="text-[12px] text-white/60 mt-1">Visitor Flows, Events & External Market Drivers</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-[#d4a574]">{(tourismData.totalVisitors12m / 1000000).toFixed(1)}M</div>
            <div className="text-[11px] text-white/70">Total Visitors 12m</div>
            <div className="flex items-center gap-1 mt-1 justify-end">
              <TrendArrow value={tourismData.visitorGrowthYoY} />
              <span className="text-[11px] text-emerald-400">{tourismData.visitorGrowthYoY.toFixed(1)}% YoY</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SCROLLABLE CONTENT ========== */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4 space-y-4">
          {/* ========== KEY METRICS STRIP ========== */}
          <div className="grid grid-cols-6 gap-2">
            <MetricCard
              label="Total Visitors 12m"
              value={(tourismData.totalVisitors12m / 1000000).toFixed(1)}
              unit="M"
              trend={tourismData.visitorGrowthYoY}
            />
            <MetricCard label="Growth YoY" value={tourismData.visitorGrowthYoY.toFixed(1)} unit="%" />
            <MetricCard label="Avg Stay" value={tourismData.avgLengthOfStay} unit=" nights" />
            <MetricCard label="Hotel Occupancy" value={tourismData.hotelOccupancy} unit="%" />
            <MetricCard label="ADR" value={`AED ${tourismData.avgDailyRate.toLocaleString()}`} />
            <MetricCard label="RevPAR" value={`AED ${tourismData.revPAR.toLocaleString()}`} />
          </div>

          {/* ========== MONTHLY VISITORS CHART ========== */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-3 font-semibold">Monthly Visitor Trend (12m)</div>
            <VisitorAreaChart data={tourismData.monthlyVisitors} />
            <div className="mt-3 text-[11px] text-white/70">
              <span className="text-white/90 font-semibold">{(tourismData.monthlyVisitors.reduce((a: number, b: number) => a + b, 0) / 1000000).toFixed(1)}M</span> total visitors across 12 months
            </div>
          </div>

          {/* ========== MONTHLY OCCUPANCY CHART ========== */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-3 font-semibold">Hotel Occupancy Rate (12m)</div>
            <OccupancyLineChart data={tourismData.monthlyOccupancy} />
            <div className="mt-3 text-[11px] text-white/70">
              <span className="text-white/90 font-semibold">{(tourismData.monthlyOccupancy.reduce((a: number, b: number) => a + b, 0) / tourismData.monthlyOccupancy.length).toFixed(0)}%</span> annual
              average occupancy
            </div>
          </div>

          {/* ========== SOURCE MARKETS TABLE ========== */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm overflow-hidden">
            <div className="px-3 py-3 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Top Source Markets</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Rank</th>
                    <th className="text-left px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Country</th>
                    <th className="text-right px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Visitors</th>
                    <th className="text-right px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Growth</th>
                    <th className="text-right px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Avg Spend</th>
                    <th className="text-right px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Investor Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMarkets.map((market: SourceMarket, idx: number) => {
                    const isTop3 = idx < 3;
                    return (
                      <tr key={market.country} className={`border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors ${isTop3 ? 'bg-white/[0.05]' : ''}`}>
                        <td className={`px-3 py-2 text-white/90 ${isTop3 ? 'text-[#d4a574] font-semibold' : ''}`}>{idx + 1}</td>
                        <td className={`px-3 py-2 text-white/90 ${isTop3 ? 'text-[#d4a574] font-semibold' : ''}`}>{market.country}</td>
                        <td className="px-3 py-2 text-right text-white/90">{(market.visitors / 1000000).toFixed(2)}M</td>
                        <td className="px-3 py-2 text-right flex items-center justify-end gap-1">
                          <TrendArrow value={market.growthYoY} />
                          <span className={market.growthYoY > 0 ? 'text-emerald-400' : 'text-white/70'}>{market.growthYoY.toFixed(1)}%</span>
                        </td>
                        <td className="px-3 py-2 text-right text-white/90">AED {market.avgSpendPerVisit.toLocaleString()}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${market.propertyInvestorConversion > 20 ? 'text-emerald-400' : 'text-white/70'}`}>
                          {market.propertyInvestorConversion}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========== TOURISM SEGMENTS ========== */}
          <div>
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-3 font-semibold">Tourism Segments</div>
            <div className="grid grid-cols-3 gap-3">
              {/* Business Tourism */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                <div className="text-[10px] text-white/60 uppercase tracking-wider mb-2">Business Tourism</div>
                <div className="text-2xl font-semibold text-blue-400">{tourismData.businessTourismPct}%</div>
                <div className="text-[11px] text-white/70 mt-2">Conferences, meetings, corporate travel</div>
              </div>

              {/* Leisure Tourism */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                <div className="text-[10px] text-white/60 uppercase tracking-wider mb-2">Leisure Tourism</div>
                <div className="text-2xl font-semibold text-emerald-400">{tourismData.leisureTourismPct}%</div>
                <div className="text-[11px] text-white/70 mt-2">Holidays, family visits, recreational</div>
              </div>

              {/* Medical Tourism */}
              <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
                <div className="text-[10px] text-white/60 uppercase tracking-wider mb-2">Medical Tourism</div>
                <div className="text-2xl font-semibold text-amber-400">{tourismData.medicalTourismPct}%</div>
                <div className="text-[11px] text-white/70 mt-2">Healthcare, treatments, wellness</div>
              </div>
            </div>
            <div className="mt-3">
              <TourismSegmentsBar business={tourismData.businessTourismPct} leisure={tourismData.leisureTourismPct} medical={tourismData.medicalTourismPct} />
            </div>
          </div>

          {/* ========== EVENT CALENDAR / IMPACT ANALYSIS ========== */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm overflow-hidden">
            <div className="px-3 py-3 border-b border-white/[0.04] bg-white/[0.01]">
              <div className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">Event Calendar & Market Impact</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    <th className="text-left px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Event</th>
                    <th className="text-left px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Month</th>
                    <th className="text-right px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Visitor Boost</th>
                    <th className="text-right px-3 py-2 text-white/60 font-normal uppercase text-[8px] tracking-wider">Rental Premium</th>
                  </tr>
                </thead>
                <tbody>
                  {eventsByImpact.map((event: EventPeak) => {
                    const boostColor = event.visitorBoost > 20 ? 'text-emerald-400' : event.visitorBoost > 0 ? 'text-white/70' : 'text-rose-400';
                    const rentalColor = event.impactOnRentals > 15 ? 'text-emerald-400' : event.impactOnRentals > 0 ? 'text-white/70' : 'text-rose-400';

                    return (
                      <tr key={event.event} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <td className="px-3 py-2 text-white/90 font-medium">{event.event}</td>
                        <td className="px-3 py-2 text-white/70">{event.month}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${boostColor}`}>{event.visitorBoost > 0 ? '+' : ''}{event.visitorBoost}%</td>
                        <td className={`px-3 py-2 text-right font-semibold ${rentalColor}`}>{event.impactOnRentals > 0 ? '+' : ''}{event.impactOnRentals}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ========== INFRASTRUCTURE STATS ========== */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
              <div className="text-[10px] text-white/70 uppercase tracking-wider mb-2 font-semibold">Airport Passengers 12m</div>
              <div className="text-2xl font-semibold text-white/90">{(tourismData.airportPassengers12m / 1000000).toFixed(1)}M</div>
              <div className="text-[11px] text-white/70 mt-2">Primary gateway for visitors</div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
              <div className="text-[10px] text-white/70 uppercase tracking-wider mb-2 font-semibold">Cruise Passengers 12m</div>
              <div className="text-2xl font-semibold text-white/90">{(tourismData.cruisePassengers12m / 1000000).toFixed(1)}M</div>
              <div className="text-[11px] text-white/70 mt-2">Growing short-stay segment</div>
            </div>

            <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
              <div className="text-[10px] text-white/70 uppercase tracking-wider mb-2 font-semibold">STR Growth YoY</div>
              <div className="text-2xl font-semibold text-emerald-400">{tourismData.shortTermRentalGrowth.toFixed(1)}%</div>
              <div className="text-[11px] text-white/70 mt-2">Short-term rental expansion</div>
            </div>
          </div>

          {/* ========== INVESTMENT CORRELATION ========== */}
          <div className="bg-white/[0.02] border border-white/[0.04] rounded-sm p-3">
            <div className="text-[10px] text-white/70 uppercase tracking-wider mb-3 font-semibold">Tourism → Property Investment Pipeline</div>
            <p className="text-[12px] text-white/70 mb-4">
              Visitor numbers directly correlate with property inquiry volumes. High tourism seasons drive increased investor interest and transaction acceleration.
            </p>

            <div className="grid grid-cols-3 gap-3">
              {/* Visitors to Inquiries */}
              <div className="bg-white/[0.05] border border-white/[0.08] rounded-sm p-3 text-center">
                <div className="text-[9px] text-white/60 uppercase tracking-wider mb-1">Annual Visitors</div>
                <div className="text-xl font-semibold text-white/90">{(tourismData.totalVisitors12m / 1000000).toFixed(1)}M</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="text-[#d4a574] text-2xl">→</div>
              </div>

              {/* Inquiries */}
              <div className="bg-white/[0.05] border border-white/[0.08] rounded-sm p-3 text-center">
                <div className="text-[9px] text-white/60 uppercase tracking-wider mb-1">Property Inquiries (1%)</div>
                <div className="text-xl font-semibold text-[#d4a574]">{(visitorInquiries / 1000).toFixed(0)}K</div>
              </div>
            </div>

            <div className="mt-3 flex justify-center">
              <div className="text-[#d4a574] text-2xl">↓</div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3">
              {/* Inquiries */}
              <div className="bg-white/[0.05] border border-white/[0.08] rounded-sm p-3 text-center">
                <div className="text-[9px] text-white/60 uppercase tracking-wider mb-1">Property Inquiries</div>
                <div className="text-lg font-semibold text-[#d4a574]">{(visitorInquiries / 1000).toFixed(0)}K</div>
              </div>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <div className="text-[#d4a574] text-2xl">→</div>
              </div>

              {/* Transactions */}
              <div className="bg-white/[0.05] border border-white/[0.08] rounded-sm p-3 text-center">
                <div className="text-[9px] text-white/60 uppercase tracking-wider mb-1">Property Transactions (25%)</div>
                <div className="text-lg font-semibold text-emerald-400">{(propertyTransactions / 1000).toFixed(0)}K</div>
              </div>
            </div>
          </div>

          {/* Bottom spacer */}
          <div className="h-2"></div>
        </div>
      </div>
    </div>
  );
}
