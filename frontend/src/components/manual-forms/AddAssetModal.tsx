import React, { useState, useEffect } from 'react';
import {
  CreateHoldingInput,
  PpfTransaction,
  calculateFDMaturity,
  formatINR,
  formatPercent,
  getLocalTodayInputString,
} from '@investment-tracker/shared';
import { useHoldings } from '../../hooks/useHoldings';
import { api } from '../../lib/api';
import {
  Coins,
  FileText,
  Landmark,
  Plus,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'sgb' | 'ppf' | 'fd';

interface SgbOption {
  symbol: string;
  series: string;
  issuePrice: number;
  ltp: number;
  change: number;
  changePercent: number;
}

export function AddAssetModal({ isOpen, onClose }: AddAssetModalProps) {
  const { addHolding, isAdding } = useHoldings();
  const [activeTab, setActiveTab] = useState<TabType>('sgb');

  // SGB Directory State from NSE
  const [sgbDirectory, setSgbDirectory] = useState<SgbOption[]>([]);
  const [isLoadingSgbs, setIsLoadingSgbs] = useState(false);
  const [selectedSgbSymbol, setSelectedSgbSymbol] = useState('SGBFEB32IV');

  // SGB Form State
  const [sgbSeries, setSgbSeries] = useState('2023-24 Series IV (Feb 2032)');
  const [sgbUnits, setSgbUnits] = useState('10');
  const [sgbIssuePrice, setSgbIssuePrice] = useState('6213');
  const [sgbLivePrice, setSgbLivePrice] = useState('16033.02');
  const [sgbBank, setSgbBank] = useState('State Bank of India');
  const [sgbDate, setSgbDate] = useState(getLocalTodayInputString());

  // PPF Form State
  const [ppfBank, setPpfBank] = useState('State Bank of India');
  const [ppfAccount, setPpfAccount] = useState('');
  const [ppfBalance, setPpfBalance] = useState('150000');
  const [ppfDate, setPpfDate] = useState(getLocalTodayInputString());
  const [ppfRate, setPpfRate] = useState('7.1');

  // FD Form State
  const [fdBank, setFdBank] = useState('HDFC Bank');
  const [fdPrincipal, setFdPrincipal] = useState('200000');
  const [fdRate, setFdRate] = useState('7.5');
  const [fdMonths, setFdMonths] = useState('12');
  const [fdStartDate, setFdStartDate] = useState(getLocalTodayInputString());
  const [fdCompounding, setFdCompounding] = useState<'quarterly' | 'monthly' | 'cumulative'>('quarterly');

  // Fetch official SGB directory from NSE India on modal open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSgbs = async () => {
      setIsLoadingSgbs(true);
      try {
        const res = await api.get('/market/sgb-directory');
        if (isMounted && res.data?.sgbs?.length > 0) {
          const list: SgbOption[] = res.data.sgbs;
          setSgbDirectory(list);

          const defaultItem = list.find((s) => s.symbol === 'SGBFEB32IV') || list[0];
          if (defaultItem) {
            setSelectedSgbSymbol(defaultItem.symbol);
            setSgbSeries(defaultItem.series);
            setSgbIssuePrice(String(defaultItem.issuePrice || 6213));
            setSgbLivePrice(String(defaultItem.ltp || 16000));
          }
        }
      } catch (err) {
        console.error('Failed to load NSE SGB directory:', err);
      } finally {
        if (isMounted) setIsLoadingSgbs(false);
      }
    };

    fetchSgbs();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleSgbSelectionChange = (symbol: string) => {
    setSelectedSgbSymbol(symbol);
    if (symbol === 'custom') {
      setSgbSeries('');
      setSgbIssuePrice('6000');
      setSgbLivePrice('15000');
      return;
    }
    const found = sgbDirectory.find((s) => s.symbol === symbol);
    if (found) {
      setSgbSeries(found.series);
      setSgbIssuePrice(String(found.issuePrice || 6000));
      setSgbLivePrice(String(found.ltp || 15000));
    }
  };

  // Live SGB calculations
  const unitsNum = parseFloat(sgbUnits) || 0;
  const issuePriceNum = parseFloat(sgbIssuePrice) || 0;
  const livePriceNum = parseFloat(sgbLivePrice) || issuePriceNum;
  const sgbInvested = unitsNum * issuePriceNum;
  const sgbCurrentVal = unitsNum * livePriceNum;
  const sgbPnl = sgbCurrentVal - sgbInvested;
  const sgbPnlPercent = sgbInvested > 0 ? (sgbPnl / sgbInvested) * 100 : 0;
  const sgbAnnualCoupon = sgbInvested * 0.025;

  // Live FD calculations
  const fdPrincipalNum = parseFloat(fdPrincipal) || 0;
  const fdRateNum = parseFloat(fdRate) || 0;
  const fdMonthsNum = parseInt(fdMonths, 10) || 12;
  const fdMaturity = calculateFDMaturity(fdPrincipalNum, fdRateNum, fdMonthsNum, fdCompounding);

  let fdMaturityStr = '';
  let isFdMatured = false;
  try {
    const sDate = new Date(fdStartDate || new Date());
    const mDate = new Date(sDate);
    mDate.setMonth(mDate.getMonth() + fdMonthsNum);
    fdMaturityStr = mDate.toISOString().slice(0, 10);
    isFdMatured = mDate.getTime() <= Date.now();
  } catch {}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let newHolding: CreateHoldingInput;

    if (activeTab === 'sgb') {
      newHolding = {
        asset_class: 'sgb',
        name: `Sovereign Gold Bond (${sgbSeries})`,
        symbol: selectedSgbSymbol !== 'custom' ? selectedSgbSymbol : undefined,
        quantity: unitsNum,
        avg_buy_price: issuePriceNum,
        invested_amount: sgbInvested,
        statement_price: issuePriceNum,
        statement_value: sgbInvested,
        live_price: livePriceNum,
        live_value: sgbCurrentVal,
        unrealized_pnl: sgbPnl,
        unrealized_pnl_percent: sgbPnlPercent,
        source: 'manual',
        statement_date: sgbDate,
        institution: sgbBank,
        category: 'Gold',
        sub_category: 'SGB',
        metadata: {
          issue_series: sgbSeries,
          issue_price_per_gram: issuePriceNum,
          live_sgb_price: livePriceNum,
          nse_symbol: selectedSgbSymbol !== 'custom' ? selectedSgbSymbol : undefined,
          coupon_rate: 2.5,
          bank_name: sgbBank,
          issue_date: sgbDate,
        },
      };
    } else if (activeTab === 'ppf') {
      const balance = parseFloat(ppfBalance) || 0;
      const rate = parseFloat(ppfRate) || 7.1;

      const initialTx: PpfTransaction[] = balance > 0 ? [
        {
          id: `ppf-init-${Date.now()}`,
          date: ppfDate || getLocalTodayInputString(),
          type: 'deposit',
          amount: balance,
          note: 'Initial Balance / Opening Deposit',
        },
      ] : [];

      newHolding = {
        asset_class: 'ppf',
        name: `PPF Account (${ppfBank})`,
        folio_or_account_number: ppfAccount || undefined,
        institution: ppfBank,
        quantity: 1,
        avg_buy_price: balance,
        invested_amount: balance,
        statement_price: balance,
        statement_value: balance,
        live_price: balance,
        live_value: balance,
        unrealized_pnl: 0,
        unrealized_pnl_percent: 0,
        source: 'manual',
        statement_date: ppfDate,
        category: 'Retirement',
        sub_category: 'Public Provident Fund',
        metadata: {
          bank_name: ppfBank,
          account_number: ppfAccount || undefined,
          opening_date: ppfDate,
          interest_rate: rate,
          ppf_transactions: initialTx,
        },
      };
    } else {
      newHolding = {
        asset_class: 'fd',
        name: `Fixed Deposit (${fdBank})`,
        institution: fdBank,
        quantity: 1,
        avg_buy_price: fdPrincipalNum,
        invested_amount: fdPrincipalNum,
        statement_price: fdPrincipalNum,
        statement_value: fdPrincipalNum,
        live_price: fdPrincipalNum,
        live_value: fdPrincipalNum,
        unrealized_pnl: 0,
        unrealized_pnl_percent: 0,
        source: 'manual',
        statement_date: fdStartDate,
        category: 'Fixed Income',
        sub_category: 'Fixed Deposit',
        metadata: {
          principal: fdPrincipalNum,
          interest_rate: fdRateNum,
          tenure_months: fdMonthsNum,
          start_date: fdStartDate,
          maturity_date: fdMaturityStr,
          maturity_amount: fdMaturity.maturityAmount,
          compounding_frequency: fdCompounding,
          bank_name: fdBank,
          is_matured: isFdMatured,
        },
      };
    }

    try {
      await addHolding(newHolding);
      onClose();
    } catch {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-5 sm:p-6 space-y-4">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-tile bg-primary/15 text-primary border border-primary/20 shrink-0">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Add Manual Asset</DialogTitle>
              <DialogDescription>
                Track Bank/RBI SGB tranches, PPF accounts, or Fixed Deposits.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Selection via Radix Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="sgb" className="gap-1.5 font-bold">
              <Coins className="h-3.5 w-3.5 text-brand-quaternary-ink" />
              <span>Bank SGB</span>
            </TabsTrigger>
            <TabsTrigger value="ppf" className="gap-1.5 font-bold">
              <FileText className="h-3.5 w-3.5 text-brand-tertiary-ink" />
              <span>PPF A/C</span>
            </TabsTrigger>
            <TabsTrigger value="fd" className="gap-1.5 font-bold">
              <Landmark className="h-3.5 w-3.5 text-primary" />
              <span>Fixed Deposit</span>
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            {/* TAB 1: SGB */}
            <TabsContent value="sgb" className="space-y-3 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Select Official RBI / NSE Tranche</Label>
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    NSE Live Exchange
                  </span>
                </div>
                {isLoadingSgbs ? (
                  <div className="w-full bg-muted border border-surface-border rounded-tile px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Loading official NSE SGB tranches...</span>
                  </div>
                ) : (
                  <select
                    value={selectedSgbSymbol}
                    onChange={(e) => handleSgbSelectionChange(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    {sgbDirectory.map((sgb) => (
                      <option key={sgb.symbol} value={sgb.symbol}>
                        {sgb.series} ({sgb.symbol}) — Live LTP: ₹{sgb.ltp.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </option>
                    ))}
                    <option value="custom">Custom Tranche / Series</option>
                  </select>
                )}
              </div>

              {selectedSgbSymbol === 'custom' && (
                <div>
                  <Label className="mb-1.5">Series Name</Label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023-24 Series IV"
                    value={sgbSeries}
                    onChange={(e) => setSgbSeries(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Units (Grams of Gold)</Label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={sgbUnits}
                    onChange={(e) => setSgbUnits(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Issue Price (₹/g)</Label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sgbIssuePrice}
                    onChange={(e) => setSgbIssuePrice(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Bank / Depository</Label>
                  <input
                    type="text"
                    required
                    placeholder="State Bank of India / RBI"
                    value={sgbBank}
                    onChange={(e) => setSgbBank(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Issue Date</Label>
                  <input
                    type="date"
                    required
                    value={sgbDate}
                    onChange={(e) => setSgbDate(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Live SGB Valuation Card */}
              <div className="card-well p-3 rounded-tile space-y-1.5 text-xs tnum">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">Current Market Value:</span>
                  <span className="font-extrabold text-foreground text-sm">{formatINR(sgbCurrentVal)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Unrealized Profit:</span>
                  <span className="font-bold text-emerald-500">
                    +{formatINR(sgbPnl)} ({formatPercent(sgbPnlPercent)})
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-surface-border/60">
                  <span className="text-muted-foreground">2.5% Annual Coupon Payout:</span>
                  <span className="font-bold text-amber-500">+{formatINR(sgbAnnualCoupon)}/yr</span>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: PPF */}
            <TabsContent value="ppf" className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Bank / Post Office</Label>
                  <input
                    type="text"
                    required
                    placeholder="SBI / Post Office"
                    value={ppfBank}
                    onChange={(e) => setPpfBank(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Account Number (Optional)</Label>
                  <input
                    type="text"
                    placeholder="e.g. 1092837465"
                    value={ppfAccount}
                    onChange={(e) => setPpfAccount(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Current Balance (₹)</Label>
                  <input
                    type="number"
                    min="500"
                    required
                    value={ppfBalance}
                    onChange={(e) => setPpfBalance(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Interest Rate (% p.a.)</Label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={ppfRate}
                    onChange={(e) => setPpfRate(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1.5">Opening / Deposit Date</Label>
                <input
                  type="date"
                  required
                  value={ppfDate}
                  onChange={(e) => setPpfDate(e.target.value)}
                  className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="card-well p-3 rounded-tile text-[11px] text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">💡 Tax-Free Sovereign PPF</p>
                <p>Tax-free under Section 80C with annual compounded returns backed by the Government of India.</p>
              </div>
            </TabsContent>

            {/* TAB 3: FD */}
            <TabsContent value="fd" className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Bank / NBFC Name</Label>
                  <input
                    type="text"
                    required
                    placeholder="HDFC / ICICI / SBI"
                    value={fdBank}
                    onChange={(e) => setFdBank(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Principal Amount (₹)</Label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={fdPrincipal}
                    onChange={(e) => setFdPrincipal(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <Label className="mb-1.5">Rate (% p.a.)</Label>
                  <input
                    type="number"
                    step="0.05"
                    required
                    value={fdRate}
                    onChange={(e) => setFdRate(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Tenure (Months)</Label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={fdMonths}
                    onChange={(e) => setFdMonths(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Compounding</Label>
                  <select
                    value={fdCompounding}
                    onChange={(e) => setFdCompounding(e.target.value as any)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="cumulative">Cumulative</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5">Start Date</Label>
                  <input
                    type="date"
                    required
                    value={fdStartDate}
                    onChange={(e) => setFdStartDate(e.target.value)}
                    className="w-full bg-muted/60 border border-surface-border rounded-tile px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="mb-1.5">Maturity Date</Label>
                  <div className="w-full bg-muted border border-surface-border rounded-tile px-3 py-2 text-xs font-mono font-bold text-foreground flex items-center justify-between">
                    <span>{fdMaturityStr || '-'}</span>
                    {isFdMatured && (
                      <span className="text-[10px] bg-destructive/15 text-destructive px-1.5 py-0.2 rounded font-bold">
                        Matured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* FD Calculation Pill */}
              <div className="card-well p-3 rounded-tile flex items-center justify-between text-xs tnum">
                <div>
                  <span className="text-muted-foreground text-[10px] block">Estimated Maturity:</span>
                  <p className="font-extrabold text-foreground text-sm">{formatINR(fdMaturity.maturityAmount)}</p>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[10px] block">Accrued Interest:</span>
                  <p className="font-bold text-emerald-500">+{formatINR(fdMaturity.totalInterest)}</p>
                </div>
              </div>
            </TabsContent>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
              <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isAdding}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isAdding} className="gap-1.5 font-bold">
                {isAdding ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Save Investment</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
