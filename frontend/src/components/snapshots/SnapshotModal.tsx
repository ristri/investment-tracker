import React, { useState } from 'react';
import { Camera, Loader2, Sparkles } from 'lucide-react';
import { useSnapshots } from '../../hooks/useSnapshots';
import { useHoldings } from '../../hooks/useHoldings';
import { formatINR, formatPercent, formatLocalDate } from '@investment-tracker/shared';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await takeSnapshot({
        title: title || defaultTitle,
        notes: notes || undefined,
        snapshot_date: new Date().toISOString(),
      });
      onClose();
    } catch {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg p-5 sm:p-6 space-y-4">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-tile bg-brand-quaternary/15 text-brand-quaternary-ink border border-brand-quaternary/20 shrink-0">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Capture Portfolio Milestone</DialogTitle>
              <DialogDescription>
                Save a permanent checkpoint of your current net worth to compare your future growth.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Snapshot Summary Preview */}
        {summary && (
          <div className="card-well p-4 rounded-card space-y-3 tnum">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Current Valuation
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {summary.holdingCount} Active Assets
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Total Net Worth
                </span>
                <p className="text-xl font-extrabold text-foreground">{formatINR(summary.totalNetWorth)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Unrealized Gain
                </span>
                <p className={cn('text-xl font-extrabold', summary.totalGain >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                  {summary.totalGain >= 0 ? '+' : ''}{formatINR(summary.totalGain)} ({formatPercent(summary.totalGainPercent)})
                </p>
              </div>
            </div>

            {/* Asset Breakdown Chips */}
            <div className="pt-2 border-t border-surface-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
              <div>
                <span className="text-foreground font-semibold">Stocks:</span> {formatINR(summary.assetClassBreakdown.stock.current, true)}
              </div>
              <div>
                <span className="text-foreground font-semibold">MF:</span> {formatINR(summary.assetClassBreakdown.mutual_fund.current, true)}
              </div>
              <div>
                <span className="text-foreground font-semibold">Gold:</span> {formatINR(summary.assetClassBreakdown.sgb.current, true)}
              </div>
              <div>
                <span className="text-foreground font-semibold">Fixed:</span> {formatINR(summary.assetClassBreakdown.epf.current + summary.assetClassBreakdown.ppf.current + summary.assetClassBreakdown.fd.current, true)}
              </div>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label className="mb-1.5">Milestone Checkpoint Title</Label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-muted/60 border border-surface-border rounded-tile px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              placeholder="e.g. Q3 2026 Bonus & Portfolio Review"
            />
          </div>

          <div>
            <Label className="mb-1.5">Notes / Context (Optional)</Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-muted/60 border border-surface-border rounded-tile px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              placeholder="e.g. Added monthly SIPs into Index Funds and topped up SGB..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isTakingSnapshot}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isTakingSnapshot}
              className="font-bold gap-1.5"
            >
              {isTakingSnapshot ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Checkpoint...</span>
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  <span>Save Milestone</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
