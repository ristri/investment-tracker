import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { PortfolioSummary, formatINR } from '@investment-tracker/shared';
import { PieChart as PieIcon } from 'lucide-react';
import { Panel, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';

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
  us_stock: 'US Equities',
  sgb: 'SGB (Gold)',
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
      <Panel className="p-8 text-center text-muted-foreground text-sm">
        <PieIcon className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
        <span>No asset allocation data yet.</span>
        <p className="text-xs text-muted-foreground/60 mt-1">Import a statement or add assets to visualize</p>
      </Panel>
    );
  }

  // Active asset classes distribution
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
        <div className="bg-popover border border-surface-border p-3 rounded-card shadow-xl text-xs space-y-1 text-popover-foreground">
          <p className="font-bold">{d.name}</p>
          <p className="text-muted-foreground">
            Valuation: <span className="font-bold text-primary tnum">{formatVal(d.value)}</span>
          </p>
          <p className="text-muted-foreground">
            Allocation: <span className="font-bold text-foreground tnum">{d.percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Panel className="space-y-6">
      <PanelHeader className="mb-0">
        <PanelTitle sub="Distribution across macro classes and specific instruments">
          Portfolio Asset Allocation
        </PanelTitle>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
          {assetClassData.length} Asset {assetClassData.length === 1 ? 'Class' : 'Classes'}
        </span>
      </PanelHeader>

      {/* Top Section: Macro Allocation Progress Bar & Metric Badges */}
      <div className="card-well p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Macro Asset Split</span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">• 100% Portfolio Balance</span>
          </div>
          <span className="text-xs text-muted-foreground tnum">
            {equityPct.toFixed(0)}% Eq • {debtPct.toFixed(0)}% Debt • {goldPct.toFixed(0)}% Gold
          </span>
        </div>

        {/* Stacked Macro Bar */}
        <div className="w-full bg-muted h-3.5 rounded-full overflow-hidden flex shadow-inner">
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
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
          <div className="card-surface px-3 py-2 rounded-tile flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-semibold text-xs truncate text-foreground">Equity</span>
            </div>
            <div className="text-right tnum ml-1">
              <span className="font-bold text-emerald-500 text-xs sm:text-sm">{equityPct.toFixed(1)}%</span>
              <span className="text-muted-foreground text-[10px] block font-normal">{formatVal(summary.macroBreakdown.equity.value, true)}</span>
            </div>
          </div>

          <div className="card-surface px-3 py-2 rounded-tile flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold text-xs truncate text-foreground">Debt</span>
            </div>
            <div className="text-right tnum ml-1">
              <span className="font-bold text-blue-500 text-xs sm:text-sm">{debtPct.toFixed(1)}%</span>
              <span className="text-muted-foreground text-[10px] block font-normal">{formatVal(summary.macroBreakdown.debt.value, true)}</span>
            </div>
          </div>

          <div className="card-surface px-3 py-2 rounded-tile flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <span className="font-semibold text-xs truncate text-foreground">Gold</span>
            </div>
            <div className="text-right tnum ml-1">
              <span className="font-bold text-amber-500 text-xs sm:text-sm">{goldPct.toFixed(1)}%</span>
              <span className="text-muted-foreground text-[10px] block font-normal">{formatVal(summary.macroBreakdown.gold.value, true)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Donut Chart & Legend */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-6 h-64 sm:h-72 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetClassData}
                cx="50%"
                cy="50%"
                innerRadius={78}
                outerRadius={114}
                paddingAngle={3}
                dataKey="value"
                onMouseEnter={(_, idx) => setHoveredSlice(assetClassData[idx])}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                {assetClassData.map((entry) => (
                  <Cell
                    key={`cell-${entry.key}`}
                    fill={entry.color}
                    stroke="transparent"
                    className="cursor-pointer transition-opacity hover:opacity-85"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center Donut Label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-2">
            {hoveredSlice ? (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate max-w-[120px]">
                  {hoveredSlice.name}
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-foreground tnum mt-0.5">
                  {formatVal(hoveredSlice.value, true)}
                </span>
                <span className="text-xs font-bold text-primary tnum">
                  {hoveredSlice.percentage.toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Net Worth
                </span>
                <span className="text-lg sm:text-xl font-extrabold text-foreground tnum mt-0.5">
                  {formatVal(summary.totalNetWorth, true)}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">
                  100% Total
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend grid */}
        <div className="md:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {assetClassData.map((item) => (
            <div
              key={item.key}
              onMouseEnter={() => setHoveredSlice(item)}
              onMouseLeave={() => setHoveredSlice(null)}
              className="flex items-center justify-between p-2.5 rounded-tile card-surface hover:border-primary/40 transition-colors cursor-pointer text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-semibold text-foreground truncate">{item.name}</span>
              </div>
              <div className="text-right shrink-0 tnum ml-2">
                <span className="font-bold text-foreground block">{formatVal(item.value, true)}</span>
                <span className="text-[10px] text-muted-foreground">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
