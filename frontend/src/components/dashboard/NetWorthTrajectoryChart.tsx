import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { NetWorthSnapshot, formatINR, formatLocalDate, formatLocalDateTime } from '@investment-tracker/shared';
import { Camera, TrendingUp } from 'lucide-react';

interface NetWorthTrajectoryChartProps {
  snapshots: NetWorthSnapshot[];
  onTakeSnapshot: () => void;
}

export function NetWorthTrajectoryChart({
  snapshots,
  onTakeSnapshot,
}: NetWorthTrajectoryChartProps) {
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xl flex flex-col items-center justify-center text-center h-[340px]">
        <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
          <Camera className="h-6 w-6" />
        </div>
        <h4 className="text-base font-bold text-white mb-1">No Snapshots Captured Yet</h4>
        <p className="text-xs text-zinc-400 max-w-sm mb-4">
          Capture manual snapshots whenever you update your portfolio or receive your salary to track your historical net worth growth.
        </p>
        <button
          onClick={onTakeSnapshot}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5"
        >
          <Camera className="h-3.5 w-3.5" />
          <span>Capture First Snapshot</span>
        </button>
      </div>
    );
  }

  const chartData = snapshots.map((s) => {
    return {
      date: formatLocalDate(s.snapshot_date),
      fullDate: formatLocalDateTime(s.snapshot_date),
      netWorth: s.total_net_worth,
      invested: s.total_invested,
      profit: s.total_unrealized_pnl,
      title: s.title,
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">{d.title || label}</p>
          <p className="text-[11px] text-zinc-400">{d.fullDate || d.date}</p>
          <div className="pt-1.5 border-t border-zinc-800 space-y-1">
            <p className="text-zinc-300">
              Net Worth: <span className="font-semibold text-emerald-400">{formatINR(d.netWorth)}</span>
            </p>
            <p className="text-zinc-400">
              Invested: <span className="font-medium text-zinc-200">{formatINR(d.invested)}</span>
            </p>
            <p className="text-zinc-400">
              Total Gain: <span className="font-semibold text-emerald-300">{formatINR(d.profit)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800/80 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-base text-white">Net Worth Trajectory</h3>
          <p className="text-xs text-zinc-400">Growth history across {snapshots.length} saved snapshots</p>
        </div>
        <button
          onClick={onTakeSnapshot}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all flex items-center gap-1.5"
        >
          <Camera className="h-3.5 w-3.5 text-emerald-400" />
          <span>New Snapshot</span>
        </button>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="investedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#27272a' }}
              tickFormatter={(v) => formatINR(v, true)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#netWorthGradient)"
              name="Net Worth"
            />
            <Area
              type="monotone"
              dataKey="invested"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#investedGradient)"
              name="Invested"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
