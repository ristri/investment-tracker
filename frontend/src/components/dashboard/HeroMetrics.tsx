import React from 'react';
import { PortfolioSummary, formatINR, formatPercent, getHoldingLiveValue, Holding } from '@investment-tracker/shared';
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Sparkles, ShieldCheck } from 'lucide-react';
import { Panel, StatBlock, HighlightPanel, IconTile, Tone } from '@/components/ui/panel';

interface HeroMetricsProps {
  summary?: PortfolioSummary;
  holdings?: Holding[];
  isPrivacyMode?: boolean;
}

export function HeroMetrics({ summary, holdings = [], isPrivacyMode = false }: HeroMetricsProps) {
  if (!summary) return null;

  const isProfit = summary.totalGain >= 0;

  const formatVal = (val: number, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••••';
    return formatINR(val, compact);
  };

  // Find top performer holding
  const topPerformer = holdings.length > 0
    ? [...holdings].sort((a, b) => {
        const valA = getHoldingLiveValue(a).pnl;
        const valB = getHoldingLiveValue(b).pnl;
        return valB - valA;
      })[0]
    : null;

  const topPerformerData = topPerformer ? getHoldingLiveValue(topPerformer) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Total Net Worth */}
      <StatBlock
        label="Total Net Worth"
        value={formatVal(summary.totalNetWorth)}
        icon={Wallet}
        tone="primary"
        tintValue={true}
        hint={
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-foreground">{summary.holdingCount} Active Assets</span>
            {summary.marketFreshnessInfo && (
              <span className="text-muted-foreground text-[10px]">
                • Rates: {summary.marketFreshnessInfo.relativeTime}
              </span>
            )}
          </span>
        }
      />

      {/* 2. Total Invested Capital */}
      <StatBlock
        label="Invested Capital"
        value={formatVal(summary.totalInvested)}
        icon={PiggyBank}
        tone="neutral"
        hint="Original cost basis baseline"
      />

      {/* 3. Total Returns / P&L */}
      <StatBlock
        label="Total Returns (P&L)"
        value={formatVal(summary.totalGain)}
        icon={isProfit ? TrendingUp : TrendingDown}
        tone={isProfit ? 'primary' : 'danger'}
        tintValue={true}
        hint={
          <span className="inline-flex items-center gap-1 font-bold text-xs">
            <span className={isProfit ? 'text-brand-primary-ink' : 'text-destructive'}>
              {formatPercent(summary.totalGainPercent)}
            </span>
            <span className="text-muted-foreground font-normal">All-Time</span>
          </span>
        }
      />

      {/* 4. Top Performer or Macro Health */}
      {topPerformer && topPerformerData && topPerformerData.pnl > 0 ? (
        <HighlightPanel
          accent="primary"
          title="Top Performer"
          badge={formatPercent(topPerformerData.pnlPercent)}
          stat={isPrivacyMode ? '₹ ••••••' : `+${formatINR(topPerformerData.pnl, true)}`}
          footer={
            <span className="truncate block font-semibold">
              {topPerformer.name} ({topPerformer.symbol || topPerformer.asset_class.toUpperCase()})
            </span>
          }
        />
      ) : (
        <HighlightPanel
          accent="secondary"
          title="Macro Split"
          badge={`${summary.macroBreakdown.equity.percentage.toFixed(0)}% Eq`}
          stat={`${summary.macroBreakdown.equity.percentage.toFixed(0)}% / ${summary.macroBreakdown.debt.percentage.toFixed(0)}% / ${summary.macroBreakdown.gold.percentage.toFixed(0)}%`}
          footer="Equity • Debt • Gold Balance"
        />
      )}
    </div>
  );
}
