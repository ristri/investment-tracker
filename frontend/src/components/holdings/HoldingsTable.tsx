import React, { useState, useMemo } from 'react';
import {
  Holding,
  AssetClass,
  formatINR,
  formatUSD,
  formatPercent,
  isMaturedFD,
  getHoldingLiveValue,
  getHoldingPriceUpdateInfo,
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
  Download,
  Activity,
  Plus,
} from 'lucide-react';
import { PpfManagerModal } from './PpfManagerModal';
import { HoldingDetailModal } from './HoldingDetailModal';
import { Panel, PanelHeader, PanelTitle, IconTile, Tone } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HoldingsTableProps {
  holdings: Holding[];
  selectedCategory: AssetClass | 'all';
  onSelectCategory: (category: AssetClass | 'all') => void;
  onDeleteHolding: (id: number) => void;
  isPrivacyMode?: boolean;
}

const ASSET_ICONS: Record<AssetClass, any> = {
  stock: TrendingUp,
  mutual_fund: Layers,
  us_stock: Globe,
  sgb: Coins,
  etf: PieChart,
  epf: Shield,
  ppf: FileText,
  fd: Landmark,
};

const ASSET_TONES: Record<AssetClass, Tone> = {
  stock: 'primary',
  mutual_fund: 'secondary',
  us_stock: 'secondary',
  sgb: 'quaternary',
  etf: 'primary',
  epf: 'tertiary',
  ppf: 'tertiary',
  fd: 'neutral',
};

const ASSET_LABELS: Record<AssetClass, string> = {
  stock: 'Stocks',
  mutual_fund: 'Mutual Funds',
  us_stock: 'US Equities',
  sgb: 'Gold / SGB',
  etf: 'ETFs',
  epf: 'EPF',
  ppf: 'PPF',
  fd: 'Fixed Deposits',
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

  // Export portfolio to CSV
  const handleExportCSV = () => {
    if (holdings.length === 0) {
      toast.error('No holdings to export');
      return;
    }

    const headers = ['Asset Class', 'Name', 'Symbol', 'ISIN', 'Quantity', 'Avg Buy Price', 'Invested Amount', 'Current Value', 'P&L', 'P&L %'];
    const rows = filteredHoldings.map((h) => {
      const { currentValue, pnl, pnlPercent } = getHoldingLiveValue(h);
      return [
        h.asset_class,
        `"${h.name.replace(/"/g, '""')}"`,
        h.symbol || '',
        h.isin || '',
        h.quantity,
        h.avg_buy_price,
        h.invested_amount,
        currentValue,
        pnl,
        `${pnlPercent.toFixed(2)}%`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `artha-portfolio-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Portfolio exported to CSV');
  };

  return (
    <Panel className="space-y-4">
      {/* Search & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by scrip, US ticker (VOO), scheme, ISIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/60 border border-surface-border rounded-tile pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Category Pills using Radix Tabs style */}
      <div className="overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            type="button"
            onClick={() => onSelectCategory('all')}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-tile whitespace-nowrap transition-all border',
              selectedCategory === 'all'
                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                : 'bg-card border-surface-border text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            All Assets ({holdings.length})
          </button>
          {(['stock', 'mutual_fund', 'us_stock', 'sgb', 'etf', 'epf', 'ppf', 'fd'] as AssetClass[]).map((ac) => {
            const count = holdings.filter((h) => h.asset_class === ac).length;
            if (count === 0 && selectedCategory !== ac) return null;
            return (
              <button
                key={ac}
                type="button"
                onClick={() => onSelectCategory(ac)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-tile whitespace-nowrap transition-all border',
                  selectedCategory === ac
                    ? 'bg-primary text-primary-foreground border-primary font-bold shadow-sm'
                    : 'bg-card border-surface-border text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {ASSET_LABELS[ac] || ac} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. MOBILE CARDS VIEW */}
      <div className="block md:hidden space-y-2.5">
        {filteredHoldings.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            No holdings found matching the criteria.
          </div>
        ) : (
          filteredHoldings.map((h) => {
            const { currentValue, pnl, pnlPercent, isMatured } = getHoldingLiveValue(h);
            const priceInfo = getHoldingPriceUpdateInfo(h);
            const isProfit = pnl >= 0;
            const Icon = ASSET_ICONS[h.asset_class] || TrendingUp;
            const tone = ASSET_TONES[h.asset_class] || 'neutral';

            return (
              <div
                key={h.id}
                onClick={() => setSelectedHoldingInfo(h)}
                className={cn(
                  'card-surface p-3.5 space-y-2.5 transition-all cursor-pointer hover:border-primary/40',
                  isMatured && 'opacity-60'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <IconTile icon={Icon} tone={tone} size="sm" />
                    <div className="min-w-0">
                      <p className="font-bold text-foreground text-xs truncate">{h.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                        <span className="font-semibold">{ASSET_LABELS[h.asset_class] || h.asset_class}</span>
                        {h.symbol && <span className="font-mono text-foreground font-semibold">• {h.symbol}</span>}
                        {priceInfo.isMarketRate && (
                          <span className="flex items-center gap-1 text-[10px]">
                            • <span className={cn('h-1.5 w-1.5 rounded-full', priceInfo.staleness === 'fresh' ? 'bg-emerald-500' : 'bg-amber-500')} />
                            {priceInfo.relativeTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 tnum">
                    <p className="font-extrabold text-foreground text-sm">{formatVal(currentValue)}</p>
                    <p className={cn('text-[10px] font-bold', isProfit ? 'text-emerald-500' : 'text-destructive')}>
                      {isProfit ? '+' : ''}{formatPercent(pnlPercent)}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-surface-border/70 flex items-center justify-between text-[11px] text-muted-foreground tnum">
                  <span>Qty: {h.quantity.toLocaleString('en-IN')}</span>
                  <span>Invested: {formatVal(h.invested_amount)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 2. DESKTOP RICH TABLE */}
      <div className="hidden md:block overflow-x-auto rounded-card border border-surface-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-muted/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider border-b border-surface-border">
            <tr>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Asset / Instrument</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              <th className="py-3 px-3">Class</th>

              <th className="py-3 px-3 text-right">Qty</th>

              <th
                onClick={() => handleSort('invested')}
                className="py-3 px-4 text-right cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Invested</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              <th
                onClick={() => handleSort('value')}
                className="py-3 px-4 text-right cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Current Value</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              <th
                onClick={() => handleSort('gain')}
                className="py-3 px-4 text-right cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Returns (P&L)</span>
                  <ArrowUpDown className="h-3 w-3" />
                </div>
              </th>

              <th className="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-surface-border/60 font-medium">
            {filteredHoldings.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                  No assets found matching the search or category filter.
                </td>
              </tr>
            ) : (
              filteredHoldings.map((h) => {
                const { currentValue, pnl, pnlPercent, isMatured } = getHoldingLiveValue(h);
                const priceInfo = getHoldingPriceUpdateInfo(h);
                const isProfit = pnl >= 0;
                const Icon = ASSET_ICONS[h.asset_class] || TrendingUp;
                const tone = ASSET_TONES[h.asset_class] || 'neutral';

                return (
                  <tr
                    key={h.id}
                    onClick={() => setSelectedHoldingInfo(h)}
                    className={cn(
                      'hover:bg-muted/40 transition-colors cursor-pointer group',
                      isMatured && 'opacity-60'
                    )}
                  >
                    {/* Name & Symbol */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <IconTile icon={Icon} tone={tone} size="sm" />
                        <div className="min-w-0 max-w-xs lg:max-w-sm">
                          <p className="font-bold text-foreground truncate">{h.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                            {h.symbol && <span className="font-mono text-foreground font-semibold">{h.symbol}</span>}
                            {h.institution && <span>• {h.institution}</span>}
                            {priceInfo.isMarketRate && (
                              <span className="flex items-center gap-1">
                                • <span className={cn('h-1.5 w-1.5 rounded-full', priceInfo.staleness === 'fresh' ? 'bg-emerald-500' : 'bg-amber-500')} />
                                {priceInfo.relativeTime}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Class */}
                    <td className="py-3 px-3">
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {ASSET_LABELS[h.asset_class] || h.asset_class}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-3 text-right font-mono text-foreground tnum">
                      {h.quantity.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                    </td>

                    {/* Invested */}
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground tnum">
                      {formatVal(h.invested_amount)}
                    </td>

                    {/* Current Value */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-foreground tnum">
                      {formatVal(currentValue)}
                    </td>

                    {/* P&L */}
                    <td className="py-3 px-4 text-right font-mono tnum">
                      <div className={cn('font-bold', isProfit ? 'text-emerald-500' : 'text-destructive')}>
                        {isProfit ? '+' : ''}{formatVal(pnl)}
                      </div>
                      <div className={cn('text-[10px] font-semibold', isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                        {formatPercent(pnlPercent)}
                      </div>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3 px-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          if (confirm(`Delete asset "${h.name}"?`)) {
                            onDeleteHolding(h.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                        title="Delete Asset"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Holding Detail Modal */}
      <HoldingDetailModal
        holding={selectedHoldingInfo}
        isOpen={Boolean(selectedHoldingInfo)}
        onClose={() => setSelectedHoldingInfo(null)}
        onDeleteHolding={onDeleteHolding}
        onOpenPpfManager={(h) => setSelectedPpfHolding(h)}
        isPrivacyMode={isPrivacyMode}
      />

      {/* PPF Ledger Manager Modal */}
      <PpfManagerModal
        holding={selectedPpfHolding}
        isOpen={Boolean(selectedPpfHolding)}
        onClose={() => setSelectedPpfHolding(null)}
      />
    </Panel>
  );
}
