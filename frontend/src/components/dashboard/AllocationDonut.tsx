import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PortfolioSummary, formatINR } from '@investment-tracker/shared';
import { PieChart as PieIcon } from 'lucide-react';

interface AllocationDonutProps {
  summary?: PortfolioSummary;
  isPrivacyMode?: boolean;
}

const ASSET_COLORS: Record<string, string> = {
  stock: '#10b981', // emerald-500
  mutual_fund: '#3b82f6', // blue-500
  us_stock: '#38bdf8', // sky-400
  sgb: '#f59e0b', // amber-500
  etf: '#14b8a6', // teal-500
  epf: '#8b5cf6', // purple-500
  ppf: '#ec4899', // pink-500
  fd: '#6366f1', // indigo-500
};

const ASSET_LABELS: Record<string, string> = {
  stock: 'Indian Stocks',
  mutual_fund: 'Mutual Funds',
  us_stock: 'US Stocks & ETFs',
  sgb: 'Sovereign Gold Bonds',
  etf: 'Indian ETFs',
  epf: 'EPF',
  ppf: 'PPF',
  fd: 'Fixed Deposits',
};

export function AllocationDonut({ summary, isPrivacyMode = false }: AllocationDonutProps) {
  const [hoveredSlice, setHoveredSlice] = useState<any | null>(null);

  const formatVal = (val: number | null | undefined, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••';
    return formatINR(val, compact);
  };

  if (!summary || summary.totalNetWorth === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-8 text-center text-zinc-500 text-sm shadow-xl">
        <PieIcon className="h-8 w-8 mx-auto text-zinc-600 mb-2" />
        <span>No asset allocation data yet.</span>
        <p className="text-xs text-zinc-600 mt-1">Import a statement or add assets to visualize</p>
      </div>
    );
  }

  // 8 Asset Categories Distribution
  const assetClassData = Object.entries(summary.assetClassBreakdown)
    .filter(([_, val]) => val.current > 0)
    .map(([key, val]) => ({
      name: ASSET_LABELS[key] || key,
      key,
      value: val.current,
      percentage: val.allocationPercent,
      color: ASSET_COLORS[key] || '#71717a',
    }))
    .sort((a, b) => b.value - a.value);

  // Macro Split (Equity / Debt / Gold)
  const equityPct = summary.macroBreakdown.equity.percentage;
  const debtPct = summary.macroBreakdown.debt.percentage;
  const goldPct = summary.macroBreakdown.gold.percentage;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">{d.name}</p>
          <p className="text-zinc-300">
            Current: <span className="font-semibold text-emerald-400">{formatVal(d.value)}</span>
          </p>
          <p className="text-zinc-400">
            Allocation: <span className="font-semibold text-white">{d.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 sm:p-6 shadow-xl space-y-6">
      
      {/* Top Section: Macro Allocation Progress Bar & Metric Badges */}
      <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Macro Asset Split</span>
            <span className="text-[10px] text-zinc-500 hidden sm:inline">• 100% Portfolio Balance</span>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {assetClassData.length} Active Asset {assetClassData.length === 1 ? 'Class' : 'Classes'}
          </span>
        </div>

        {/* Stacked Macro Bar */}
        <div className="w-full bg-zinc-900 h-3.5 rounded-full overflow-hidden flex shadow-inner">
          {equityPct > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${equityPct}%` }}
              title={`Equity: ${equityPct.toFixed(1)}%`}
            />
          )}
          {debtPct > 0 && (
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${debtPct}%` }}
              title={`Debt: ${debtPct.toFixed(1)}%`}
            />
          )}
          {goldPct > 0 && (
            <div
              className="bg-amber-500 h-full transition-all duration-500"
              style={{ width: `${goldPct}%` }}
              title={`Gold: ${goldPct.toFixed(1)}%`}
            />
          )}
        </div>

        {/* Macro Pill Legend */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="text-zinc-200 font-medium text-xs truncate">Equity</span>
            </div>
            <div className="text-right font-mono ml-1">
              <span className="font-bold text-emerald-400 text-xs sm:text-sm">{equityPct.toFixed(1)}%</span>
              <span className="text-zinc-500 text-[10px] block font-normal">{formatVal(summary.macroBreakdown.equity.value, true)}</span>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-zinc-200 font-medium text-xs truncate">Debt</span>
            </div>
            <div className="text-right font-mono ml-1">
              <span className="font-bold text-blue-400 text-xs sm:text-sm">{debtPct.toFixed(1)}%</span>
              <span className="text-zinc-500 text-[10px] block font-normal">{formatVal(summary.macroBreakdown.debt.value, true)}</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-zinc-200 font-medium text-xs truncate">Gold</span>
            </div>
            <div className="text-right font-mono ml-1">
              <span className="font-bold text-amber-400 text-xs sm:text-sm">{goldPct.toFixed(1)}%</span>
              <span className="text-zinc-500 text-[10px] block font-normal">{formatVal(summary.macroBreakdown.gold.value, true)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Center Section: Large & Aesthetic 8-Category Donut Chart */}
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="h-72 sm:h-80 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetClassData}
                cx="50%"
                cy="50%"
                innerRadius={92}
                outerRadius={135}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, idx) => setHoveredSlice(assetClassData[idx])}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                {assetClassData.map((entry) => (
                  <Cell
                    key={`cell-${entry.key}`}
                    fill={entry.color}
                    stroke="rgba(24, 24, 27, 0.95)"
                    strokeWidth={3}
                    className="transition-all duration-200 hover:opacity-85 cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Dynamic Center Label inside Large Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold truncate max-w-[160px]">
              {hoveredSlice ? hoveredSlice.name : 'Active Net Worth'}
            </span>
            <span className="text-xl sm:text-2xl font-black text-white font-mono mt-0.5 tracking-tight">
              {hoveredSlice ? `${hoveredSlice.percentage.toFixed(1)}%` : formatVal(summary.totalNetWorth, true)}
            </span>
            {hoveredSlice ? (
              <span className="text-xs text-zinc-400 font-mono mt-0.5">
                {formatVal(hoveredSlice.value)}
              </span>
            ) : (
              <span className="text-[10px] text-zinc-500 font-sans mt-0.5">
                Across 8 Categories
              </span>
            )}
          </div>
        </div>

        {/* Lightweight Horizontal Legend Pills (No duplication of card values) */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto pt-1">
          {assetClassData.map((item) => (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredSlice(item)}
              onMouseLeave={() => setHoveredSlice(null)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer ${
                hoveredSlice?.key === item.key
                  ? 'bg-zinc-800 border-zinc-500 text-white shadow-md scale-105'
                  : 'bg-zinc-950/70 border-zinc-800/80 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-medium text-[11px]">{item.name}</span>
              <span className="font-bold text-white font-mono text-[11px] ml-0.5">
                {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
