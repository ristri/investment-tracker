import React from 'react';
import { NetWorthSnapshot, formatINR, formatPercent, formatLocalDateTime } from '@investment-tracker/shared';
import { Camera, TrendingUp, TrendingDown, Trash2, Calendar, Sparkles } from 'lucide-react';
import { NetWorthTrajectoryChart } from '../dashboard/NetWorthTrajectoryChart';

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
  // Sort descending for table
  const sortedDesc = [...snapshots].sort(
    (a, b) => new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
  );

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Trajectory Chart */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Net Worth History & Milestones</h2>
            <p className="text-xs text-zinc-400">Track and compare your financial growth over time</p>
          </div>
          <button
            onClick={onTakeSnapshot}
            className="self-start sm:self-auto px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5"
          >
            <Camera className="h-4 w-4" />
            <span>Capture New Snapshot</span>
          </button>
        </div>

        {/* Trajectory Area Chart */}
        <NetWorthTrajectoryChart snapshots={snapshots} onTakeSnapshot={onTakeSnapshot} />
      </div>

      {/* Snapshots Table with Delta Comparisons */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base text-white">Snapshot Milestones ({snapshots.length})</h3>
        </div>

        {snapshots.length === 0 ? (
          <div className="py-8 text-center text-zinc-500 text-xs">
            No snapshots recorded yet. Click "Capture New Snapshot" to start tracking your net worth history!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Date & Title</th>
                  <th className="py-3 px-4 text-right">Net Worth</th>
                  <th className="py-3 px-4 text-right">Invested</th>
                  <th className="py-3 px-4 text-right">Returns</th>
                  <th className="py-3 px-4 text-right">Growth vs Prev</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
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
                    <tr key={s.id} className="hover:bg-zinc-800/40 transition-colors group">
                      {/* Title & Date */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-white">{s.title}</p>
                          <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3" />
                            {formattedDate}
                          </p>
                          {s.notes && (
                            <p className="text-[11px] text-zinc-400 italic mt-1 bg-zinc-950/60 px-2 py-1 rounded border border-zinc-800 inline-block">
                              "{s.notes}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Net Worth */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        {formatINR(s.total_net_worth)}
                      </td>

                      {/* Invested */}
                      <td className="py-3.5 px-4 text-right font-mono text-zinc-300">
                        {formatINR(s.total_invested)}
                      </td>

                      {/* Returns */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <div className={`font-bold ${s.total_unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatINR(s.total_unrealized_pnl)}
                        </div>
                        <div className={`text-[11px] ${s.total_unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatPercent(s.total_pnl_percent)}
                        </div>
                      </td>

                      {/* Delta vs Previous */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {deltaWorth !== null ? (
                          <div>
                            <span className={`font-bold ${deltaWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {deltaWorth >= 0 ? '+' : ''}{formatINR(deltaWorth)}
                            </span>
                            <div className={`text-[10px] ${deltaWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {formatPercent(deltaWorthPct)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-[11px] font-sans">Baseline</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Delete snapshot "${s.title}"?`)) {
                              onDeleteSnapshot(s.id);
                            }
                          }}
                          title="Delete Snapshot"
                          className="p-1.5 rounded-lg hover:bg-rose-950/40 text-zinc-500 hover:text-rose-400 opacity-60 group-hover:opacity-100 transition-all"
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
      </div>

    </div>
  );
}
