import React from 'react';
import { Holding, formatINR, formatPercent, getHoldingLiveValue } from '@investment-tracker/shared';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Panel, PanelHeader, PanelTitle } from '@/components/ui/panel';
import { cn } from '@/lib/utils';

interface TopMoversCardProps {
  holdings: Holding[];
  onSelectHolding: (h: Holding) => void;
  isPrivacyMode?: boolean;
}

export function TopMoversCard({
  holdings,
  onSelectHolding,
  isPrivacyMode = false,
}: TopMoversCardProps) {
  if (holdings.length === 0) return null;

  const evaluated = holdings.map((h) => ({
    holding: h,
    ...getHoldingLiveValue(h),
  }));

  const gainers = [...evaluated]
    .filter((e) => e.pnl > 0)
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 3);

  const laggers = [...evaluated]
    .filter((e) => e.pnl < 0)
    .sort((a, b) => a.pnl - b.pnl)
    .slice(0, 3);

  if (gainers.length === 0 && laggers.length === 0) return null;

  const formatVal = (val: number) => {
    if (isPrivacyMode) return '₹ ••••••';
    return formatINR(val, true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Top Gainers */}
      <Panel className="p-4 sm:p-5">
        <PanelHeader className="mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </span>
            <PanelTitle>Top Profit Contributors</PanelTitle>
          </div>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Unrealized Gain</span>
        </PanelHeader>

        <div className="divide-y divide-surface-border/60">
          {gainers.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">No profitable holdings yet.</p>
          ) : (
            gainers.map(({ holding, currentValue, pnl, pnlPercent }) => (
              <div
                key={holding.id}
                onClick={() => onSelectHolding(holding)}
                className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2 rounded-tile transition-colors cursor-pointer text-xs"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-bold text-foreground truncate">{holding.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {holding.symbol || holding.category || holding.asset_class.replace('_', ' ')}
                  </p>
                </div>

                <div className="text-right shrink-0 tnum">
                  <p className="font-bold text-emerald-500 flex items-center justify-end gap-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                    +{formatVal(pnl)}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatPercent(pnlPercent)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>

      {/* Top Laggers */}
      <Panel className="p-4 sm:p-5">
        <PanelHeader className="mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <TrendingDown className="h-4 w-4" />
            </span>
            <PanelTitle>Underperforming Scrips</PanelTitle>
          </div>
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Unrealized Loss</span>
        </PanelHeader>

        <div className="divide-y divide-surface-border/60">
          {laggers.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Great portfolio health! Zero loss-making holdings.
            </p>
          ) : (
            laggers.map(({ holding, currentValue, pnl, pnlPercent }) => (
              <div
                key={holding.id}
                onClick={() => onSelectHolding(holding)}
                className="flex items-center justify-between py-2.5 hover:bg-muted/40 px-2 rounded-tile transition-colors cursor-pointer text-xs"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-bold text-foreground truncate">{holding.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {holding.symbol || holding.category || holding.asset_class.replace('_', ' ')}
                  </p>
                </div>

                <div className="text-right shrink-0 tnum">
                  <p className="font-bold text-destructive flex items-center justify-end gap-0.5">
                    <ArrowDownRight className="h-3 w-3" />
                    {formatVal(pnl)}
                  </p>
                  <p className="text-[10px] font-semibold text-destructive">
                    {formatPercent(pnlPercent)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
