'use client';

import React, { useMemo, useState } from 'react';
import { priceTrendSeries, type PriceTrendSeries } from '@/lib/priceData';
import { useWorkspaceNav } from '../useWorkspaceNav';

// Dynamically determine month labels based on actual data length
const ALL_MONTHS = [
  'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
  'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar',
];

function getMonthLabels(dataLength: number): string[] {
  if (dataLength >= 12) return ALL_MONTHS;
  // For shorter data (e.g., Q1 only), return the last N months
  return ALL_MONTHS.slice(ALL_MONTHS.length - dataLength);
}

// Deterministic color palette for areas
const AREA_COLORS: Record<string, string> = {
  '0': '#d4a574', // Gold
  '1': '#10b981', // Emerald
  '2': '#3b82f6', // Blue
  '3': '#f59e0b', // Amber
  '4': '#f43f5e', // Rose
  '5': '#06b6d4', // Cyan
  '6': '#8b5cf6', // Violet
  '7': '#f97316', // Orange
};

function getAreaColor(index: number): string {
  return AREA_COLORS[String(index % 8)];
}

interface MultiLineChartProps {
  series: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
  labels: string[];
  height?: number;
  indexed?: boolean;
}

function MultiLineChart({
  series,
  labels,
  height = 280,
  indexed = false,
}: MultiLineChartProps) {
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = 800;
  const chartHeight = height - padding.top - padding.bottom;

  // Normalize series data if needed
  const normalizedSeries = useMemo(() => {
    return series.map((s) => {
      if (!indexed) {
        return s;
      }
      const firstValue = s.data[0] || 1;
      return {
        ...s,
        data: s.data.map((v) => (v / firstValue) * 100),
      };
    });
  }, [series, indexed]);

  // Calculate Y-axis bounds
  const allValues = normalizedSeries.flatMap((s) => s.data);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const yPadding = (maxValue - minValue) * 0.1;
  const yMin = Math.max(0, minValue - yPadding);
  const yMax = maxValue + yPadding;
  const yRange = yMax - yMin;

  // Calculate grid lines
  const gridLineCount = 5;
  const gridStep = yRange / gridLineCount;

  // SVG dimensions
  const viewBoxWidth = chartWidth;
  const viewBoxHeight = height;

  const xScale = (index: number) =>
    padding.left + (index / (labels.length - 1)) * (chartWidth - padding.left - padding.right);

  const yScale = (value: number) =>
    height - padding.bottom - ((value - yMin) / yRange) * chartHeight;

  // Generate path for a line
  const generatePath = (data: number[]): string => {
    return data
      .map((value, index) => {
        const x = xScale(index);
        const y = yScale(value);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      width="100%"
      height={height}
      className="border border-white/[0.04] rounded bg-white/[0.01]"
    >
      {/* Grid lines */}
      {Array.from({ length: gridLineCount + 1 }).map((_, i) => {
        const y = yScale(yMin + gridStep * i);
        return (
          <line
            key={`grid-${i}`}
            x1={padding.left}
            y1={y}
            x2={chartWidth - padding.right}
            y2={y}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeDasharray="2,2"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Y-axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth="1"
      />

      {/* Y-axis labels */}
      {Array.from({ length: gridLineCount + 1 }).map((_, i) => {
        const value = yMin + gridStep * i;
        const y = yScale(value);
        const displayValue =
          indexed || value < 100
            ? Math.round(value)
            : Math.round(value).toLocaleString();

        return (
          <text
            key={`y-label-${i}`}
            x={padding.left - 10}
            y={y + 4}
            textAnchor="end"
            fill="rgba(255, 255, 255, 0.4)"
            className="text-[8px]"
          >
            {displayValue}
          </text>
        );
      })}

      {/* Lines and dots */}
      {normalizedSeries.map((s, seriesIndex) => (
        <g key={`series-${seriesIndex}`}>
          {/* Line */}
          <path
            d={generatePath(s.data)}
            fill="none"
            stroke={s.color}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Dots */}
          {s.data.map((value, index) => (
            <circle
              key={`dot-${seriesIndex}-${index}`}
              cx={xScale(index)}
              cy={yScale(value)}
              r="2"
              fill={s.color}
              opacity="0.8"
            />
          ))}
        </g>
      ))}

      {/* X-axis */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={chartWidth - padding.right}
        y2={height - padding.bottom}
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth="1"
      />

      {/* X-axis labels */}
      {labels.map((label, index) => {
        const x = xScale(index);
        return (
          <text
            key={`x-label-${index}`}
            x={x}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            fill="rgba(255, 255, 255, 0.4)"
            className="text-[8px]"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

interface MetricCardProps {
  area: PriceTrendSeries;
  colorIndex: number;
}

function VelocityCard({ area, colorIndex }: MetricCardProps) {
  const color = getAreaColor(colorIndex);
  const isPositiveVelocity = area.priceVelocity >= 0;
  const isPositiveAccel = area.priceAcceleration >= 0;
  const currentPrice = area.priceHistory[area.priceHistory.length - 1];

  return (
    <div className="flex flex-col gap-1 p-3 bg-white/[0.02] border border-white/[0.04] rounded text-[9px]">
      <div className="font-semibold text-white/90" style={{ color }}>
        {area.shortName}
      </div>
      <div className="text-white/70">{Math.round(currentPrice)} AED/sqft</div>
      <div className="flex items-center gap-1 text-white/70">
        <span>Velocity:</span>
        <span
          className={isPositiveVelocity ? 'text-emerald-400' : 'text-rose-400'}
        >
          {isPositiveVelocity ? '↑' : '↓'}
        </span>
        <span className="font-mono">{Math.round(area.priceVelocity)}</span>
      </div>
      <div className="flex items-center gap-1 text-white/70">
        <span>Accel:</span>
        <span
          className={isPositiveAccel ? 'text-emerald-400' : 'text-rose-400'}
        >
          {isPositiveAccel ? '↑' : '↓'}
        </span>
        <span className="font-mono">
          {Math.round(area.priceAcceleration * 10) / 10}
        </span>
      </div>
      <div className="flex items-center gap-1 text-white/70">
        <span>Vol Corr:</span>
        <span className="font-mono">
          {(area.correlationWithVolume * 100).toFixed(0)}%
        </span>
      </div>
      {area.divergenceAlert && (
        <div className="flex items-center gap-1 text-amber-400">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          <span className="text-[8px]">Divergence</span>
        </div>
      )}
    </div>
  );
}

interface ComparisonTableProps {
  selectedAreas: PriceTrendSeries[];
}

function ComparisonTable({ selectedAreas }: ComparisonTableProps) {
  const nav = useWorkspaceNav();
  const tableRows = selectedAreas.map((area, idx) => {
    const current = area.priceHistory[area.priceHistory.length - 1];
    const previous = area.priceHistory[0];
    const change = current - previous;
    const changePercent = ((change / previous) * 100).toFixed(1);
    const isPositive = change >= 0;

    return (
      <tr key={area.areaId} className="border-b border-white/[0.04]">
        <td className="px-3 py-2 text-white/90 font-semibold">
          <button
            onClick={() => nav.openArea(area.areaId)}
            className="hover:text-[#d4a574] transition-colors"
            style={{ color: getAreaColor(idx) }}
          >
            {area.area}
          </button>
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {Math.round(current).toLocaleString()}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {Math.round(previous).toLocaleString()}
        </td>
        <td
          className={`px-3 py-2 font-mono text-[10px] ${
            isPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isPositive ? '+' : ''}
          {changePercent}%
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {Math.round(area.priceVelocity)}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {(area.priceAcceleration * 10).toFixed(1)}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {(area.correlationWithVolume * 100).toFixed(0)}%
        </td>
        <td className="px-3 py-2">
          {area.divergenceAlert ? (
            <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
          ) : (
            <span className="text-white/20">—</span>
          )}
        </td>
      </tr>
    );
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px]">
        <thead>
          <tr className="border-b border-white/[0.04]">
            <th className="px-3 py-2 text-left text-white/40 font-normal">
              Area
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Current
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              12m Ago
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Change %
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Velocity
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Accel
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Vol Corr
            </th>
            <th className="px-3 py-2 text-center text-white/40 font-normal">
              Div
            </th>
          </tr>
        </thead>
        <tbody>{tableRows}</tbody>
      </table>
    </div>
  );
}

export default function PriceTrendsView() {
  const nav = useWorkspaceNav();

  // Pre-select top 5 areas by demand
  const defaultSelectedAreas = useMemo(() => {
    const sorted = [...priceTrendSeries]
      .sort(
        (a, b) =>
          (b.demandHistory[b.demandHistory.length - 1] || 0) -
          (a.demandHistory[a.demandHistory.length - 1] || 0)
      )
      .slice(0, 5);
    return new Set(sorted.map((a) => a.areaId));
  }, []);

  const [selectedAreaIds, setSelectedAreaIds] = useState(defaultSelectedAreas);
  const [overlayType, setOverlayType] = useState<
    'price' | 'yield' | 'volume' | 'demand'
  >('price');
  const [isIndexed, setIsIndexed] = useState(false);

  const selectedAreas = useMemo(() => {
    return priceTrendSeries.filter((a) => selectedAreaIds.has(a.areaId));
  }, [selectedAreaIds]);

  // Build chart series based on overlay type
  const chartSeries = useMemo(() => {
    return selectedAreas.map((area, idx) => {
      let data: number[] = [];
      let label = '';

      switch (overlayType) {
        case 'price':
          data = area.priceHistory;
          label = `${area.shortName} (AED/sqft)`;
          break;
        case 'yield':
          data = area.yieldHistory;
          label = `${area.shortName} (%)`;
          break;
        case 'volume':
          data = area.volumeHistory;
          label = `${area.shortName} (txns)`;
          break;
        case 'demand':
          data = area.demandHistory;
          label = `${area.shortName} (score)`;
          break;
      }

      return {
        label,
        data,
        color: getAreaColor(idx),
      };
    });
  }, [selectedAreas, overlayType]);

  const handleToggleArea = (areaId: string) => {
    const newSelected = new Set(selectedAreaIds);
    if (newSelected.has(areaId)) {
      newSelected.delete(areaId);
    } else {
      newSelected.add(areaId);
    }
    setSelectedAreaIds(newSelected);
  };

  const overlayOptions: Array<{
    id: 'price' | 'yield' | 'volume' | 'demand';
    label: string;
  }> = [
    { id: 'price', label: 'Price/sqft' },
    { id: 'yield', label: 'Rental Yield' },
    { id: 'volume', label: 'Volume' },
    { id: 'demand', label: 'Demand Score' },
  ];

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-[18px] font-semibold text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
          Price Trends
        </h2>
        <p className="text-[11px] text-white/70">
          Price trajectory analysis · Multi-area overlay
        </p>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col gap-3 bg-white/[0.02] border border-white/[0.04] rounded p-3">
        {/* Area Selector */}
        <div>
          <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-2">
            Areas
          </label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {priceTrendSeries.map((area, idx) => (
              <button
                key={area.areaId}
                onClick={() => handleToggleArea(area.areaId)}
                className={`px-2 py-1 rounded text-[9px] font-medium transition-all ${
                  selectedAreaIds.has(area.areaId)
                    ? 'bg-white/[0.1] border border-white/[0.2]'
                    : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                }`}
                style={
                  selectedAreaIds.has(area.areaId)
                    ? {
                        color: getAreaColor(idx),
                        borderColor: getAreaColor(idx),
                        boxShadow: `0 0 8px ${getAreaColor(idx)}20`,
                      }
                    : {}
                }
              >
                {area.shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Overlay Pills */}
        <div>
          <label className="block text-[8px] text-white/40 uppercase tracking-wide mb-2">
            Overlay
          </label>
          <div className="flex flex-wrap gap-2">
            {overlayOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setOverlayType(opt.id)}
                className={`px-3 py-1 rounded-full text-[9px] font-medium transition-all ${
                  overlayType === opt.id
                    ? 'bg-[#d4a574]/20 text-[#d4a574] border border-[#d4a574]/40'
                    : 'bg-white/[0.02] text-white/70 border border-white/[0.04]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Normalization Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsIndexed(!isIndexed)}
            className={`px-3 py-1 rounded text-[9px] font-medium transition-all ${
              isIndexed
                ? 'bg-white/[0.1] text-white/90 border border-white/[0.2]'
                : 'bg-white/[0.02] text-white/70 border border-white/[0.04]'
            }`}
          >
            {isIndexed ? 'Indexed (base 100)' : 'Absolute Values'}
          </button>
          <span className="text-[8px] text-white/40">
            {isIndexed
              ? 'Normalized to month 1'
              : 'Raw values, independent scales'}
          </span>
        </div>
      </div>

      {/* Chart */}
      {selectedAreas.length > 0 ? (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <MultiLineChart
            series={chartSeries}
            labels={getMonthLabels(chartSeries[0]?.data?.length || 12)}
            height={280}
            indexed={isIndexed}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[9px] px-2">
            {selectedAreas.map((area, idx) => {
              const currentValue = (() => {
                switch (overlayType) {
                  case 'price':
                    return Math.round(
                      area.priceHistory[area.priceHistory.length - 1]
                    );
                  case 'yield':
                    return (
                      area.yieldHistory[area.yieldHistory.length - 1] * 100
                    ).toFixed(1);
                  case 'volume':
                    return Math.round(
                      area.volumeHistory[area.volumeHistory.length - 1]
                    );
                  case 'demand':
                    return Math.round(
                      area.demandHistory[area.demandHistory.length - 1]
                    );
                }
              })();

              return (
                <div key={area.areaId} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getAreaColor(idx) }}
                  />
                  <button
                    onClick={() => nav.openArea(area.areaId)}
                    className="text-white/70 hover:text-[#d4a574] transition-colors"
                  >
                    {area.shortName}
                  </button>
                  <span className="text-white/40">{currentValue}</span>
                  {area.divergenceAlert && (
                    <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/40 text-[11px]">
          Select areas to display
        </div>
      )}

      {/* Velocity/Acceleration Cards */}
      {selectedAreas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {selectedAreas.map((area, idx) => (
            <div key={area.areaId} className="flex-shrink-0 w-40">
              <VelocityCard area={area} colorIndex={idx} />
            </div>
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {selectedAreas.length > 0 && (
        <div className="flex-1 min-h-0 flex flex-col bg-white/[0.02] border border-white/[0.04] rounded overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <ComparisonTable selectedAreas={selectedAreas} />
          </div>
        </div>
      )}
    </div>
  );
}
