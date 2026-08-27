import React, { useState, useMemo } from 'react';
import {
  Holding,
  AssetClass,
  formatINR,
  formatUSD,
  formatPercent,
  isMaturedFD,
  getHoldingLiveValue,
  formatLocalDate,
} from '@investment-tracker/shared';
import {
  Search,
  ArrowUpDown,
  Trash2,
  ExternalLink,
  Shield,
  Coins,
  Layers,
  TrendingUp,
  FileText,
  Landmark,
  Globe,
  PieChart,
  Info,
  BookOpen,
} from 'lucide-react';
import { PpfManagerModal } from './PpfManagerModal';

interface HoldingsTableProps {
  holdings: Holding[];
  selectedCategory: AssetClass | 'all';
  onSelectCategory: (category: AssetClass | 'all') => void;
  onDeleteHolding: (id: number) => void;
  isPrivacyMode?: boolean;
}

const ASSET_ICONS: Record<AssetClass, React.ComponentType<{ className?: string }>> = {
  stock: TrendingUp,
  mutual_fund: Layers,
  us_stock: Globe,
  sgb: Coins,
  etf: PieChart,
  epf: Shield,
  ppf: FileText,
  fd: Landmark,
};

const ASSET_BADGES: Record<AssetClass, { label: string; bg: string; text: string; border: string }> = {
  stock: { label: 'Indian Stock', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  mutual_fund: { label: 'Mutual Fund', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  us_stock: { label: 'US Stock', bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20' },
  sgb: { label: 'SGB', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  etf: { label: 'ETF', bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  epf: { label: 'EPF', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  ppf: { label: 'PPF', bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  fd: { label: 'FD', bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
};

type SortField = 'value' | 'invested' | 'gain' | 'gainPercent' | 'name';

export function HoldingsTable({
  holdings,
  selectedCategory,
  onSelectCategory,
  onDeleteHolding,
  isPrivacyMode = false,
}: HoldingsTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('value');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedHoldingInfo, setSelectedHoldingInfo] = useState<Holding | null>(null);
  const [selectedPpfHolding, setSelectedPpfHolding] = useState<Holding | null>(null);

  const formatVal = (val: number | null | undefined, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••';
    return formatINR(val, compact);
  };

  const filteredHoldings = useMemo(() => {
    return holdings
      .filter((h) => {
        if (selectedCategory !== 'all' && h.asset_class !== selectedCategory) {
          return false;
        }
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          h.name.toLowerCase().includes(q) ||
          (h.symbol && h.symbol.toLowerCase().includes(q)) ||
          (h.isin && h.isin.toLowerCase().includes(q)) ||
          (h.institution && h.institution.toLowerCase().includes(q)) ||
          (h.category && h.category.toLowerCase().includes(q)) ||
          (h.sub_category && h.sub_category.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const { currentValue: valA, pnl: gainA, pnlPercent: gainPctA } = getHoldingLiveValue(a);
        const { currentValue: valB, pnl: gainB, pnlPercent: gainPctB } = getHoldingLiveValue(b);

        let diff = 0;
        switch (sortField) {
          case 'value':
            diff = valB - valA;
            break;
          case 'invested':
            diff = b.invested_amount - a.invested_amount;
            break;
          case 'gain':
            diff = gainB - gainA;
            break;
          case 'gainPercent':
            diff = gainPctB - gainPctA;
            break;
          case 'name':
            diff = a.name.localeCompare(b.name);
            break;
        }
        return sortAsc ? -diff : diff;
      });
  }, [holdings, selectedCategory, search, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="rounded-3xl bg-zinc-900/90 border border-zinc-800/80 p-4 sm:p-6 shadow-xl space-y-4">
      
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by scrip, US ticker (VOO, QQQM), scheme, ISIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal Scroll on Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All ({holdings.length})
          </button>
          {(['stock', 'mutual_fund', 'us_stock', 'sgb', 'etf', 'epf', 'ppf', 'fd'] as AssetClass[]).map((ac) => {
            const count = holdings.filter((h) => h.asset_class === ac).length;
            if (count === 0 && selectedCategory !== ac) return null;
            return (
              <button
                key={ac}
                onClick={() => onSelectCategory(ac)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  selectedCategory === ac
                    ? 'bg-zinc-700 text-white shadow-sm'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                {ASSET_BADGES[ac]?.label || ac} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. MOBILE CARDS VIEW (Displayed on phones) */}
      <div className="block md:hidden space-y-3">
        {filteredHoldings.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No holdings found matching the criteria.
          </div>
        ) : (
          filteredHoldings.map((h) => {
            const { currentValue: currentVal, pnl, pnlPercent: pnlPct, isMatured } = getHoldingLiveValue(h);
            const isProfit = pnl >= 0;
            const Icon = ASSET_ICONS[h.asset_class] || TrendingUp;
            const badge = ASSET_BADGES[h.asset_class] || { label: h.asset_class, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };

            return (
              <div
                key={h.id}
                className={`bg-zinc-950/80 border rounded-2xl p-4 space-y-3 shadow-md ${
                  isMatured ? 'border-zinc-800 opacity-60' : 'border-zinc-800/90'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl ${badge.bg} ${badge.text} flex-shrink-0 mt-0.5`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate">{h.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mt-0.5">
                        <span className={`px-1.5 py-0.2 rounded border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                        {isMatured && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-semibold">
                            Matured
                          </span>
                        )}
                        {h.sub_category && <span className="truncate">• {h.sub_category}</span>}
                        {h.metadata?.price_usd && (
                          <span className="text-sky-400 font-mono font-semibold">
                            • {formatUSD(h.metadata.price_usd)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {h.asset_class === 'ppf' && (
                      <button
                        onClick={() => setSelectedPpfHolding(h)}
                        title="Manage PPF Passbook & Deposits"
                        className="px-2 py-1 rounded-lg bg-pink-500/10 text-pink-400 hover:text-pink-300 border border-pink-500/20 text-[11px] font-semibold flex items-center gap-1 shadow-sm"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Passbook</span>
                      </button>
                    )}
                    {h.metadata && (
                      <button
                        onClick={() => setSelectedHoldingInfo(h)}
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                        title="View Holding Details"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Remove "${h.name}"?`)) {
                          onDeleteHolding(h.id);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-zinc-900 text-zinc-500 hover:text-rose-400 border border-zinc-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Current Value</span>
                    {isMatured ? (
                      <div>
                        <p className="font-bold text-zinc-500 font-mono">{formatVal(0)}</p>
                        <p className="text-[10px] text-zinc-500 italic">Matured (Excluded)</p>
                      </div>
                    ) : (
                      <>
                        <p className="font-extrabold text-white font-mono">{formatVal(currentVal)}</p>
                        {h.metadata?.value_usd ? (
                          <p className="text-[10px] text-sky-400 font-mono">{formatUSD(h.metadata.value_usd)} USD</p>
                        ) : (
                          <p className="text-[10px] text-zinc-400">Inv: {formatVal(h.invested_amount)}</p>
                        )}
                      </>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total Returns</span>
                    {isMatured ? (
                      <div>
                        <p className="font-bold text-zinc-500 font-mono">Paid Out</p>
                        <p className="text-[10px] text-zinc-500">Matured</p>
                      </div>
                    ) : (
                      <>
                        <p className={`font-extrabold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatVal(pnl)}
                        </p>
                        <p className={`text-[10px] font-semibold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatPercent(pnlPct)}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP TABLE VIEW (Displayed on tablets/desktops) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/90 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-zinc-800">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>Asset / Holding</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3.5 px-3">Class</th>
              <th className="py-3.5 px-3 text-right">Qty / Units</th>
              <th
                onClick={() => handleSort('invested')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Invested</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('value')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Current Value</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('gain')}
                className="py-3.5 px-4 text-right cursor-pointer hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Returns (P&L)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>
              <th className="py-3.5 px-3 text-center">Source</th>
              <th className="py-3.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-medium">
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-500">
                  No holdings found matching the criteria.
                </td>
              </tr>
            ) : (
              filteredHoldings.map((h) => {
                const { currentValue: currentVal, pnl, pnlPercent: pnlPct, isMatured } = getHoldingLiveValue(h);
                const isProfit = pnl >= 0;
                const Icon = ASSET_ICONS[h.asset_class] || TrendingUp;
                const badge = ASSET_BADGES[h.asset_class] || { label: h.asset_class, bg: 'bg-zinc-800', text: 'text-zinc-300', border: 'border-zinc-700' };

                return (
                  <tr key={h.id} className={`hover:bg-zinc-800/40 transition-colors group ${isMatured ? 'opacity-50' : ''}`}>
                    {/* Name & Subtype */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${badge.bg} ${badge.text} flex-shrink-0`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="max-w-xs lg:max-w-md truncate">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-white truncate">{h.name}</p>
                            {isMatured && (
                              <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-semibold">
                                Matured
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                            {h.sub_category && (
                              <span className="truncate">{h.sub_category}</span>
                            )}
                            {h.institution && (
                              <span className="text-zinc-500 truncate">• {h.institution}</span>
                            )}
                            {h.isin && (
                              <span className="font-mono text-[10px] text-zinc-500 hidden xl:inline">
                                • {h.isin}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Asset Class */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-3 text-right font-mono text-zinc-300">
                      {h.quantity > 0 ? (
                        <div>
                          <div>{h.quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</div>
                          {h.metadata?.price_usd ? (
                            <div className="text-[10px] text-sky-400 font-sans font-semibold">
                              @ {formatUSD(h.metadata.price_usd)}
                            </div>
                          ) : h.avg_buy_price > 0 ? (
                            <div className="text-[10px] text-zinc-500 font-sans">
                              @ ₹{h.avg_buy_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Invested */}
                    <td className="py-3.5 px-4 text-right font-mono text-zinc-200">
                      <div>{formatVal(h.invested_amount)}</div>
                      {h.metadata?.invested_usd && (
                        <div className="text-[10px] text-zinc-400 font-sans">
                          {formatUSD(h.metadata.invested_usd)}
                        </div>
                      )}
                    </td>

                    {/* Current Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                      {isMatured ? (
                        <div>
                          <div className="text-zinc-500 font-normal">{formatVal(0)}</div>
                          <div className="text-[10px] text-zinc-500 font-sans font-normal italic">
                            Matured (Excluded)
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>{formatVal(currentVal)}</div>
                          {h.metadata?.value_usd ? (
                            <div className="text-[10px] text-sky-400 font-sans font-semibold">
                              {formatUSD(h.metadata.value_usd)}
                            </div>
                          ) : h.live_price && h.live_price !== h.avg_buy_price ? (
                            <div className="text-[10px] text-zinc-400 font-sans">
                              LTP: ₹{h.live_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                          ) : null}
                        </>
                      )}
                    </td>

                    {/* Returns */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {isMatured ? (
                        <div className="text-zinc-500 text-[11px] font-sans">Paid Out</div>
                      ) : (
                        <>
                          <div className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatVal(pnl)}
                          </div>
                          <div className={`text-[11px] ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPercent(pnlPct)}
                            {h.xirr !== null && h.xirr !== undefined && (
                              <span className="text-zinc-400 font-sans ml-1 text-[10px]">
                                ({h.xirr.toFixed(1)}% XIRR)
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </td>

                    {/* Source */}
                    <td className="py-3.5 px-3 text-center">
                      <span className="text-[10px] text-zinc-400 capitalize px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
                        {h.source.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {h.asset_class === 'ppf' && (
                          <button
                            onClick={() => setSelectedPpfHolding(h)}
                            title="Manage PPF Passbook & Deposits"
                            className="p-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/20 transition-colors"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {h.metadata && (
                          <button
                            onClick={() => setSelectedHoldingInfo(h)}
                            title="View Asset Details"
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <Info className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm(`Remove "${h.name}" from your portfolio?`)) {
                              onDeleteHolding(h.id);
                            }
                          }}
                          title="Delete holding"
                          className="p-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal / Bottom Sheet */}
      {selectedHoldingInfo && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
          <div className={`bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full p-6 space-y-4 shadow-2xl my-0 sm:my-8 max-h-[85vh] overflow-y-auto ${selectedHoldingInfo.metadata?.monthly_transactions?.length ? 'max-w-3xl' : 'max-w-md'}`}>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h4 className="font-bold text-base text-white">{selectedHoldingInfo.name}</h4>
                <p className="text-xs text-zinc-400 capitalize">{selectedHoldingInfo.asset_class.replace('_', ' ')} Details</p>
              </div>
              <button
                onClick={() => setSelectedHoldingInfo(null)}
                className="text-zinc-400 hover:text-white text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-medium"
              >
                Close
              </button>
            </div>

            {/* General Metadata */}
            <div className="text-xs space-y-2 text-zinc-300">
              {/* US Stock details */}
              {selectedHoldingInfo.asset_class === 'us_stock' && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold">USD Valuation</span>
                      <p className="text-sm font-bold text-sky-400 font-mono mt-0.5">
                        {formatUSD(selectedHoldingInfo.metadata?.value_usd)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold">Exchange Rate</span>
                      <p className="text-sm font-bold text-white font-mono mt-0.5">
                        ₹{selectedHoldingInfo.metadata?.usd_inr_rate || 88.0} / USD
                      </p>
                    </div>
                  </div>
                  {selectedHoldingInfo.metadata?.broker_name && (
                    <p>US Custodian / Broker: <span className="text-white font-semibold">{selectedHoldingInfo.metadata.broker_name}</span></p>
                  )}
                  {selectedHoldingInfo.metadata?.holding_since && (
                    <p>Holding Since: <span className="text-zinc-400">{selectedHoldingInfo.metadata.holding_since}</span></p>
                  )}
                </div>
              )}

              {selectedHoldingInfo.metadata?.issue_series && (
                <p>Series: <span className="text-white font-mono font-semibold">{selectedHoldingInfo.metadata.issue_series}</span></p>
              )}
              {selectedHoldingInfo.metadata?.coupon_rate && (
                <p>Annual Coupon Rate: <span className="text-emerald-400 font-bold">{selectedHoldingInfo.metadata.coupon_rate}%</span></p>
              )}
              {selectedHoldingInfo.metadata?.maturity_date && (
                <p>Maturity Date: <span className="text-amber-400 font-mono">{formatLocalDate(selectedHoldingInfo.metadata.maturity_date)}</span></p>
              )}

              {/* EPF Summary Badges */}
              {selectedHoldingInfo.asset_class === 'epf' && (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    {selectedHoldingInfo.metadata?.uan && (
                      <span className="bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                        UAN: <strong className="text-white font-mono">{selectedHoldingInfo.metadata.uan}</strong>
                      </span>
                    )}
                    {selectedHoldingInfo.metadata?.member_id && (
                      <span className="bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                        Member ID: <strong className="text-white font-mono">{selectedHoldingInfo.metadata.member_id}</strong>
                      </span>
                    )}
                    {selectedHoldingInfo.metadata?.financial_years_covered && selectedHoldingInfo.metadata.financial_years_covered.length > 0 && (
                      <span className="bg-purple-500/10 text-purple-300 px-2.5 py-1 rounded-lg border border-purple-500/20 font-semibold">
                        FYs: {selectedHoldingInfo.metadata.financial_years_covered.join(', ')}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold">Employee Share</span>
                      <p className="text-sm font-bold text-white font-mono mt-0.5">
                        {formatINR(selectedHoldingInfo.metadata?.employee_share ?? selectedHoldingInfo.invested_amount)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold">Employer Share</span>
                      <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                        {formatINR(selectedHoldingInfo.metadata?.employer_share ?? selectedHoldingInfo.unrealized_pnl)}
                      </p>
                    </div>
                    <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold">EPS Pension Fund</span>
                      <p className="text-sm font-bold text-purple-400 font-mono mt-0.5">
                        {formatINR(selectedHoldingInfo.metadata?.pension_share ?? 0)}
                      </p>
                    </div>
                  </div>

                  {/* Monthly Transactions Breakdown */}
                  {selectedHoldingInfo.metadata?.monthly_transactions && selectedHoldingInfo.metadata.monthly_transactions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-xs">
                          Monthly Contribution History ({selectedHoldingInfo.metadata.monthly_transactions.length} months)
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-800">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-zinc-950 text-zinc-400 font-semibold sticky top-0 border-b border-zinc-800">
                            <tr>
                              <th className="py-2 px-3">Wage Month</th>
                              <th className="py-2 px-2">Date</th>
                              <th className="py-2 px-2 text-right">EPF Wages</th>
                              <th className="py-2 px-3 text-right">Employee (₹)</th>
                              <th className="py-2 px-3 text-right">Employer (₹)</th>
                              <th className="py-2 px-3 text-right">Pension (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                            {selectedHoldingInfo.metadata.monthly_transactions.map((tx, i) => (
                              <tr key={i} className="hover:bg-zinc-800/30">
                                <td className="py-2 px-3 font-semibold text-white">{tx.wage_month}</td>
                                <td className="py-2 px-2 text-zinc-400 font-sans text-[10px]">{tx.transaction_date || '-'}</td>
                                <td className="py-2 px-2 text-right text-zinc-400">{tx.epf_wages ? formatINR(tx.epf_wages) : '-'}</td>
                                <td className="py-2 px-3 text-right text-zinc-100 font-bold">{formatINR(tx.employee_share)}</td>
                                <td className="py-2 px-3 text-right text-emerald-400">{formatINR(tx.employer_share)}</td>
                                <td className="py-2 px-3 text-right text-purple-400">{formatINR(tx.pension_share)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedHoldingInfo.metadata?.interest_rate && selectedHoldingInfo.asset_class !== 'epf' && (
                <p>Interest Rate: <span className="text-emerald-400 font-bold">{selectedHoldingInfo.metadata.interest_rate}%</span></p>
              )}
              {selectedHoldingInfo.metadata?.compounding_frequency && (
                <p>Compounding: <span className="text-white capitalize">{selectedHoldingInfo.metadata.compounding_frequency}</span></p>
              )}
              {selectedHoldingInfo.metadata?.maturity_amount && (
                <p>Maturity Value: <span className="text-emerald-400 font-bold">{formatINR(selectedHoldingInfo.metadata.maturity_amount)}</span></p>
              )}

              {/* PPF Passbook Action in Details Modal */}
              {selectedHoldingInfo.asset_class === 'ppf' && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSelectedPpfHolding(selectedHoldingInfo);
                      setSelectedHoldingInfo(null);
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-900/30 transition-all flex items-center justify-center gap-2"
                  >
                    <BookOpen className="h-4 w-4" />
                    <span>Open PPF Passbook & Log Transactions</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dedicated PPF Passbook & Transaction Manager Modal */}
      {selectedPpfHolding && (
        <PpfManagerModal
          isOpen={!!selectedPpfHolding}
          holding={holdings.find((h) => h.id === selectedPpfHolding.id) || selectedPpfHolding}
          onClose={() => setSelectedPpfHolding(null)}
        />
      )}
    </div>
  );
}
