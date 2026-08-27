import React, { useState } from 'react';
import {
  Holding,
  PpfTransaction,
  formatINR,
  formatPercent,
  formatLocalDate,
  getLocalTodayInputString,
} from '@investment-tracker/shared';
import { useHoldings } from '../../hooks/useHoldings';
import {
  FileText,
  Plus,
  Trash2,
  X,
  TrendingUp,
  PiggyBank,
  Sparkles,
  Calendar,
  Loader2,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';

interface PpfManagerModalProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PpfManagerModal({ holding, isOpen, onClose }: PpfManagerModalProps) {
  const { updateHolding } = useHoldings();

  // New Transaction Form State
  const [txType, setTxType] = useState<'deposit' | 'interest'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(getLocalTodayInputString());
  const [txNote, setTxNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !holding || holding.asset_class !== 'ppf') return null;

  const rawTransactions: PpfTransaction[] = holding.metadata?.ppf_transactions || [];
  
  // Sort transactions chronologically ascending to compute accurate running balances
  const sortedAsc = [...rawTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let running = 0;
  const transactionsWithRunningBalance = sortedAsc.map((tx) => {
    running += tx.amount;
    return {
      ...tx,
      running_balance: running,
    };
  });

  // Display newest first
  const displayTransactions = [...transactionsWithRunningBalance].reverse();

  // Computed Totals
  const totalDeposited = rawTransactions
    .filter((tx) => tx.type === 'deposit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalInterestCredited = rawTransactions
    .filter((tx) => tx.type === 'interest')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentBalance = totalDeposited + totalInterestCredited;
  const interestGainPercent = totalDeposited > 0 ? (totalInterestCredited / totalDeposited) * 100 : 0;

  // Add Transaction Handler
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(txAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const newTx: PpfTransaction = {
      id: crypto.randomUUID(),
      date: txDate || getLocalTodayInputString(),
      type: txType,
      amount: amountNum,
      note: txNote.trim() || (txType === 'deposit' ? 'Contribution Deposit' : 'Annual Interest Credited (31 March)'),
    };

    const updatedTransactions = [...rawTransactions, newTx];
    
    // Recalculate holding values
    const newTotalDeposited = updatedTransactions
      .filter((tx) => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const newTotalInterest = updatedTransactions
      .filter((tx) => tx.type === 'interest')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const newLiveValue = newTotalDeposited + newTotalInterest;
    const newPnl = newTotalInterest;
    const newPnlPercent = newTotalDeposited > 0 ? (newPnl / newTotalDeposited) * 100 : 0;

    setIsSaving(true);
    try {
      await updateHolding({
        id: holding.id,
        data: {
          quantity: 1,
          avg_buy_price: newTotalDeposited,
          invested_amount: newTotalDeposited,
          statement_price: newLiveValue,
          statement_value: newLiveValue,
          live_price: newLiveValue,
          live_value: newLiveValue,
          unrealized_pnl: newPnl,
          unrealized_pnl_percent: newPnlPercent,
          metadata: {
            ...(holding.metadata || {}),
            ppf_transactions: updatedTransactions,
          },
        },
      });

      setTxAmount('');
      setTxNote('');
      toast.success(txType === 'deposit' ? 'Deposit logged successfully' : 'Interest credited successfully');
    } catch {
      toast.error('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = async (txId: string) => {
    const updatedTransactions = rawTransactions.filter((tx) => tx.id !== txId);

    const newTotalDeposited = updatedTransactions
      .filter((tx) => tx.type === 'deposit')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const newTotalInterest = updatedTransactions
      .filter((tx) => tx.type === 'interest')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const newLiveValue = newTotalDeposited + newTotalInterest;
    const newPnl = newTotalInterest;
    const newPnlPercent = newTotalDeposited > 0 ? (newPnl / newTotalDeposited) * 100 : 0;

    try {
      await updateHolding({
        id: holding.id,
        data: {
          quantity: 1,
          avg_buy_price: newTotalDeposited,
          invested_amount: newTotalDeposited,
          statement_price: newLiveValue,
          statement_value: newLiveValue,
          live_price: newLiveValue,
          live_value: newLiveValue,
          unrealized_pnl: newPnl,
          unrealized_pnl_percent: newPnlPercent,
          metadata: {
            ...(holding.metadata || {}),
            ppf_transactions: updatedTransactions,
          },
        },
      });
      toast.success('Transaction removed');
    } catch {
      toast.error('Failed to delete transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-6 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">{holding.name}</h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 border border-pink-500/20">
                  PPF Passbook
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {holding.institution || 'State Bank of India'} {holding.folio_or_account_number ? `• A/C: ${holding.folio_or_account_number}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Executive Summary Badges */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Current Balance</span>
            <p className="text-base sm:text-lg font-black text-white font-mono">{formatINR(currentBalance)}</p>
            <span className="text-[10px] text-zinc-500 block">Total Passbook Value</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Principal Deposited</span>
            <p className="text-base sm:text-lg font-black text-zinc-200 font-mono">{formatINR(totalDeposited)}</p>
            <span className="text-[10px] text-zinc-500 block">Total Out-of-Pocket</span>
          </div>

          <div className="bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800/80 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Interest Credited</span>
            <p className="text-base sm:text-lg font-black text-emerald-400 font-mono">+{formatINR(totalInterestCredited)}</p>
            <span className="text-[10px] text-emerald-400 font-semibold font-mono">
              {formatPercent(interestGainPercent)} Returns
            </span>
          </div>
        </div>

        {/* Quick Add Form */}
        <div className="bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 border border-zinc-800 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-emerald-400" />
              Log Passbook Transaction
            </span>
            <span className="text-[10px] text-zinc-400">Add Deposits or 31 March Interest</span>
          </div>

          <form onSubmit={handleAddTransaction} className="space-y-3">
            
            {/* Type Selector (Deposit vs Interest) */}
            <div className="grid grid-cols-2 gap-2 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => setTxType('deposit')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  txType === 'deposit'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <PiggyBank className="h-3.5 w-3.5" />
                <span>📥 Deposit / Contribution</span>
              </button>

              <button
                type="button"
                onClick={() => setTxType('interest')}
                className={`py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  txType === 'interest'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>📈 Interest Credited (31 March)</span>
              </button>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="e.g. 12500"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Note / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder={txType === 'deposit' ? 'e.g. Monthly SIP / Bonus' : 'e.g. FY 2025-26 Interest'}
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 px-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-lg shadow-pink-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Recording Transaction...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Add {txType === 'deposit' ? 'Deposit' : 'Interest Credit'} to Passbook</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Transaction History Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white text-xs flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              Passbook History ({rawTransactions.length} entries)
            </span>
            <span className="text-[10px] text-zinc-400">Chronological Passbook Log</span>
          </div>

          {rawTransactions.length === 0 ? (
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-xs">
              No transactions recorded yet. Use the quick add form above to log your deposits or interest credits.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 font-semibold sticky top-0 border-b border-zinc-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-2">Type</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                    <th className="py-2.5 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300 text-[11px]">
                  {displayTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-sans text-zinc-300">{formatLocalDate(tx.date)}</td>
                      <td className="py-2.5 px-2">
                        {tx.type === 'deposit' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Deposit
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-sans font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Interest Credit
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-zinc-400 truncate max-w-[150px]">
                        {tx.note || (tx.type === 'deposit' ? 'Deposit' : 'Annual Interest')}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold ${tx.type === 'deposit' ? 'text-white' : 'text-emerald-400'}`}>
                        +{formatINR(tx.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-semibold text-zinc-200">
                        {formatINR(tx.running_balance)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete transaction"
                          className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
