import React from 'react';
import {
  TrendingUp,
  Plus,
  UploadCloud,
  Camera,
  RefreshCw,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useHoldings } from '../../hooks/useHoldings';
import { formatINR } from '@investment-tracker/shared';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenSnapshotModal: () => void;
  activeTab: 'dashboard' | 'holdings' | 'snapshots';
  setActiveTab: (tab: 'dashboard' | 'holdings' | 'snapshots') => void;
  isPrivacyMode: boolean;
  setIsPrivacyMode: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export function Header({
  onOpenAddModal,
  onOpenImportModal,
  onOpenSnapshotModal,
  activeTab,
  setActiveTab,
  isPrivacyMode,
  setIsPrivacyMode,
}: HeaderProps) {
  const { user, logout } = useAuth();
  const { summary, refreshPrices, isRefreshing } = useHoldings();

  return (
    <header className="sticky top-0 z-30 bg-zinc-950/85 backdrop-blur-xl border-b border-zinc-800/80 px-4 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Nav */}
        <div className="flex items-center gap-6 lg:gap-8">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <div className="h-full w-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white">Artha</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Tracker
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block">Net Worth & Investments</p>
            </div>
          </div>

          {/* Desktop Navigation tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800/80">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('holdings')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'holdings'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Assets ({summary?.holdingCount || 0})
            </button>
            <button
              onClick={() => setActiveTab('snapshots')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'snapshots'
                  ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              Snapshots & Milestones
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          
          {/* Privacy Toggle */}
          <button
            onClick={() => setIsPrivacyMode((prev) => !prev)}
            title={isPrivacyMode ? 'Show Balances' : 'Hide Balances (Privacy Mode)'}
            className={`p-2 rounded-xl border transition-all ${
              isPrivacyMode
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'
            }`}
          >
            {isPrivacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>

          {/* Market Freshness status tag on desktop */}
          {summary?.marketFreshnessInfo && (
            <div
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400"
              title={`Market rates last updated: ${summary.marketFreshnessInfo.formattedExact} (${summary.marketFreshnessInfo.sourceLabel})`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                  summary.marketFreshnessInfo.staleness === 'fresh'
                    ? 'bg-emerald-400 animate-pulse'
                    : summary.marketFreshnessInfo.staleness === 'moderate'
                    ? 'bg-amber-400'
                    : 'bg-zinc-500'
                }`}
              />
              <span>Prices: <strong className="text-zinc-200 font-medium">{summary.marketFreshnessInfo.relativeTime}</strong></span>
            </div>
          )}

          {/* Refresh live prices */}
          <button
            onClick={() => refreshPrices(true)}
            disabled={isRefreshing}
            title={
              summary?.marketFreshnessInfo
                ? `Market Rates: ${summary.marketFreshnessInfo.formattedExact} (${summary.marketFreshnessInfo.relativeTime}) • Click to Refresh`
                : 'Refresh Live Prices'
            }
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Desktop Only Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 transition-all shadow-sm"
            >
              <Plus className="h-3.5 w-3.5 text-zinc-400" />
              <span>Add Asset</span>
            </button>

            <button
              onClick={onOpenImportModal}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-sm"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>Import</span>
            </button>

            <button
              onClick={onOpenSnapshotModal}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 transition-all"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Snapshot</span>
            </button>
          </div>

          {/* User profile & Logout (Desktop only, mobile is in bottom nav) */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-zinc-800">
            <span className="text-xs text-zinc-400 font-medium hidden lg:inline">
              {user?.username}
            </span>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 border border-zinc-800 transition-all"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
