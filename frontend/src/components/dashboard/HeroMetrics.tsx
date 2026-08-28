import React from 'react';
import { PortfolioSummary, formatINR, formatPercent } from '@investment-tracker/shared';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

interface HeroMetricsProps {
  summary?: PortfolioSummary;
  isPrivacyMode?: boolean;
}

export function HeroMetrics({ summary, isPrivacyMode = false }: HeroMetricsProps) {
  if (!summary) return null;

  const isProfit = summary.totalGain >= 0;

  const formatVal = (val: number, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••••';
    return formatINR(val, compact);
  };

  return (
    <div className="space-y-4">
      {/* 3 Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        
        {/* Card 1: Total Net Worth */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-xl transition-all hover:border-zinc-700">
          <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Net Worth</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">
              {formatVal(summary.totalNetWorth)}
            </div>
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-zinc-400 font-medium">{summary.holdingCount} Active Assets</span>
              {summary.marketFreshnessInfo && (
                <span
                  className="text-zinc-400 font-mono text-[11px] flex items-center gap-1"
                  title={`Live Market Rates updated: ${summary.marketFreshnessInfo.formattedExact} (${summary.marketFreshnessInfo.sourceLabel})`}
                >
                  • <span className={`h-1.5 w-1.5 rounded-full ${summary.marketFreshnessInfo.staleness === 'fresh' ? 'bg-emerald-400 animate-pulse' : summary.marketFreshnessInfo.staleness === 'moderate' ? 'bg-amber-400' : 'bg-zinc-500'}`} />
                  <span className="text-zinc-300">Rates: {summary.marketFreshnessInfo.relativeTime}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Total Invested */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-xl transition-all hover:border-zinc-700">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Invested</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-200 tracking-tight font-mono">
              {formatVal(summary.totalInvested)}
            </div>
            <div className="text-xs text-zinc-400 font-medium">
              Invested Capital Baseline
            </div>
          </div>
        </div>

        {/* Card 3: Total Profit / Loss */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800/80 p-5 sm:p-6 shadow-xl transition-all hover:border-zinc-700">
          <div className={`absolute top-0 right-0 h-32 w-32 ${isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10'} rounded-full blur-3xl pointer-events-none`} />
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Total Returns / P&L</span>
            <div className={`p-2 rounded-xl border shadow-sm ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            </div>
          </div>
          <div className="space-y-1">
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatVal(summary.totalGain)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                {formatPercent(summary.totalGainPercent)} All-Time
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
