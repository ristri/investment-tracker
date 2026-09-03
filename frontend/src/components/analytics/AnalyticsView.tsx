import React, { useState } from 'react';
import {
  PortfolioSummary,
  Holding,
  formatINR,
  formatPercent,
  formatLocalDate,
  getHoldingLiveValue,
} from '@investment-tracker/shared';
import {
  PieChart,
  Shield,
  Coins,
  TrendingUp,
  Landmark,
  FileText,
  DollarSign,
  Lock,
  Unlock,
  Layers,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { Panel, PanelHeader, PanelTitle, PillBarChart, PillBar, StatBlock } from '@/components/ui/panel';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface AnalyticsViewProps {
  summary?: PortfolioSummary;
  holdings: Holding[];
  isPrivacyMode?: boolean;
}

const TARGET_MODELS = [
  {
    id: 'balanced',
    name: 'Classic Balanced',
    target: { equity: 60, debt: 30, gold: 10 },
    description: 'Traditional 60:30:10 model balancing long-term equity growth with capital preservation.',
  },
  {
    id: 'aggressive',
    name: 'Aggressive Growth',
    target: { equity: 80, debt: 15, gold: 5 },
    description: 'High-growth model for investors with a long investment horizon (10+ years).',
  },
  {
    id: 'conservative',
    name: 'All-Weather / Conservative',
    target: { equity: 40, debt: 45, gold: 15 },
    description: 'Capital preservation model prioritizing debt securities and inflation-hedged gold.',
  },
];

export function AnalyticsView({
  summary,
  holdings,
  isPrivacyMode = false,
}: AnalyticsViewProps) {
  const [selectedModelId, setSelectedModelId] = useState<'balanced' | 'aggressive' | 'conservative'>('balanced');

  if (!summary || holdings.length === 0) {
    return (
      <Panel className="p-10 text-center text-muted-foreground text-sm space-y-2">
        <PieChart className="h-8 w-8 mx-auto text-muted-foreground/60 mb-2" />
        <h3 className="font-bold text-foreground text-base">No Portfolio Analytics Available</h3>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Import statement data or add assets to view macro rebalancing models, concentration analysis, and asset class yield rankings.
        </p>
      </Panel>
    );
  }

  const formatVal = (val: number, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••';
    return formatINR(val, compact);
  };

  const actualEquity = summary.macroBreakdown.equity.percentage;
  const actualDebt = summary.macroBreakdown.debt.percentage;
  const actualGold = summary.macroBreakdown.gold.percentage;

  const activeModel = TARGET_MODELS.find((m) => m.id === selectedModelId) || TARGET_MODELS[0];

  // 1. Asset Class Yield / Return % Bar Chart
  const assetClassBars: PillBar[] = Object.entries(summary.assetClassBreakdown)
    .filter(([_, data]) => data.invested > 0)
    .map(([key, data]) => {
      const returnPct = data.invested > 0 ? ((data.current - data.invested) / data.invested) * 100 : 0;
      const labels: Record<string, string> = {
        stock: 'Stocks',
        mutual_fund: 'MFs',
        us_stock: 'US Equities',
        sgb: 'SGB Gold',
        etf: 'ETFs',
        epf: 'EPF',
        ppf: 'PPF',
        fd: 'FDs',
      };
      return {
        label: labels[key] || key,
        percent: Math.min(100, Math.max(0, returnPct)),
        display: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(1)}%`,
        active: returnPct > 15,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  // 2. Concentration: Top 5 Holdings Weight
  const holdingsSorted = [...holdings]
    .map((h) => ({
      holding: h,
      val: getHoldingLiveValue(h).currentValue,
    }))
    .sort((a, b) => b.val - a.val);

  const top5Total = holdingsSorted.slice(0, 5).reduce((acc, curr) => acc + curr.val, 0);
  const top5ConcentrationPct = summary.totalNetWorth > 0 ? (top5Total / summary.totalNetWorth) * 100 : 0;

  // 3. Currency / Geography Split
  const usStockTotal = summary.assetClassBreakdown.us_stock?.current || 0;
  const domesticTotal = summary.totalNetWorth - usStockTotal;
  const domesticPct = summary.totalNetWorth > 0 ? (domesticTotal / summary.totalNetWorth) * 100 : 100;
  const globalPct = summary.totalNetWorth > 0 ? (usStockTotal / summary.totalNetWorth) * 100 : 0;

  // 4. Liquidity Profile
  const liquidTotal =
    (summary.assetClassBreakdown.stock?.current || 0) +
    (summary.assetClassBreakdown.mutual_fund?.current || 0) +
    (summary.assetClassBreakdown.us_stock?.current || 0) +
    (summary.assetClassBreakdown.etf?.current || 0);

  const lockedTotal =
    (summary.assetClassBreakdown.epf?.current || 0) +
    (summary.assetClassBreakdown.ppf?.current || 0) +
    (summary.assetClassBreakdown.fd?.current || 0) +
    (summary.assetClassBreakdown.sgb?.current || 0);

  const liquidPct = summary.totalNetWorth > 0 ? (liquidTotal / summary.totalNetWorth) * 100 : 0;
  const lockedPct = summary.totalNetWorth > 0 ? (lockedTotal / summary.totalNetWorth) * 100 : 0;

  // 5. PPF FY 80C deposit progress
  const ppfHolding = holdings.find((h) => h.asset_class === 'ppf');
  const ppfAnnualDeposit = ppfHolding?.metadata?.annual_deposit ?? 0;
  const ppf80cLimit = 150000;
  const ppfProgressPct = Math.min(100, (ppfAnnualDeposit / ppf80cLimit) * 100);

  // 6. SGB 2.5% Coupon Forecast
  const sgbHoldings = holdings.filter((h) => h.asset_class === 'sgb');
  const sgbAnnualCoupon = sgbHoldings.reduce((acc, h) => {
    const issuePrice = h.metadata?.issue_price_per_gram || h.avg_buy_price || 0;
    return acc + issuePrice * h.quantity * 0.025;
  }, 0);

  // 7. FD Maturing List
  const fdHoldings = holdings
    .filter((h) => h.asset_class === 'fd')
    .sort((a, b) => {
      const dateA = a.metadata?.maturity_date ? new Date(a.metadata.maturity_date).getTime() : Infinity;
      const dateB = b.metadata?.maturity_date ? new Date(b.metadata.maturity_date).getTime() : Infinity;
      return dateA - dateB;
    });

  return (
    <div className="space-y-6">
      {/* Page Title & Intro */}
      <div>
        <h2 className="text-xl font-extrabold text-foreground tracking-tight">Portfolio Intelligence</h2>
        <p className="text-xs text-muted-foreground">
          Real-time macro allocation models, asset class yields, portfolio concentration, and passive cash-flow forecasts.
        </p>
      </div>

      {/* 1. Macro Allocation vs Target Benchmark Models */}
      <Panel className="space-y-5">
        <PanelHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 mb-0">
          <div>
            <PanelTitle sub="Benchmark your actual asset split against standard wealth allocation models">
              Macro Asset Rebalancing & Model Comparison
            </PanelTitle>
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-tile border border-surface-border">
            {TARGET_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedModelId(m.id as any)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                  selectedModelId === m.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </PanelHeader>

        {/* Selected Model Description */}
        <div className="card-well p-3.5 text-xs text-muted-foreground flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-primary" />
          <span>{activeModel.description}</span>
        </div>

        {/* Allocation Comparison Rows */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Equity */}
          <div className="card-surface p-4 rounded-card space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Equity Allocation</span>
              <span className="text-muted-foreground tnum">
                Target: {activeModel.target.equity}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-emerald-500 tnum">
                {actualEquity.toFixed(1)}%
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold tnum px-2 py-0.5 rounded-full',
                  actualEquity >= activeModel.target.equity
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
              >
                {actualEquity >= activeModel.target.equity ? '+' : ''}
                {(actualEquity - activeModel.target.equity).toFixed(1)}% vs target
              </span>
            </div>
            <Progress value={actualEquity} indicatorClassName="bg-emerald-500" />
          </div>

          {/* Debt */}
          <div className="card-surface p-4 rounded-card space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Debt & Fixed Income</span>
              <span className="text-muted-foreground tnum">
                Target: {activeModel.target.debt}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-blue-500 tnum">
                {actualDebt.toFixed(1)}%
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold tnum px-2 py-0.5 rounded-full',
                  actualDebt >= activeModel.target.debt
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                )}
              >
                {actualDebt >= activeModel.target.debt ? '+' : ''}
                {(actualDebt - activeModel.target.debt).toFixed(1)}% vs target
              </span>
            </div>
            <Progress value={actualDebt} indicatorClassName="bg-blue-500" />
          </div>

          {/* Gold */}
          <div className="card-surface p-4 rounded-card space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Gold & SGBs</span>
              <span className="text-muted-foreground tnum">
                Target: {activeModel.target.gold}%
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-500 tnum">
                {actualGold.toFixed(1)}%
              </span>
              <span
                className={cn(
                  'text-[11px] font-bold tnum px-2 py-0.5 rounded-full',
                  actualGold >= activeModel.target.gold
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {actualGold >= activeModel.target.gold ? '+' : ''}
                {(actualGold - activeModel.target.gold).toFixed(1)}% vs target
              </span>
            </div>
            <Progress value={actualGold} indicatorClassName="bg-amber-500" />
          </div>
        </div>
      </Panel>

      {/* 2. Asset Class Return % Comparison & Concentration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Asset Class Returns Ranking (PillBarChart) */}
        <Panel className="lg:col-span-7 space-y-4">
          <PanelHeader className="mb-1">
            <div>
              <PanelTitle sub="All-time percentage returns across active asset categories">
                Asset Class Return Ranking
              </PanelTitle>
            </div>
          </PanelHeader>

          {assetClassBars.length > 0 ? (
            <div className="pt-2">
              <PillBarChart bars={assetClassBars} height={160} />
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-muted-foreground">No return data recorded.</p>
          )}
        </Panel>

        {/* Concentration & Exposure Cards */}
        <div className="lg:col-span-5 space-y-4">
          {/* Top 5 Concentration */}
          <Panel className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Top 5 Holdings Weight</span>
              <span className="font-extrabold text-primary tnum text-sm">
                {top5ConcentrationPct.toFixed(1)}%
              </span>
            </div>
            <Progress value={top5ConcentrationPct} indicatorClassName="bg-primary" />
            <p className="text-[11px] text-muted-foreground">
              {top5ConcentrationPct > 60
                ? 'High concentration risk: top 5 assets represent more than 60% of total wealth.'
                : 'Well diversified: capital is distributed evenly across multiple holdings.'}
            </p>
          </Panel>

          {/* Currency / Geography & Liquidity split */}
          <div className="grid grid-cols-2 gap-3">
            <Panel className="p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <DollarSign className="h-3.5 w-3.5 text-brand-secondary-ink" />
                <span>Global / USD</span>
              </div>
              <p className="text-xl font-extrabold text-foreground tnum">{globalPct.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">
                Domestic INR: {domesticPct.toFixed(1)}%
              </p>
            </Panel>

            <Panel className="p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                <Unlock className="h-3.5 w-3.5 text-primary" />
                <span>Marketable</span>
              </div>
              <p className="text-xl font-extrabold text-foreground tnum">{liquidPct.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">
                Locked / Statutory: {lockedPct.toFixed(1)}%
              </p>
            </Panel>
          </div>
        </div>
      </div>

      {/* 3. Fixed Income & Passive Yield Intelligence */}
      <Panel className="space-y-4">
        <PanelHeader className="mb-0">
          <div>
            <PanelTitle sub="Annual passive cash flows, tax-free limits, and fixed deposit calendars">
              Fixed Income & Passive Cash-Flow Forecast
            </PanelTitle>
          </div>
        </PanelHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* PPF 80C Meter */}
          <div className="card-surface p-4 rounded-card space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-brand-tertiary-ink" />
                PPF 80C FY Deposit
              </span>
              <span className="text-[10px] text-muted-foreground">Max ₹1.5L</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-foreground tnum">
                {formatVal(ppfAnnualDeposit)}
              </span>
              <span className="text-xs font-bold text-brand-tertiary-ink tnum">
                {ppfProgressPct.toFixed(0)}%
              </span>
            </div>
            <Progress value={ppfProgressPct} indicatorClassName="bg-brand-tertiary" />
            <p className="text-[10px] text-muted-foreground">
              {ppfAnnualDeposit >= ppf80cLimit
                ? '✓ 80C annual cap reached!'
                : `₹${(ppf80cLimit - ppfAnnualDeposit).toLocaleString('en-IN')} remaining before Mar 31`}
            </p>
          </div>

          {/* SGB 2.5% Coupon Schedule */}
          <div className="card-surface p-4 rounded-card space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-brand-quaternary-ink" />
                SGB Annual Coupon
              </span>
              <span className="text-[10px] font-bold text-brand-quaternary-ink">2.5% p.a.</span>
            </div>
            <p className="text-xl font-extrabold text-brand-quaternary-ink tnum">
              {formatVal(sgbAnnualCoupon)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Estimated semi-annual interest credited directly to your bank account from RBI.
            </p>
          </div>

          {/* FD Maturity Summary */}
          <div className="card-surface p-4 rounded-card space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-primary" />
                Fixed Deposit Schedule
              </span>
              <span className="text-[10px] text-muted-foreground">{fdHoldings.length} FDs</span>
            </div>
            {fdHoldings.length > 0 && fdHoldings[0].metadata?.maturity_date ? (
              <div>
                <p className="text-xs font-bold text-foreground truncate">{fdHoldings[0].name}</p>
                <p className="text-[11px] text-primary font-bold mt-0.5">
                  Matures: {formatLocalDate(fdHoldings[0].metadata.maturity_date)}
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">No active fixed deposits found.</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              Compounded quarterly based on contracted bank rates.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
