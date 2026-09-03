import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  LayoutDashboard,
  Layers,
  BarChart3,
  Target,
  Plus,
  UploadCloud,
  Camera,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Download,
  TrendingUp,
  Globe,
  Coins,
  Shield,
  FileText,
  Landmark,
  PieChart,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Holding, AssetClass, formatINR, formatPercent, getHoldingLiveValue } from '@investment-tracker/shared';
import { TabType } from './layout/Sidebar';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  holdings: Holding[];
  onSelectHolding: (h: Holding) => void;
  onNavigate: (tab: TabType) => void;
  onOpenImportModal: () => void;
  onOpenAddModal: () => void;
  onOpenSnapshotModal: () => void;
  onTogglePrivacy: () => void;
  onToggleTheme: () => void;
  onExportData: () => void;
  onRefreshPrices: () => void;
  isPrivacyMode: boolean;
  isDark: boolean;
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

export function CommandPalette({
  open,
  onClose,
  holdings,
  onSelectHolding,
  onNavigate,
  onOpenImportModal,
  onOpenAddModal,
  onOpenSnapshotModal,
  onTogglePrivacy,
  onToggleTheme,
  onExportData,
  onRefreshPrices,
  isPrivacyMode,
  isDark,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // 1. Matched Holdings
  const matchedHoldings = useMemo(() => {
    if (!query.trim()) return holdings.slice(0, 5);
    const q = query.toLowerCase();
    return holdings
      .filter((h) => {
        return (
          h.name.toLowerCase().includes(q) ||
          (h.symbol && h.symbol.toLowerCase().includes(q)) ||
          (h.isin && h.isin.toLowerCase().includes(q)) ||
          (h.category && h.category.toLowerCase().includes(q)) ||
          (h.institution && h.institution.toLowerCase().includes(q))
        );
      })
      .slice(0, 6);
  }, [holdings, query]);

  // 2. Navigation items
  const navActions = useMemo(() => {
    const items = [
      { id: 'nav-dashboard', label: 'Go to Dashboard', tab: 'dashboard' as TabType, icon: LayoutDashboard },
      { id: 'nav-holdings', label: 'Go to Holdings', tab: 'holdings' as TabType, icon: Layers },
      { id: 'nav-analytics', label: 'Go to Portfolio Intelligence', tab: 'analytics' as TabType, icon: BarChart3 },
      { id: 'nav-snapshots', label: 'Go to Milestones', tab: 'snapshots' as TabType, icon: Target },
    ];
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  // 3. Quick Actions
  const quickActions = useMemo(() => {
    const actions = [
      { id: 'act-import', label: 'Import Statement (Groww / EPFO / US Stocks)', icon: UploadCloud, perform: onOpenImportModal },
      { id: 'act-add', label: 'Add Manual Asset (SGB, PPF, FD, Stocks)', icon: Plus, perform: onOpenAddModal },
      { id: 'act-snapshot', label: 'Capture Portfolio Milestone Snapshot', icon: Camera, perform: onOpenSnapshotModal },
      { id: 'act-refresh', label: 'Refresh Live Market Prices (NSE/AMFI/US)', icon: RefreshCw, perform: onRefreshPrices },
      { id: 'act-export', label: 'Export Portfolio Data (CSV / JSON)', icon: Download, perform: onExportData },
      { id: 'act-privacy', label: isPrivacyMode ? 'Disable Privacy Mode (Show Figures)' : 'Enable Privacy Mode (Mask Figures)', icon: isPrivacyMode ? Eye : EyeOff, perform: onTogglePrivacy },
      { id: 'act-theme', label: isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme', icon: isDark ? Sun : Moon, perform: onToggleTheme },
    ];
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [query, isPrivacyMode, isDark, onOpenImportModal, onOpenAddModal, onOpenSnapshotModal, onRefreshPrices, onExportData, onTogglePrivacy, onToggleTheme]);

  // Flatten items for arrow key selection
  const flatItems = useMemo(() => {
    const items: Array<{ type: 'holding' | 'nav' | 'action'; data: any }> = [];
    matchedHoldings.forEach((h) => items.push({ type: 'holding', data: h }));
    navActions.forEach((n) => items.push({ type: 'nav', data: n }));
    quickActions.forEach((a) => items.push({ type: 'action', data: a }));
    return items;
  }, [matchedHoldings, navActions, quickActions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = flatItems[selectedIndex];
      if (!item) return;

      if (item.type === 'holding') {
        onClose();
        onSelectHolding(item.data);
      } else if (item.type === 'nav') {
        onClose();
        onNavigate(item.data.tab);
      } else if (item.type === 'action') {
        onClose();
        item.data.perform();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 sm:max-w-xl overflow-hidden rounded-card gap-0 border border-surface-border shadow-2xl"
        showCloseButton={false}
      >
        <div className="sr-only">
          <DialogTitle>Command Palette</DialogTitle>
          <DialogDescription>Quickly search holdings, navigate views, or perform actions</DialogDescription>
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-3 border-b border-surface-border px-4 py-3.5 bg-card">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type an asset, action, or command..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="rounded px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
          <kbd className="rounded border border-surface-border bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-surface-border/60 scrollbar-none">
          {flatItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <>
              {/* Group 1: Holdings */}
              {matchedHoldings.length > 0 && (
                <div className="pb-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Holdings ({matchedHoldings.length})
                  </p>
                  <div className="space-y-0.5">
                    {matchedHoldings.map((h, i) => {
                      const itemIndex = i;
                      const isSelected = selectedIndex === itemIndex;
                      const { currentValue, pnl, pnlPercent } = getHoldingLiveValue(h);
                      const isProfit = pnl >= 0;
                      const Icon = ASSET_ICONS[h.asset_class] || TrendingUp;

                      return (
                        <div
                          key={h.id}
                          onClick={() => {
                            onClose();
                            onSelectHolding(h);
                          }}
                          className={cn(
                            'flex items-center justify-between gap-3 px-3 py-2 rounded-tile cursor-pointer transition-colors text-xs',
                            isSelected ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={cn('p-1.5 rounded-lg border', isSelected ? 'bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground' : 'bg-muted text-muted-foreground border-surface-border')}>
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold">{h.name}</p>
                              <p className={cn('text-[10px] truncate', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                                {h.symbol || h.category || h.asset_class.replace('_', ' ')}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 tnum">
                            <p className="font-bold">
                              {isPrivacyMode ? '₹ ••••••' : formatINR(currentValue)}
                            </p>
                            <p className={cn('text-[10px] font-medium', isSelected ? 'text-primary-foreground/90' : isProfit ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold')}>
                              {formatPercent(pnlPercent)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 2: Navigation */}
              {navActions.length > 0 && (
                <div className="py-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Navigation
                  </p>
                  <div className="space-y-0.5">
                    {navActions.map((n, i) => {
                      const itemIndex = matchedHoldings.length + i;
                      const isSelected = selectedIndex === itemIndex;
                      const Icon = n.icon;

                      return (
                        <div
                          key={n.id}
                          onClick={() => {
                            onClose();
                            onNavigate(n.tab);
                          }}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-tile cursor-pointer transition-colors text-xs',
                            isSelected ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{n.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 3: Quick Actions */}
              {quickActions.length > 0 && (
                <div className="pt-2">
                  <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </p>
                  <div className="space-y-0.5">
                    {quickActions.map((a, i) => {
                      const itemIndex = matchedHoldings.length + navActions.length + i;
                      const isSelected = selectedIndex === itemIndex;
                      const Icon = a.icon;

                      return (
                        <div
                          key={a.id}
                          onClick={() => {
                            onClose();
                            a.perform();
                          }}
                          className={cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-tile cursor-pointer transition-colors text-xs',
                            isSelected ? 'bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{a.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-surface-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="hidden sm:inline">Artha Command Palette</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
