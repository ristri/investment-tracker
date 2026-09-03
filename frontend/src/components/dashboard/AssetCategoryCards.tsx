import React from 'react';
import { AssetClass, PortfolioSummary, formatINR, formatPercent } from '@investment-tracker/shared';
import {
  TrendingUp,
  Layers,
  Coins,
  Shield,
  FileText,
  Landmark,
  Globe,
  PieChart,
} from 'lucide-react';
import { IconTile, Tone } from '@/components/ui/panel';
import { cn } from '@/lib/utils';

interface AssetCategoryCardsProps {
  summary?: PortfolioSummary;
  onSelectCategory: (category: AssetClass | 'all') => void;
  selectedCategory: AssetClass | 'all';
  isPrivacyMode?: boolean;
}

interface CategoryConfig {
  key: AssetClass;
  title: string;
  subtitle: string;
  icon: any;
  tone: Tone;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'stock',
    title: 'Indian Stocks',
    subtitle: 'Direct Equities',
    icon: TrendingUp,
    tone: 'primary',
  },
  {
    key: 'mutual_fund',
    title: 'Mutual Funds',
    subtitle: 'Active & Index',
    icon: Layers,
    tone: 'secondary',
  },
  {
    key: 'us_stock',
    title: 'US Equities',
    subtitle: 'Global (USD)',
    icon: Globe,
    tone: 'secondary',
  },
  {
    key: 'sgb',
    title: 'Gold & SGB',
    subtitle: 'Sovereign Bonds',
    icon: Coins,
    tone: 'quaternary',
  },
  {
    key: 'etf',
    title: 'Indian ETFs',
    subtitle: 'Exchange Traded',
    icon: PieChart,
    tone: 'primary',
  },
  {
    key: 'epf',
    title: 'EPF (PF)',
    subtitle: 'Retirement Fund',
    icon: Shield,
    tone: 'tertiary',
  },
  {
    key: 'ppf',
    title: 'PPF A/C',
    subtitle: '15-Yr Tax Free',
    icon: FileText,
    tone: 'tertiary',
  },
  {
    key: 'fd',
    title: 'Fixed Deposits',
    subtitle: 'Bank & Corp FDs',
    icon: Landmark,
    tone: 'neutral',
  },
];

export function AssetCategoryCards({
  summary,
  onSelectCategory,
  selectedCategory,
  isPrivacyMode = false,
}: AssetCategoryCardsProps) {
  if (!summary) return null;

  const formatVal = (val: number, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••';
    return formatINR(val, compact);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
          Asset Class Breakdown
        </h3>
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={cn(
            'text-xs font-semibold px-3 py-1 rounded-full border transition-all',
            selectedCategory === 'all'
              ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
              : 'text-muted-foreground border-surface-border hover:text-foreground hover:bg-muted'
          )}
        >
          View All ({summary.holdingCount})
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {CATEGORIES.map((cat) => {
          const data = summary.assetClassBreakdown[cat.key];
          const isSelected = selectedCategory === cat.key;
          const hasHoldings = data && data.count > 0;
          const Icon = cat.icon;

          return (
            <div
              key={cat.key}
              onClick={() => {
                if (hasHoldings) {
                  onSelectCategory(isSelected ? 'all' : cat.key);
                }
              }}
              className={cn(
                'card-surface p-3.5 sm:p-4 rounded-card transition-all relative select-none',
                hasHoldings ? 'cursor-pointer hover:border-primary/50' : 'opacity-55 cursor-default',
                isSelected && 'ring-2 ring-primary border-primary bg-primary/5'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <IconTile icon={Icon} tone={cat.tone} size="sm" />
                {hasHoldings ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground tnum">
                    {data.count} {data.count === 1 ? 'asset' : 'assets'}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-muted-foreground">0 assets</span>
                )}
              </div>

              <div className="mt-3 space-y-0.5">
                <p className="font-bold text-xs sm:text-sm text-foreground truncate">{cat.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{cat.subtitle}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-surface-border/70 flex items-end justify-between gap-1">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    Valuation
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-foreground tracking-tight tnum truncate">
                    {hasHoldings ? formatVal(data.current, true) : '₹0'}
                  </p>
                </div>

                {hasHoldings && data.allocationPercent > 0 && (
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-primary tnum">
                      {data.allocationPercent.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
