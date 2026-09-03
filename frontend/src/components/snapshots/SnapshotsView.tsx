import React from 'react';
import { NetWorthSnapshot, formatINR, formatPercent, formatLocalDateTime } from '@investment-tracker/shared';
import { Camera, TrendingUp, TrendingDown, Trash2, Calendar, Target, Sparkles, ArrowRight } from 'lucide-react';
import { Panel, PanelHeader, PanelTitle, StatBlock } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SnapshotsViewProps {
  snapshots: NetWorthSnapshot[];
  onTakeSnapshot: () => void;
  onDeleteSnapshot: (id: number) => void;
}

export function SnapshotsView({
  snapshots,
  onTakeSnapshot,
  onDeleteSnapshot,
}: SnapshotsViewProps) {
  // Sort descending for timeline & table
  const sortedDesc = [...snapshots].sort(
    (a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
  );

  const latest = sortedDesc[0];
  const oldest = sortedDesc[sortedDesc.length - 1];
  const totalGrowth = latest && oldest && latest.id !== oldest.id
    ? latest.total_net_worth - oldest.total_net_worth
    : null;
  const totalGrowthPct = totalGrowth !== null && oldest.total_net_worth > 0
    ? (totalGrowth / oldest.total_net_worth) * 100
    : null;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-foreground tracking-tight">Milestones & Snapshots</h2>
          <p className="text-xs text-muted-foreground">
            Timestamped valuation checkpoints to track and compare net worth progress over time.
          </p>
        </div>
        <Button
          onClick={onTakeSnapshot}
          className="gap-2 font-bold shadow-md shadow-primary/20 self-start sm:self-auto"
        >
          <Camera className="h-4 w-4" />
          <span>Capture Milestone</span>
        </Button>
      </div>

      {/* Snapshot Stats Highlights if multiple snapshots exist */}
      {snapshots.length > 1 && latest && oldest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatBlock
            label="Latest Checkpoint"
            value={formatINR(latest.total_net_worth)}
            icon={Target}
            tone="primary"
            tintValue={true}
            hint={latest.title}
          />

          <StatBlock
            label="Initial Baseline"
            value={formatINR(oldest.total_net_worth)}
            icon={Calendar}
            tone="neutral"
            hint={`Recorded: ${formatLocalDateTime(oldest.snapshot_date)}`}
          />

          <StatBlock
            label="Milestone Growth"
            value={`${totalGrowth && totalGrowth >= 0 ? '+' : ''}${formatINR(totalGrowth)}`}
            icon={totalGrowth && totalGrowth >= 0 ? TrendingUp : TrendingDown}
            tone={totalGrowth && totalGrowth >= 0 ? 'primary' : 'danger'}
            tintValue={true}
            hint={
              totalGrowthPct !== null ? (
                <span className="font-bold text-xs">
                  {totalGrowthPct >= 0 ? '+' : ''}{formatPercent(totalGrowthPct)} growth
                </span>
              ) : undefined
            }
          />
        </div>
      )}

      {/* Snapshots Table with Delta Comparisons */}
      <Panel className="space-y-4">
        <PanelHeader className="mb-0">
          <PanelTitle sub="Historical records of your net worth milestones and growth between checkpoints">
            Saved Milestones ({snapshots.length})
          </PanelTitle>
        </PanelHeader>

        {snapshots.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-xs space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Camera className="h-6 w-6" />
            </div>
            <p className="font-bold text-foreground text-sm">No Milestones Recorded Yet</p>
            <p className="max-w-xs mx-auto">
              Whenever you update your portfolio, receive your salary, or reach a financial milestone, capture a checkpoint to compare your growth!
            </p>
            <Button onClick={onTakeSnapshot} size="sm" className="gap-1.5 font-bold">
              <Camera className="h-3.5 w-3.5" />
              <span>Capture First Milestone</span>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-card border border-surface-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider border-b border-surface-border">
                <tr>
                  <th className="py-3 px-4">Date & Milestone</th>
                  <th className="py-3 px-4 text-right">Net Worth</th>
                  <th className="py-3 px-4 text-right">Invested</th>
                  <th className="py-3 px-4 text-right">Returns</th>
                  <th className="py-3 px-4 text-right">Growth vs Prev</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60 font-medium">
                {sortedDesc.map((s, idx) => {
                  const prev = sortedDesc[idx + 1];
                  let deltaWorth: number | null = null;
                  let deltaWorthPct: number | null = null;

                  if (prev) {
                    deltaWorth = s.total_net_worth - prev.total_net_worth;
                    deltaWorthPct = prev.total_net_worth > 0 ? (deltaWorth / prev.total_net_worth) * 100 : 0;
                  }

                  const formattedDate = formatLocalDateTime(s.snapshot_date);

                  return (
                    <tr key={s.id} className="hover:bg-muted/40 transition-colors group">
                      {/* Title & Date */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-foreground text-xs">{s.title}</p>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {formattedDate}
                          </p>
                          {s.notes && (
                            <p className="text-[11px] text-muted-foreground italic mt-1 bg-muted px-2 py-0.5 rounded border border-surface-border inline-block">
                              "{s.notes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Net Worth */}
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-foreground text-sm tnum">
                        {formatINR(s.total_net_worth)}
                      </td>

                      {/* Invested */}
                      <td className="py-3.5 px-4 text-right font-mono text-muted-foreground tnum">
                        {formatINR(s.total_invested)}
                      </td>

                      {/* Returns */}
                      <td className="py-3.5 px-4 text-right font-mono tnum">
                        <div className={cn('font-bold', s.total_unrealized_pnl >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                          {formatINR(s.total_unrealized_pnl)}
                        </div>
                        <div className={cn('text-[10px] font-semibold', s.total_unrealized_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                          {formatPercent(s.total_pnl_percent)}
                        </div>
                      </td>

                      {/* Delta vs Previous */}
                      <td className="py-3.5 px-4 text-right font-mono tnum">
                        {deltaWorth !== null ? (
                          <div>
                            <span className={cn('font-bold', deltaWorth >= 0 ? 'text-emerald-500' : 'text-destructive')}>
                              {deltaWorth >= 0 ? '+' : ''}{formatINR(deltaWorth)}
                            </span>
                            <div className={cn('text-[10px] font-semibold', deltaWorth >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive')}>
                              {formatPercent(deltaWorthPct)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px] font-sans">Baseline Checkpoint</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Delete milestone "${s.title}"?`)) {
                              onDeleteSnapshot(s.id);
                            }
                          }}
                          title="Delete Milestone"
                          className="p-1.5 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
