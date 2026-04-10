'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { getAreaMetricsCached } from '@/lib/scoutDataCache';
import { useWorkspaceNav } from '../useWorkspaceNav';

interface AreaMetric {
  areaName: string;
  displayName?: string;
  shortName?: string;
  avgPricePerSqft: number;
  medianPrice?: number;
  avgPrice?: number;
  priceChange7d: number;
  priceChange30d: number;
  demandScore: number;
  propertyCount: number;
  inventoryCount?: number;
  estimatedYield?: number;
  outlook?: string;
  topPropertyTypes?: Array<{ type: string; count: number }>;
}

const OUTLOOK_COLORS: Record<string, string> = {
  bullish: '#10b981',
  neutral: '#6b7280',
  bearish: '#ef4444',
  positive: '#10b981',
  negative: '#ef4444',
};

function getOutlookColor(outlook?: string): string {
  if (!outlook) return '#8b5cf6';
  const lower = outlook.toLowerCase();
  return OUTLOOK_COLORS[lower] || '#8b5cf6';
}

function BarChart({
  data,
  label,
  maxValue,
  height = 200,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  label: string;
  maxValue: number;
  height?: number;
}) {
  const padding = { top: 20, right: 20, bottom: 50, left: 100 };
  const chartWidth = 600;
  const chartHeight = height - padding.top - padding.bottom;
  const barHeight = chartHeight / data.length;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${height}`}
      width="100%"
      height={height}
      className="border border-pcis-border/10 rounded bg-white/[0.02]"
    >
      {/* Title */}
      <text
        x={padding.left}
        y={15}
        className="text-[10px] font-semibold"
        fill="rgba(212, 165, 116, 0.8)"
      >
        {label}
      </text>

      {/* Bars */}
      {data.map((item, idx) => {
        const y = padding.top + idx * barHeight + barHeight / 2;
        const barWidth = (item.value / maxValue) * (chartWidth - padding.left - padding.right);
        const x = padding.left + barWidth;

        return (
          <g key={item.name}>
            {/* Bar background */}
            <rect
              x={padding.left}
              y={padding.top + idx * barHeight + 2}
              width={chartWidth - padding.left - padding.right}
              height={barHeight - 4}
              fill="rgba(255, 255, 255, 0.02)"
            />
            {/* Bar */}
            <rect
              x={padding.left}
              y={padding.top + idx * barHeight + 2}
              width={barWidth}
              height={barHeight - 4}
              fill={item.color}
              opacity="0.7"
            />
            {/* Value label */}
            <text
              x={x + 8}
              y={y + 3}
              className="text-[8px] font-mono"
              fill="rgba(255, 255, 255, 0.6)"
            >
              ${Math.round(item.value)}
            </text>
            {/* Name label */}
            <text
              x={padding.left - 8}
              y={y + 3}
              textAnchor="end"
              className="text-[9px]"
              fill="rgba(212, 165, 116, 0.9)"
            >
              {item.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function HeatmapGrid({
  areas,
  height = 180,
}: {
  areas: AreaMetric[];
  height?: number;
}) {
  const cellWidth = 60;
  const cellHeight = 40;
  const padding = { left: 120, top: 30 };
  const width = padding.left + areas.length * cellWidth + 20;

  const getColor = (change: number): string => {
    if (change > 5) return '#10b981';
    if (change > 2) return '#34d399';
    if (change > 0) return '#a3e635';
    if (change > -2) return '#f59e0b';
    if (change > -5) return '#f97316';
    return '#ef4444';
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="border border-pcis-border/10 rounded bg-white/[0.02]"
    >
      {/* Headers - Area names */}
      {areas.map((area, idx) => (
        <text
          key={`header-${idx}`}
          x={padding.left + idx * cellWidth + cellWidth / 2}
          y={padding.top - 10}
          textAnchor="middle"
          className="text-[8px] uppercase tracking-wider font-semibold"
          fill="rgba(212, 165, 116, 0.7)"
        >
          {area.areaName.substring(0, 8)}
        </text>
      ))}

      {/* Row 1: 7d Change */}
      <text
        x={padding.left - 10}
        y={padding.top + cellHeight / 2 + 3}
        textAnchor="end"
        className="text-[9px] font-semibold"
        fill="rgba(255, 255, 255, 0.5)"
      >
        7d Change
      </text>
      {areas.map((area, idx) => {
        const color = getColor(area.priceChange7d);
        const x = padding.left + idx * cellWidth;
        const y = padding.top;
        return (
          <g key={`7d-${idx}`}>
            <rect
              x={x + 2}
              y={y + 2}
              width={cellWidth - 4}
              height={cellHeight - 4}
              fill={color}
              opacity="0.6"
              rx="2"
            />
            <text
              x={x + cellWidth / 2}
              y={y + cellHeight / 2 + 3}
              textAnchor="middle"
              className="text-[8px] font-mono font-semibold"
              fill="rgba(0, 0, 0, 0.9)"
            >
              {area.priceChange7d.toFixed(1)}%
            </text>
          </g>
        );
      })}

      {/* Row 2: 30d Change */}
      <text
        x={padding.left - 10}
        y={padding.top + cellHeight + cellHeight / 2 + 3}
        textAnchor="end"
        className="text-[9px] font-semibold"
        fill="rgba(255, 255, 255, 0.5)"
      >
        30d Change
      </text>
      {areas.map((area, idx) => {
        const color = getColor(area.priceChange30d);
        const x = padding.left + idx * cellWidth;
        const y = padding.top + cellHeight;
        return (
          <g key={`30d-${idx}`}>
            <rect
              x={x + 2}
              y={y + 2}
              width={cellWidth - 4}
              height={cellHeight - 4}
              fill={color}
              opacity="0.6"
              rx="2"
            />
            <text
              x={x + cellWidth / 2}
              y={y + cellHeight / 2 + 3}
              textAnchor="middle"
              className="text-[8px] font-mono font-semibold"
              fill="rgba(0, 0, 0, 0.9)"
            >
              {area.priceChange30d.toFixed(1)}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function ScatterChart({
  areas,
  height = 220,
}: {
  areas: AreaMetric[];
  height?: number;
}) {
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const chartWidth = 500;
  const chartHeight = height - padding.top - padding.bottom;

  const psfValues = areas.map((a) => a.avgPricePerSqft);
  const yieldValues = areas.map((a) => a.estimatedYield || 0);

  const minPsf = Math.min(...psfValues);
  const maxPsf = Math.max(...psfValues);
  const minYield = Math.min(...yieldValues);
  const maxYield = Math.max(...yieldValues) || 5;

  const psfRange = maxPsf - minPsf || 1;
  const yieldRange = maxYield - minYield || 1;

  const xScale = (value: number) =>
    padding.left + ((value - minPsf) / psfRange) * (chartWidth - padding.left - padding.right);

  const yScale = (value: number) =>
    height - padding.bottom - ((value - minYield) / yieldRange) * chartHeight;

  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${height}`}
      width="100%"
      height={height}
      className="border border-pcis-border/10 rounded bg-white/[0.02]"
    >
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
        const x = padding.left + t * (chartWidth - padding.left - padding.right);
        const y = height - padding.bottom - t * chartHeight;
        return (
          <g key={`grid-${i}`} opacity="0.1">
            <line x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} stroke="white" strokeWidth="0.5" strokeDasharray="2,2" />
            <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="white" strokeWidth="0.5" strokeDasharray="2,2" />
          </g>
        );
      })}

      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={height - padding.bottom} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />
      <line x1={padding.left} y1={height - padding.bottom} x2={chartWidth - padding.right} y2={height - padding.bottom} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" />

      {/* Axis labels */}
      <text x={padding.left - 10} y={padding.top - 5} className="text-[8px]" textAnchor="end" fill="rgba(255, 255, 255, 0.5)">
        Yield %
      </text>
      <text x={chartWidth - 10} y={height - 5} className="text-[8px]" textAnchor="end" fill="rgba(255, 255, 255, 0.5)">
        Avg PSF
      </text>

      {/* Points */}
      {areas.map((area, idx) => {
        const x = xScale(area.avgPricePerSqft);
        const y = yScale(area.estimatedYield || 0);
        const color = getOutlookColor(area.outlook);
        return (
          <g key={area.areaName}>
            <circle cx={x} cy={y} r="4" fill={color} opacity="0.7" />
            <circle cx={x} cy={y} r="4" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />
            <text x={x} y={y - 8} textAnchor="middle" className="text-[7px] font-semibold" fill="rgba(212, 165, 116, 0.8)">
              {area.areaName.substring(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function PriceTrendsView() {
  const nav = useWorkspaceNav();
  const [areas, setAreas] = useState<AreaMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAreaMetricsCached();
        if (Array.isArray(data) && data.length > 0) {
          setAreas(data);
        }
      } catch (err) {
        console.error('Failed to fetch area metrics:', err);
        setError('Failed to load area data');
        setAreas([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = useMemo(() => {
    if (areas.length === 0) return { highest: null, bestYield: null, mostTransactions: null, biggest: null };

    const highest = areas.reduce((a, b) => (a.avgPricePerSqft > b.avgPricePerSqft ? a : b));
    const bestYield = areas.reduce((a, b) => {
      const aYield = a.estimatedYield || 0;
      const bYield = b.estimatedYield || 0;
      return aYield > bYield ? a : b;
    });
    const mostTransactions = areas.reduce((a, b) => (a.propertyCount > b.propertyCount ? a : b));
    const biggest = areas.reduce((a, b) => {
      const aDelta = Math.abs(a.priceChange30d);
      const bDelta = Math.abs(b.priceChange30d);
      return aDelta > bDelta ? a : b;
    });

    return { highest, bestYield, mostTransactions, biggest };
  }, [areas]);

  const psfChartData = useMemo(() => {
    return areas
      .sort((a, b) => b.avgPricePerSqft - a.avgPricePerSqft)
      .slice(0, 8)
      .map((a) => ({
        name: a.areaName,
        value: a.avgPricePerSqft,
        color: getOutlookColor(a.outlook),
      }));
  }, [areas]);

  const maxPsf = psfChartData.length > 0 ? Math.max(...psfChartData.map((d) => d.value)) : 1000;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-pcis-bg">
        <p className="text-pcis-text-muted text-[11px]">Loading price trends...</p>
      </div>
    );
  }

  if (error || areas.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-pcis-bg">
        <p className="text-pcis-text-muted text-[11px]">{error || 'No area data available'}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-5 p-4 bg-pcis-bg overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>
          Price Trends
        </h2>
        <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider">
          Real-time market dynamics across {areas.length} areas
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {stats.highest && (
          <div
            className="px-3 py-2 rounded border border-pcis-border/10 bg-white/[0.02]"
            onClick={() => nav.openArea(stats.highest.areaName)}
            style={{ cursor: 'pointer' }}
          >
            <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">Highest PSF</p>
            <p className="text-pcis-gold text-[14px] font-semibold font-mono tabular-nums">${Math.round(stats.highest.avgPricePerSqft)}</p>
            <p className="text-[9px] text-pcis-text-muted">{stats.highest.areaName}</p>
          </div>
        )}
        {stats.bestYield && (
          <div
            className="px-3 py-2 rounded border border-pcis-border/10 bg-white/[0.02]"
            onClick={() => nav.openArea(stats.bestYield.areaName)}
            style={{ cursor: 'pointer' }}
          >
            <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">Best Yield</p>
            <p className="text-pcis-gold text-[14px] font-semibold font-mono tabular-nums">{(stats.bestYield.estimatedYield || 0).toFixed(2)}%</p>
            <p className="text-[9px] text-pcis-text-muted">{stats.bestYield.areaName}</p>
          </div>
        )}
        {stats.mostTransactions && (
          <div
            className="px-3 py-2 rounded border border-pcis-border/10 bg-white/[0.02]"
            onClick={() => nav.openArea(stats.mostTransactions.areaName)}
            style={{ cursor: 'pointer' }}
          >
            <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">Most Transactions</p>
            <p className="text-pcis-gold text-[14px] font-semibold font-mono tabular-nums">{stats.mostTransactions.propertyCount}</p>
            <p className="text-[9px] text-pcis-text-muted">{stats.mostTransactions.areaName}</p>
          </div>
        )}
        {stats.biggest && (
          <div
            className="px-3 py-2 rounded border border-pcis-border/10 bg-white/[0.02]"
            onClick={() => nav.openArea(stats.biggest.areaName)}
            style={{ cursor: 'pointer' }}
          >
            <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">Biggest Mover (30d)</p>
            <p
              className="text-[14px] font-semibold font-mono tabular-nums"
              style={{ color: stats.biggest.priceChange30d >= 0 ? '#10b981' : '#ef4444' }}
            >
              {stats.biggest.priceChange30d >= 0 ? '+' : ''}{stats.biggest.priceChange30d.toFixed(2)}%
            </p>
            <p className="text-[9px] text-pcis-text-muted">{stats.biggest.areaName}</p>
          </div>
        )}
      </div>

      {/* PSF Comparison Bar Chart */}
      <div className="bg-white/[0.02] border border-pcis-border/10 rounded p-4">
        <h3 className="text-[12px] font-semibold text-pcis-text mb-3 uppercase tracking-wider">Price Per Sqft Rankings</h3>
        <BarChart data={psfChartData} label="Average Price Per Square Foot" maxValue={maxPsf} height={240} />
      </div>

      {/* Price Change Heatmap */}
      <div className="bg-white/[0.02] border border-pcis-border/10 rounded p-4">
        <h3 className="text-[12px] font-semibold text-pcis-text mb-3 uppercase tracking-wider">Price Change Heatmap (% Change)</h3>
        <HeatmapGrid areas={areas} height={180} />
      </div>

      {/* Yield vs PSF Scatter */}
      {areas.some((a) => a.estimatedYield) && (
        <div className="bg-white/[0.02] border border-pcis-border/10 rounded p-4">
          <h3 className="text-[12px] font-semibold text-pcis-text mb-3 uppercase tracking-wider">Yield vs Price/Sqft</h3>
          <ScatterChart areas={areas} height={220} />
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white/[0.02] border border-pcis-border/10 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[9px]">
            <thead>
              <tr className="border-b border-pcis-border/10 bg-white/[0.01]">
                <th className="px-3 py-2 text-left text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">Area</th>
                <th className="px-3 py-2 text-right text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">Avg PSF</th>
                <th className="px-3 py-2 text-right text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">7d Change</th>
                <th className="px-3 py-2 text-right text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">30d Change</th>
                <th className="px-3 py-2 text-right text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">Yield</th>
                <th className="px-3 py-2 text-right text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">Properties</th>
                <th className="px-3 py-2 text-right text-pcis-text-muted font-semibold uppercase tracking-wider text-[8px]">Outlook</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.areaName} className="border-b border-pcis-border/10 hover:bg-white/[0.04] transition-colors">
                  <td className="px-3 py-2">
                    <button
                      onClick={() => nav.openArea(area.areaName)}
                      className="text-pcis-gold hover:text-pcis-gold/80 transition-colors font-semibold"
                    >
                      {area.areaName}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-pcis-text tabular-nums">${Math.round(area.avgPricePerSqft)}</td>
                  <td className={`px-3 py-2 text-right font-mono tabular-nums ${area.priceChange7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {area.priceChange7d >= 0 ? '+' : ''}{area.priceChange7d.toFixed(2)}%
                  </td>
                  <td className={`px-3 py-2 text-right font-mono tabular-nums ${area.priceChange30d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {area.priceChange30d >= 0 ? '+' : ''}{area.priceChange30d.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-pcis-text tabular-nums">{(area.estimatedYield || 0).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right font-mono text-pcis-text tabular-nums">{area.propertyCount}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="px-2 py-1 rounded text-[8px] font-semibold" style={{ backgroundColor: getOutlookColor(area.outlook) + '20', color: getOutlookColor(area.outlook) }}>
                      {area.outlook || 'N/A'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
