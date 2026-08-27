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
  X,
  Loader2,
  Sparkles,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

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

          // Find default selection or select first
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

  // Handle SGB Selection change from dropdown
  const handleSgbSelectionChange = (symbol: string) => {
    setSelectedSgbSymbol(symbol);
    if (symbol === 'custom') {
      setSgbSeries('Custom Series');
      return;
    }

    const item = sgbDirectory.find((s) => s.symbol === symbol);
    if (item) {
      setSgbSeries(item.series);
      if (item.issuePrice > 0) {
        setSgbIssuePrice(String(item.issuePrice));
      }
      if (item.ltp > 0) {
        setSgbLivePrice(String(item.ltp));
      }
    }
  };

  if (!isOpen) return null;

  // SGB Calculations
  const sgbUnitsNum = parseFloat(sgbUnits) || 0;
  const sgbIssuePriceNum = parseFloat(sgbIssuePrice) || 0;
  const sgbLivePriceNum = parseFloat(sgbLivePrice) || sgbIssuePriceNum;
  const sgbTotalInvested = sgbUnitsNum * sgbIssuePriceNum;
  const sgbCurrentVal = sgbUnitsNum * sgbLivePriceNum;
  const sgbGain = sgbCurrentVal - sgbTotalInvested;
  const sgbGainPct = sgbTotalInvested > 0 ? (sgbGain / sgbTotalInvested) * 100 : 0;

  // FD Calculations
  const fdPrincipalNum = parseFloat(fdPrincipal) || 0;
  const fdRateNum = parseFloat(fdRate) || 0;
  const fdMonthsNum = parseInt(fdMonths) || 12;
  const fdMaturity = calculateFDMaturity(fdPrincipalNum, fdRateNum, fdMonthsNum, fdCompounding);

  const fdStartObj = new Date(fdStartDate || getLocalTodayInputString());
  const fdMaturityObj = new Date(fdStartObj);
  fdMaturityObj.setMonth(fdMaturityObj.getMonth() + fdMonthsNum);
  const fdMaturityStr = isNaN(fdMaturityObj.getTime()) ? '' : getLocalTodayInputString(fdMaturityObj);
  const isFdMatured = !isNaN(fdMaturityObj.getTime()) && fdMaturityObj.getTime() < new Date().setHours(0, 0, 0, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let newHolding: CreateHoldingInput;

    if (activeTab === 'sgb') {
      const units = sgbUnitsNum;
      const price = sgbIssuePriceNum;
      const liveP = sgbLivePriceNum;
      const invested = units * price;
      const liveVal = units * liveP;
      const pnl = liveVal - invested;
      const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;

      newHolding = {
        asset_class: 'sgb',
        name: `SGB ${sgbSeries}`,
        symbol: selectedSgbSymbol !== 'custom' ? selectedSgbSymbol : `SGB-${sgbSeries.replace(/\s+/g, '')}`,
        institution: sgbBank,
        quantity: units,
        avg_buy_price: price,
        invested_amount: invested,
        statement_price: price,
        statement_value: invested,
        live_price: liveP,
        live_value: liveVal,
        unrealized_pnl: pnl,
        unrealized_pnl_percent: pnlPct,
        source: 'manual',
        statement_date: sgbDate,
        category: 'Gold',
        sub_category: 'Sovereign Gold Bond',
        metadata: {
          issue_series: sgbSeries,
          nse_symbol: selectedSgbSymbol !== 'custom' ? selectedSgbSymbol : undefined,
          issue_price_per_gram: price,
          live_sgb_price: liveP,
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
          id: crypto.randomUUID(),
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
      // FD
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
    } catch {
      // Handled by hook toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-0 sm:my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Add Investment Asset</h3>
              <p className="text-xs text-zinc-400">Track Bank SGBs, PPF Accounts, or Fixed Deposits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-950 p-1 rounded-2xl border border-zinc-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('sgb')}
            className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'sgb'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Bank SGB</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ppf')}
            className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'ppf'
                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PPF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fd')}
            className={`py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'fd'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Landmark className="h-3.5 w-3.5" />
            <span>Fixed Deposit</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* TAB 1: SGB */}
          {activeTab === 'sgb' && (
            <div className="space-y-3">
              {/* Tranche Selector */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    Select Official RBI / NSE Tranche
                  </label>
                  <span className="text-[10px] text-amber-400 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    NSE Live Exchange Data
                  </span>
                </div>
                {isLoadingSgbs ? (
                  <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
                    <span>Loading official NSE SGB tranches...</span>
                  </div>
                ) : (
                  <select
                    value={selectedSgbSymbol}
                    onChange={(e) => handleSgbSelectionChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
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
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Series Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2023-24 Series IV"
                    value={sgbSeries}
                    onChange={(e) => setSgbSeries(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Units (Grams of Gold)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={sgbUnits}
                    onChange={(e) => setSgbUnits(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Issue Price (₹/g)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={sgbIssuePrice}
                    onChange={(e) => setSgbIssuePrice(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Bank / Depository
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="State Bank of India / RBI"
                    value={sgbBank}
                    onChange={(e) => setSgbBank(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Issue Date
                  </label>
                  <input
                    type="date"
                    required
                    value={sgbDate}
                    onChange={(e) => setSgbDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Real-time Exchange Valuation Card */}
              <div className="bg-gradient-to-br from-amber-500/15 via-zinc-950 to-zinc-950 border border-amber-500/30 p-3.5 rounded-2xl space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-xs border-b border-amber-500/20 pb-2">
                  <span className="text-zinc-400 text-[11px]">NSE Exchange LTP:</span>
                  <span className="font-extrabold text-amber-300 font-mono text-sm">
                    ₹{sgbLivePriceNum.toLocaleString('en-IN', { maximumFractionDigits: 2 })} / g
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-zinc-400 text-[10px] block">Invested Amount:</span>
                    <p className="font-bold text-zinc-200 font-mono">{formatINR(sgbTotalInvested)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-400 text-[10px] block">Live Market Value:</span>
                    <p className="font-bold text-white font-mono">{formatINR(sgbCurrentVal)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[11px]">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>+{formatINR(sgbGain)} ({formatPercent(sgbGainPct)})</span>
                  </div>
                  <span className="text-zinc-400 text-[10px]">Coupon: 2.50% p.a.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PPF */}
          {activeTab === 'ppf' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Bank / Post Office
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="State Bank of India"
                    value={ppfBank}
                    onChange={(e) => setPpfBank(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Account Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1029384756"
                    value={ppfAccount}
                    onChange={(e) => setPpfAccount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Current / Starting Balance (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 150000"
                    value={ppfBalance}
                    onChange={(e) => setPpfBalance(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Opening / Balance Date
                  </label>
                  <input
                    type="date"
                    required
                    value={ppfDate}
                    onChange={(e) => setPpfDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Govt. Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={ppfRate}
                  onChange={(e) => setPpfRate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Fixed Deposit */}
          {activeTab === 'fd' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Bank / Financial Inst.
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="HDFC Bank / ICICI"
                    value={fdBank}
                    onChange={(e) => setFdBank(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Principal Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={fdPrincipal}
                    onChange={(e) => setFdPrincipal(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Rate (% p.a.)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={fdRate}
                    onChange={(e) => setFdRate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={fdMonths}
                    onChange={(e) => setFdMonths(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Compounding
                  </label>
                  <select
                    value={fdCompounding}
                    onChange={(e) => setFdCompounding(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="monthly">Monthly</option>
                    <option value="cumulative">Cumulative</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Deposit Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={fdStartDate}
                    onChange={(e) => setFdStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Maturity Date
                  </label>
                  <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white flex items-center justify-between">
                    <span>{fdMaturityStr || '-'}</span>
                    {isFdMatured && (
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/30">
                        Matured
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-zinc-400 text-[10px]">Estimated Maturity:</span>
                  <p className="font-extrabold text-indigo-400 font-mono text-sm">
                    {formatINR(fdMaturity.maturityAmount)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400 text-[10px]">Total Accrued Interest:</span>
                  <p className="font-bold text-emerald-400 font-mono">
                    +{formatINR(fdMaturity.totalInterest)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAdding ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Adding Investment...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Save Investment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
