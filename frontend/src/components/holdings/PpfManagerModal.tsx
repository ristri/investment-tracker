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
  TrendingUp,
  PiggyBank,
  Sparkles,
  Calendar,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PpfManagerModalProps {
  holding: Holding | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PpfManagerModal({ holding, isOpen, onClose }: PpfManagerModalProps) {
  const { updateHolding } = useHoldings();

  const [txType, setTxType] = useState<'deposit' | 'interest'>('deposit');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(getLocalTodayInputString());
  const [txNote, setTxNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !holding || holding.asset_class !== 'ppf') return null;

  const rawTransactions: PpfTransaction[] = holding.metadata?.ppf_transactions || [];
  
  const sortedAsc = [...rawTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let running = 0;
  const transactionsWithRunningBalance = sortedAsc.map((tx) => {
    running += tx.amount;
    return {
      ...tx,
      running_balance: running,
    };
  });

  const displayTransactions = [...transactionsWithRunningBalance].reverse();

  const totalDeposited = rawTransactions
    .filter((tx) => tx.type === 'deposit')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalInterestCredited = rawTransactions
    .filter((tx) => tx.type === 'interest')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const currentBalance = totalDeposited + totalInterestCredited;
  const interestGainPercent = totalDeposited > 0 ? (totalInterestCredited / totalDeposited) * 100 : 0;

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
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl p-5 sm:p-6 space-y-4">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-tile bg-brand-tertiary/15 text-brand-tertiary-ink border border-brand-tertiary/20 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle>{holding.name}</DialogTitle>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-tertiary/15 text-brand-tertiary-ink border border-brand-tertiary/20">
                  PPF Passbook
                </span>
              </div>
              <DialogDescription>
                {holding.institution || 'State Bank of India'} {holding.folio_or_account_number ? `• A/C: ${holding.folio_or_account_number}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 3 Executive Summary Badges */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 tnum">
          <div className="card-surface p-3 sm:p-3.5 rounded-tile space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Current Balance
            </span>
            <p className="text-base sm:text-lg font-extrabold text-foreground">{formatINR(currentBalance)}</p>
            <span className="text-[10px] text-muted-foreground block">Total Passbook Value</span>
          </div>

          <div className="card-surface p-3 sm:p-3.5 rounded-tile space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Principal Deposited
            </span>
            <p className="text-base sm:text-lg font-extrabold text-muted-foreground">{formatINR(totalDeposited)}</p>
            <span className="text-[10px] text-muted-foreground block">Out-of-Pocket</span>
          </div>

          <div className="card-surface p-3 sm:p-3.5 rounded-tile space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Interest Credited
            </span>
            <p className="text-base sm:text-lg font-extrabold text-emerald-500">+{formatINR(totalInterestCredited)}</p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
              {formatPercent(interestGainPercent)} Returns
            </span>
          </div>
        </div>

        {/* Quick Add Form */}
        <div className="card-well p-4 rounded-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              Log Passbook Transaction
            </span>
            <span className="text-[10px] text-muted-foreground">Add Deposits or 31 March Interest</span>
          </div>

          <form onSubmit={handleAddTransaction} className="space-y-3">
            {/* Type Selector (Deposit vs Interest) */}
            <div className="grid grid-cols-2 gap-2 bg-muted/60 p-1 rounded-tile border border-surface-border">
              <button
                type="button"
                onClick={() => setTxType('deposit')}
                className={cn(
                  'py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
                  txType === 'deposit'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <PiggyBank className="h-3.5 w-3.5 text-primary" />
                <span>Deposit / Contribution</span>
              </button>

              <button
                type="button"
                onClick={() => setTxType('interest')}
                className={cn(
                  'py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all',
                  txType === 'interest'
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Interest Credited (31 March)</span>
              </button>
            </div>

            {/* Form Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="mb-1">Amount (₹)</Label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="e.g. 12500"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-card border border-surface-border rounded-tile px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary tnum"
                />
              </div>

              <div>
                <Label className="mb-1">Transaction Date</Label>
                <input
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-card border border-surface-border rounded-tile px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <Label className="mb-1">Note (Optional)</Label>
                <input
                  type="text"
                  placeholder={txType === 'deposit' ? 'e.g. Monthly SIP / Bonus' : 'e.g. FY 2025-26 Interest'}
                  value={txNote}
                  onChange={(e) => setTxNote(e.target.value)}
                  className="w-full bg-card border border-surface-border rounded-tile px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="w-full font-bold gap-1.5"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording Transaction...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add {txType === 'deposit' ? 'Deposit' : 'Interest Credit'} to Passbook</span>
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Transaction History Table */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Passbook History ({rawTransactions.length} entries)
            </span>
            <span className="text-[10px] text-muted-foreground">Chronological Passbook Log</span>
          </div>

          {rawTransactions.length === 0 ? (
            <div className="card-well p-6 rounded-tile text-center text-muted-foreground text-xs">
              No transactions recorded yet. Use the quick add form above to log your deposits or interest credits.
            </div>
          ) : (
            <div className="max-h-52 overflow-y-auto rounded-tile border border-surface-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/80 text-muted-foreground font-semibold sticky top-0 border-b border-surface-border text-[10px] uppercase">
                  <tr>
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                    <th className="py-2 px-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border/60 font-mono text-muted-foreground text-xs tnum">
                  {displayTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/40">
                      <td className="py-2 px-3 font-sans text-foreground">{formatLocalDate(tx.date)}</td>
                      <td className="py-2 px-2">
                        {tx.type === 'deposit' ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Deposit
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-sans font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Interest
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans text-muted-foreground truncate max-w-[150px]">
                        {tx.note || (tx.type === 'deposit' ? 'Deposit' : 'Annual Interest')}
                      </td>
                      <td className={cn('py-2 px-3 text-right font-bold', tx.type === 'deposit' ? 'text-foreground' : 'text-emerald-500')}>
                        +{formatINR(tx.amount)}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-foreground">
                        {formatINR(tx.running_balance)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Delete transaction"
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-colors"
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
      </DialogContent>
    </Dialog>
  );
}
