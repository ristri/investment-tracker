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
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
  borderColor: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'stock',
    title: 'Indian Stocks',
    subtitle: 'Direct Equities',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20 hover:border-emerald-500/50',
  },
  {
    key: 'mutual_fund',
    title: 'Mutual Funds',
    subtitle: 'Active & Index',
    icon: Layers,
    color: 'text-blue-400',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20 hover:border-blue-500/50',
  },
  {
    key: 'us_stock',
    title: 'US Stocks & ETFs',
    subtitle: 'Global Equities (USD)',
    icon: Globe,
    color: 'text-sky-400',
    bgLight: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20 hover:border-sky-500/50',
  },
  {
    key: 'sgb',
    title: 'Gold & SGB',
    subtitle: 'Sovereign Bonds',
    icon: Coins,
    color: 'text-amber-400',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20 hover:border-amber-500/50',
  },
  {
    key: 'etf',
    title: 'Indian ETFs',
    subtitle: 'Exchange Traded',
    icon: PieChart,
    color: 'text-teal-400',
    bgLight: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20 hover:border-teal-500/50',
  },
  {
    key: 'epf',
    title: 'EPF (PF)',
    subtitle: 'Retirement Fund',
    icon: Shield,
    color: 'text-purple-400',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20 hover:border-purple-500/50',
  },
  {
    key: 'ppf',
    title: 'PPF A/C',
    subtitle: '15-Yr Tax Free',
    icon: FileText,
    color: 'text-pink-400',
    bgLight: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20 hover:border-pink-500/50',
  },
  {
    key: 'fd',
    title: 'Fixed Dep.',
    subtitle: 'Bank & Corp FDs',
    icon: Landmark,
    color: 'text-indigo-400',
    bgLight: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20 hover:border-indigo-500/50',
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
        <h3 className="font-bold text-sm sm:text-base text-white">Asset Class Breakdown</h3>
        <button
          onClick={() => onSelectCategory('all')}
          className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition-all ${
            selectedCategory === 'all'
              ? 'bg-zinc-800 text-white border-zinc-700'
              : 'text-zinc-400 border-transparent hover:text-zinc-200'
          }`}
        >
          View All
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {CATEGORIES.map((cat) => {
          const data = summary.assetClassBreakdown[cat.key];
          const isSelected = selectedCategory === cat.key;
          const Icon = cat.icon;
          const hasHoldings = data && data.count > 0;

          return (
            <button
              key={cat.key}
              onClick={() => onSelectCategory(isSelected ? 'all' : cat.key)}
              className={`text-left rounded-2xl p-3.5 sm:p-4 transition-all border flex flex-col justify-between ${
                isSelected
                  ? `bg-zinc-800/90 ${cat.borderColor} ring-1 ring-emerald-500/40 shadow-lg`
                  : `bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-800/50 ${cat.borderColor}`
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className={`p-1.5 sm:p-2 rounded-xl ${cat.bgLight} ${cat.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-zinc-400">
                    {hasHoldings ? data.count : 0} {data?.count === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">{cat.title}</h4>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 mb-2 sm:mb-3 truncate">{cat.subtitle}</p>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 space-y-0.5">
                <div className="text-sm sm:text-base font-extrabold text-white font-mono truncate">
                  {hasHoldings ? formatVal(data.current) : '₹0.00'}
                </div>
                <div className="flex items-center justify-between text-[10px] sm:text-[11px]">
                  <span className="text-zinc-400 font-mono">
                    {hasHoldings ? `${data.allocationPercent.toFixed(0)}% alloc` : '0%'}
                  </span>
                  {hasHoldings && data.gain !== 0 && (
                    <span className={`font-semibold ${data.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatPercent(data.gainPercent)}
                    </span>
                  )}
                </div>

                {/* Price update staleness for market-rate assets */}
                {data.isMarketRate && hasHoldings && data.priceUpdateInfo && (
                  <div
                    className="mt-2 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[10px] text-zinc-400"
                    title={`Price Last Updated: ${data.priceUpdateInfo.formattedExact} (${data.priceUpdateInfo.sourceLabel})`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                          data.priceUpdateInfo.staleness === 'fresh'
                            ? 'bg-emerald-400 animate-pulse'
                            : data.priceUpdateInfo.staleness === 'moderate'
                            ? 'bg-amber-400'
                            : 'bg-zinc-500'
                        }`}
                      />
                      <span className="text-[10px] text-zinc-400">
                        Price:{' '}
                        <strong className="text-zinc-200 font-medium">
                          {data.priceUpdateInfo.relativeTime}
                        </strong>
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono truncate max-w-[70px]">
                      {data.priceUpdateInfo.sourceLabel.split('/')[0].trim()}
                    </span>
                  </div>
                )}

                {/* Non-market asset classes indicator (EPF, PPF, FD) */}
                {!data.isMarketRate && hasHoldings && (
                  <div className="mt-2 pt-1.5 border-t border-zinc-800/40 flex items-center justify-between text-[10px] text-zinc-500">
                    <span className="text-[10px]">
                      {cat.key === 'fd' ? 'Accrued Daily' : cat.key === 'ppf' ? 'Statutory Fixed' : 'Govt PF Rate'}
                    </span>
                    <span className="text-[9px] text-zinc-600 font-mono">Fixed</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
