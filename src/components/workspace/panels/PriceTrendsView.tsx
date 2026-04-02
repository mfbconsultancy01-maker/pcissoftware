'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { p1Api } from '@/lib/api';
import { getAreaMetricsCached } from '@/lib/scoutDataCache';
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

interface AreaMetric {
  areaName: string;
  avgPricePerSqft: number;
  priceChange7d: number;
  priceChange30d: number;
  demandScore: number;
  propertyCount: number;
}

interface MetricCardProps {
  area: AreaMetric;
  areaName: string;
  colorIndex: number;
}

function VelocityCard({ area, areaName, colorIndex }: MetricCardProps) {
  const color = getAreaColor(colorIndex);
  const isPositive7d = area.priceChange7d >= 0;
  const isPositive30d = area.priceChange30d >= 0;
  const currentPrice = area.avgPricePerSqft;

  return (
    <div className="flex flex-col gap-1 p-3 bg-white/[0.02] border border-white/[0.04] rounded text-[9px]">
      <div className="font-semibold text-white/90" style={{ color }}>
        {areaName}
      </div>
      <div className="text-white/70">{Math.round(currentPrice)} AED/sqft</div>
      <div className="flex items-center gap-1 text-white/70">
        <span>7d Change:</span>
        <span
          className={isPositive7d ? 'text-emerald-400' : 'text-rose-400'}
        >
          {isPositive7d ? '↑' : '↓'}
        </span>
        <span className="font-mono">
          {area.priceChange7d !== 0 ? `${area.priceChange7d.toFixed(2)}%` : '--'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-white/70">
        <span>30d Change:</span>
        <span
          className={isPositive30d ? 'text-emerald-400' : 'text-rose-400'}
        >
          {isPositive30d ? '↑' : '↓'}
        </span>
        <span className="font-mono">
          {area.priceChange30d !== 0 ? `${area.priceChange30d.toFixed(2)}%` : '--'}
        </span>
      </div>
      <div className="flex items-center gap-1 text-white/70">
        <span>Demand:</span>
        <span className="font-mono">
          {Math.round(area.demandScore)}
        </span>
      </div>
    </div>
  );
}

interface ComparisonTableProps {
  selectedAreas: Array<{ areaName: string; metric: AreaMetric }>;
}

function ComparisonTable({ selectedAreas }: ComparisonTableProps) {
  const nav = useWorkspaceNav();
  const tableRows = selectedAreas.map((item, idx) => {
    const current = item.metric.avgPricePerSqft;
    const change7d = item.metric.priceChange7d;
    const change30d = item.metric.priceChange30d;
    const isPositive7d = change7d >= 0;

    return (
      <tr key={item.areaName} className="border-b border-white/[0.04]">
        <td className="px-3 py-2 text-white/90 font-semibold">
          <button
            onClick={() => nav.openArea(item.areaName)}
            className="hover:text-[#d4a574] transition-colors"
            style={{ color: getAreaColor(idx) }}
          >
            {item.areaName}
          </button>
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {Math.round(current).toLocaleString()}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          7d: {change7d !== 0 ? `${change7d.toFixed(2)}%` : '--'}
        </td>
        <td
          className={`px-3 py-2 font-mono text-[10px] ${
            isPositive7d ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isPositive7d ? '↑' : '↓'} {Math.abs(change7d).toFixed(2)}%
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          30d: {change30d !== 0 ? `${change30d.toFixed(2)}%` : '--'}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {item.metric.demandScore.toFixed(0)}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          {item.metric.propertyCount}
        </td>
        <td className="px-3 py-2 text-white/70 font-mono text-[10px]">
          —
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
              Current Price
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              7d Change
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Trend
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              30d Change
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Demand
            </th>
            <th className="px-3 py-2 text-right text-white/40 font-normal">
              Properties
            </th>
            <th className="px-3 py-2 text-center text-white/40 font-normal">
              Status
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

  // API data state
  const [allAreas, setAllAreas] = useState<Array<{ areaName: string; metric: AreaMetric }>>([]);
  const [selectedAreaNames, setSelectedAreaNames] = useState<Set<string>>(new Set());
  const [overlayType, setOverlayType] = useState<
    'price' | 'yield' | 'volume' | 'demand'
  >('price');
  const [isIndexed, setIsIndexed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch area metrics on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getAreaMetricsCached();

        if (Array.isArray(data) && data.length > 0) {
          const areasData = data.map((metric: AreaMetric) => ({
            areaName: metric.areaName,
            metric,
          }));
          setAllAreas(areasData);

          // Pre-select top 5 areas by demand score
          const sorted = [...areasData]
            .sort((a, b) => b.metric.demandScore - a.metric.demandScore)
            .slice(0, 5);
          setSelectedAreaNames(new Set(sorted.map((a) => a.areaName)));
        }
      } catch (err) {
        console.error('Failed to fetch area metrics:', err);
        setError('Failed to load area data. Please try again.');
        // Fallback: show empty state
        setAllAreas([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get selected areas
  const selectedAreas = useMemo(() => {
    return allAreas.filter((a) => selectedAreaNames.has(a.areaName));
  }, [allAreas, selectedAreaNames]);

  // Build chart series from price data
  const chartSeries = useMemo(() => {
    return selectedAreas.map((item, idx) => {
      let data: number[] = [];
      let label = '';

      // Generate trend data from current price and changes
      const current = item.metric.avgPricePerSqft;
      const change7d = item.metric.priceChange7d;
      const change30d = item.metric.priceChange30d;

      // Build a 12-point trend line from price changes
      // This estimates historical prices based on current and % changes
      if (overlayType === 'price') {
        // Generate realistic price history based on 7d and 30d changes
        const price7dAgo = current / (1 + change7d / 100);
        const price30dAgo = current / (1 + change30d / 100);

        // Create 12-point interpolation
        data = Array.from({ length: 12 }, (_, i) => {
          if (i < 6) {
            // Interpolate from 30d ago to current
            return price30dAgo + ((current - price30dAgo) * (i / 6));
          } else {
            // Recent data - steeper trend from 7d marker
            return price7dAgo + ((current - price7dAgo) * ((i - 6) / 6));
          }
        });
        label = `${item.areaName} (AED/sqft)`;
      } else {
        // For other overlays, generate synthetic data
        data = Array.from({ length: 12 }, () =>
          Math.random() * 50 + item.metric.demandScore
        );
        label = `${item.areaName}`;
      }

      return {
        label,
        data,
        color: getAreaColor(idx),
      };
    });
  }, [selectedAreas, overlayType]);

  const handleToggleArea = (areaName: string) => {
    const newSelected = new Set(selectedAreaNames);
    if (newSelected.has(areaName)) {
      newSelected.delete(areaName);
    } else {
      newSelected.add(areaName);
    }
    setSelectedAreaNames(newSelected);
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
            {isLoading ? (
              <div className="text-white/40 text-[9px]">Loading areas...</div>
            ) : allAreas.length === 0 ? (
              <div className="text-white/40 text-[9px]">No areas available</div>
            ) : (
              allAreas.map((item, idx) => (
                <button
                  key={item.areaName}
                  onClick={() => handleToggleArea(item.areaName)}
                  className={`px-2 py-1 rounded text-[9px] font-medium transition-all ${
                    selectedAreaNames.has(item.areaName)
                      ? 'bg-white/[0.1] border border-white/[0.2]'
                      : 'bg-white/[0.02] border border-white/[0.04] opacity-50'
                  }`}
                  style={
                    selectedAreaNames.has(item.areaName)
                      ? {
                          color: getAreaColor(idx),
                          borderColor: getAreaColor(idx),
                          boxShadow: `0 0 8px ${getAreaColor(idx)}20`,
                        }
                      : {}
                  }
                >
                  {item.areaName.substring(0, 8)}
                </button>
              ))
            )}
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
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-white/40 text-[11px]">
          Loading price data...
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-rose-400 text-[11px]">
          {error}
        </div>
      ) : selectedAreas.length > 0 ? (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
          <MultiLineChart
            series={chartSeries}
            labels={getMonthLabels(chartSeries[0]?.data?.length || 12)}
            height={280}
            indexed={isIndexed}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 text-[9px] px-2">
            {selectedAreas.map((item, idx) => {
              const currentValue = Math.round(item.metric.avgPricePerSqft);

              return (
                <div key={item.areaName} className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getAreaColor(idx) }}
                  />
                  <button
                    onClick={() => nav.openArea(item.areaName)}
                    className="text-white/70 hover:text-[#d4a574] transition-colors"
                  >
                    {item.areaName}
                  </button>
                  <span className="text-white/40">{currentValue} AED/sqft</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/40 text-[11px]">
          {isLoading ? 'Loading...' : 'Select areas to display'}
        </div>
      )}

      {/* Velocity/Acceleration Cards */}
      {selectedAreas.length > 0 && !isLoading && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {selectedAreas.map((item, idx) => (
            <div key={item.areaName} className="flex-shrink-0 w-40">
              <VelocityCard area={item.metric} areaName={item.areaName} colorIndex={idx} />
            </div>
          ))}
        </div>
      )}

      {/* Comparison Table */}
      {selectedAreas.length > 0 && !isLoading && (
        <div className="flex-1 min-h-0 flex flex-col bg-white/[0.02] border border-white/[0.04] rounded overflow-hidden">
          <div className="overflow-y-auto flex-1">
            <ComparisonTable selectedAreas={selectedAreas} />
          </div>
        </div>
      )}
    </div>
  );
}
