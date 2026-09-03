import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Holding,
  formatINR,
  formatUSD,
  formatPercent,
  formatLocalDate,
  getHoldingLiveValue,
  getHoldingPriceUpdateInfo,
} from '@investment-tracker/shared';
import {
  TrendingUp,
  Layers,
  Globe,
  Coins,
  PieChart,
  Shield,
  FileText,
  Landmark,
  Activity,
  Trash2,
  Calendar,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HoldingDetailModalProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteHolding: (id: number) => void;
  onOpenPpfManager?: (h: Holding) => void;
  isPrivacyMode?: boolean;
}

const ASSET_ICONS: Record<string, any> = {
  stock: TrendingUp,
  mutual_fund: Layers,
  us_stock: Globe,
  sgb: Coins,
  etf: PieChart,
  epf: Shield,
  ppf: FileText,
  fd: Landmark,
};

export function HoldingDetailModal({
  holding,
  isOpen,
  onClose,
  onDeleteHolding,
  onOpenPpfManager,
  isPrivacyMode = false,
}: HoldingDetailModalProps) {
  if (!holding) return null;

  const { currentValue, pnl, pnlPercent } = getHoldingLiveValue(holding);
  const priceInfo = getHoldingPriceUpdateInfo(holding);
  const isProfit = pnl >= 0;
  const Icon = ASSET_ICONS[holding.asset_class] || TrendingUp;

  const formatVal = (val: number | null | undefined, compact: boolean = false) => {
    if (isPrivacyMode) return '₹ ••••••';
    return formatINR(val, compact);
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${holding.name}" from your portfolio?`)) {
      onDeleteHolding(holding.id);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <DialogHeader className="gap-2">
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-tile bg-primary/15 text-primary border border-primary/20 shrink-0">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{holding.name}</DialogTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span className="font-bold uppercase text-primary">
                    {holding.asset_class.replace('_', ' ')}
                  </span>
                  {holding.symbol && <span className="font-mono text-foreground font-semibold">• {holding.symbol}</span>}
                  {holding.institution && <span>• {holding.institution}</span>}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Valuation & Return Hero */}
        <div className="card-well p-4 rounded-card space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Current Valuation
              </span>
              <p className="text-xl sm:text-2xl font-extrabold text-foreground tnum mt-0.5">
                {formatVal(currentValue)}
              </p>
              <p className="text-[11px] text-muted-foreground tnum mt-0.5">
                Invested: {formatVal(holding.invested_amount)}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Unrealized Return
              </span>
              <p
                className={cn(
                  'text-xl sm:text-2xl font-extrabold tnum mt-0.5',
                  isProfit ? 'text-emerald-500' : 'text-destructive'
                )}
              >
                {isProfit ? '+' : ''}
                {formatVal(pnl)}
              </p>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tnum mt-0.5',
                  isProfit
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/15 text-destructive'
                )}
              >
                {formatPercent(pnlPercent)} All-Time
              </span>
            </div>
          </div>
        </div>

        {/* Tabs: Metrics, Metadata & Details */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start border-b border-surface-border bg-transparent p-0 rounded-none h-auto gap-4">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-1.5 font-bold"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-1.5 font-bold"
            >
              Asset Specifics
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="card-surface p-3 rounded-tile">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Units / Quantity</span>
                <p className="font-bold text-foreground tnum mt-0.5">{holding.quantity.toLocaleString('en-IN')}</p>
              </div>

              <div className="card-surface p-3 rounded-tile">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Avg Buy Price</span>
                <p className="font-bold text-foreground tnum mt-0.5">{formatVal(holding.avg_buy_price)}</p>
              </div>

              {holding.live_price !== undefined && holding.live_price !== null && (
                <div className="card-surface p-3 rounded-tile">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Live Market Rate</span>
                  <p className="font-bold text-primary tnum mt-0.5">{formatVal(holding.live_price)}</p>
                </div>
              )}

              {holding.isin && (
                <div className="card-surface p-3 rounded-tile">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">ISIN Code</span>
                  <p className="font-mono font-bold text-foreground truncate mt-0.5">{holding.isin}</p>
                </div>
              )}
            </div>

            {/* Price freshness banner */}
            {priceInfo.isMarketRate && (
              <div className="card-surface p-3 rounded-tile flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <div>
                    <span className="font-semibold text-foreground">Quote Source: {priceInfo.sourceLabel}</span>
                    <p className="text-[10px] text-muted-foreground">Updated: {priceInfo.formattedExact}</p>
                  </div>
                </div>

                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    priceInfo.staleness === 'fresh'
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : priceInfo.staleness === 'moderate'
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {priceInfo.staleness === 'fresh' ? '● Live/Fresh' : 'Moderate'}
                </span>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: SPECIFICS */}
          <TabsContent value="details" className="space-y-3 pt-3">
            {/* US Equities specifics */}
            {holding.asset_class === 'us_stock' && (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="card-surface p-3 rounded-tile">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">USD Valuation</span>
                    <p className="font-bold text-brand-secondary-ink text-sm tnum mt-0.5">
                      {formatUSD(holding.metadata?.value_usd)}
                    </p>
                  </div>
                  <div className="card-surface p-3 rounded-tile">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">USD / INR Rate</span>
                    <p className="font-bold text-foreground text-sm tnum mt-0.5">
                      ₹{holding.metadata?.usd_inr_rate || 88.0}
                    </p>
                  </div>
                </div>
                {holding.metadata?.broker_name && (
                  <p className="text-muted-foreground">
                    US Custodian: <strong className="text-foreground">{holding.metadata.broker_name}</strong>
                  </p>
                )}
              </div>
            )}

            {/* SGB specifics */}
            {holding.asset_class === 'sgb' && (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="card-surface p-3 rounded-tile">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Annual Coupon</span>
                    <p className="font-bold text-amber-500 text-sm mt-0.5">
                      {holding.metadata?.coupon_rate || 2.5}% p.a.
                    </p>
                  </div>
                  <div className="card-surface p-3 rounded-tile">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Maturity Date</span>
                    <p className="font-bold text-foreground text-sm mt-0.5">
                      {holding.metadata?.maturity_date ? formatLocalDate(holding.metadata.maturity_date) : '8 Years from Issue'}
                    </p>
                  </div>
                </div>
                {holding.metadata?.issue_series && (
                  <p className="text-muted-foreground">
                    RBI Series: <strong className="text-foreground font-mono">{holding.metadata.issue_series}</strong>
                  </p>
                )}
              </div>
            )}

            {/* EPF specifics */}
            {holding.asset_class === 'epf' && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="card-surface p-2.5 rounded-tile">
                    <span className="text-[10px] text-muted-foreground block">Employee</span>
                    <p className="font-bold text-foreground tnum mt-0.5">
                      {formatVal(holding.metadata?.employee_share ?? holding.invested_amount)}
                    </p>
                  </div>
                  <div className="card-surface p-2.5 rounded-tile">
                    <span className="text-[10px] text-muted-foreground block">Employer</span>
                    <p className="font-bold text-emerald-500 tnum mt-0.5">
                      {formatVal(holding.metadata?.employer_share ?? 0)}
                    </p>
                  </div>
                  <div className="card-surface p-2.5 rounded-tile">
                    <span className="text-[10px] text-muted-foreground block">EPS Pension</span>
                    <p className="font-bold text-brand-tertiary-ink tnum mt-0.5">
                      {formatVal(holding.metadata?.pension_share ?? 0)}
                    </p>
                  </div>
                </div>

                {holding.metadata?.uan && (
                  <p className="text-muted-foreground">
                    EPFO UAN: <strong className="text-foreground font-mono">{holding.metadata.uan}</strong>
                  </p>
                )}
              </div>
            )}

            {/* PPF specifics */}
            {holding.asset_class === 'ppf' && (
              <div className="space-y-3 text-xs">
                <div className="card-surface p-3 rounded-tile flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PPF Account</span>
                    <p className="font-mono font-bold text-foreground">{holding.folio_or_account_number || 'Primary PPF'}</p>
                  </div>
                  {onOpenPpfManager && (
                    <Button
                      size="xs"
                      onClick={() => {
                        onClose();
                        onOpenPpfManager(holding);
                      }}
                    >
                      Open PPF Ledger
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* FD specifics */}
            {holding.asset_class === 'fd' && (
              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="card-surface p-3 rounded-tile">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Interest Rate</span>
                    <p className="font-bold text-primary text-sm mt-0.5">{holding.metadata?.interest_rate || 7.0}% p.a.</p>
                  </div>
                  <div className="card-surface p-3 rounded-tile">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Maturity Date</span>
                    <p className="font-bold text-foreground text-sm mt-0.5">
                      {holding.metadata?.maturity_date ? formatLocalDate(holding.metadata.maturity_date) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-border">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Asset</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
