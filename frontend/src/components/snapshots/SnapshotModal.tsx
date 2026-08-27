import React, { useState } from 'react';
import { Camera, X, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { useSnapshots } from '../../hooks/useSnapshots';
import { useHoldings } from '../../hooks/useHoldings';
import { formatINR, formatPercent, formatLocalDate } from '@investment-tracker/shared';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnapshotModal({ isOpen, onClose }: SnapshotModalProps) {
  const { takeSnapshot, isTakingSnapshot } = useSnapshots();
  const { summary } = useHoldings();

  const defaultTitle = `Snapshot — ${formatLocalDate(new Date())}`;
  const [title, setTitle] = useState(defaultTitle);
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await takeSnapshot({
        title: title || defaultTitle,
        notes: notes || undefined,
        snapshot_date: new Date().toISOString(),
      });
      onClose();
    } catch {
      // Handled by hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl my-0 sm:my-8 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Capture Portfolio Snapshot</h3>
              <p className="text-xs text-zinc-400">Save a point-in-time record of your net worth to database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Snapshot Summary Preview */}
        {summary && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Snapshot Valuation</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {summary.holdingCount} Active Assets
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] uppercase text-zinc-500">Total Net Worth</span>
                <p className="text-xl font-extrabold text-white font-mono">{formatINR(summary.totalNetWorth)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500">Total Gain</span>
                <p className={`text-xl font-extrabold font-mono ${summary.totalGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(summary.totalGain)} ({formatPercent(summary.totalGainPercent)})
                </p>
              </div>
            </div>

            {/* Micro Breakdown */}
            <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-400">
              <div>
                <span className="text-zinc-500">Stocks:</span> {formatINR(summary.assetClassBreakdown.stock.current, true)}
              </div>
              <div>
                <span className="text-zinc-500">MF:</span> {formatINR(summary.assetClassBreakdown.mutual_fund.current, true)}
              </div>
              <div>
                <span className="text-zinc-500">Gold/SGB:</span> {formatINR(summary.assetClassBreakdown.sgb.current, true)}
              </div>
              <div>
                <span className="text-zinc-500">EPF/PPF/FD:</span> {formatINR(summary.assetClassBreakdown.epf.current + summary.assetClassBreakdown.ppf.current + summary.assetClassBreakdown.fd.current, true)}
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Snapshot Title / Milestone</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. End of August 2026 Portfolio Review"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Notes / Rationale (Optional)</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              placeholder="e.g. Added bonus investment into Small Cap MF & SGB..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTakingSnapshot}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isTakingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              <span>Save Snapshot</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
