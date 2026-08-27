import React from 'react';
import {
  LayoutDashboard,
  Coins,
  Camera,
  Plus,
  UploadCloud,
  Layers,
  LogOut,
} from 'lucide-react';

interface MobileNavProps {
  activeTab: 'dashboard' | 'holdings' | 'snapshots';
  setActiveTab: (tab: 'dashboard' | 'holdings' | 'snapshots') => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenSnapshotModal: () => void;
  onLogout?: () => void;
  holdingCount: number;
  snapshotCount: number;
}

export function MobileNav({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenImportModal,
  onOpenSnapshotModal,
  onLogout,
  holdingCount,
  snapshotCount,
}: MobileNavProps) {
  const [showQuickActions, setShowQuickActions] = React.useState(false);

  return (
    <>
      {/* Quick Action Bottom Sheet Backdrop */}
      {showQuickActions && (
        <div
          onClick={() => setShowQuickActions(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-fade-in"
        />
      )}

      {/* Quick Action Drawer Menu (Mobile) */}
      {showQuickActions && (
        <div className="fixed bottom-20 left-4 right-4 z-50 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 shadow-2xl space-y-2 md:hidden animate-in slide-in-from-bottom-5">
          <div className="text-center pb-2 border-b border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Quick Actions</span>
          </div>

          <button
            onClick={() => {
              setShowQuickActions(false);
              onOpenImportModal();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 text-left transition-all border border-zinc-800"
          >
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <UploadCloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Import Statement</p>
              <p className="text-[10px] text-zinc-400">Upload Groww Excel or EPFO Passbook PDF</p>
            </div>
          </button>

          <button
            onClick={() => {
              setShowQuickActions(false);
              onOpenAddModal();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 text-left transition-all border border-zinc-800"
          >
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Add Manual Asset</p>
              <p className="text-[10px] text-zinc-400">Add Bank SGB, PPF, or Fixed Deposit</p>
            </div>
          </button>

          <button
            onClick={() => {
              setShowQuickActions(false);
              onOpenSnapshotModal();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-zinc-950 hover:bg-zinc-800/80 text-left transition-all border border-zinc-800"
          >
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Take Net Worth Snapshot</p>
              <p className="text-[10px] text-zinc-400">Capture current valuation milestone</p>
            </div>
          </button>
        </div>
      )}

      {/* Symmetrical 5-Slot Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/90 px-2 py-2 md:hidden shadow-2xl">
        <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
          
          {/* Slot 1: Dashboard */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setShowQuickActions(false);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all w-full ${
              activeTab === 'dashboard'
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px] truncate">Dashboard</span>
          </button>

          {/* Slot 2: Holdings / Assets */}
          <button
            onClick={() => {
              setActiveTab('holdings');
              setShowQuickActions(false);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all relative w-full ${
              activeTab === 'holdings'
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Layers className="h-5 w-5" />
              {holdingCount > 0 && (
                <span className="absolute -top-1 -right-2.5 h-3.5 min-w-3.5 px-1 rounded-full bg-emerald-500 text-[8px] font-bold text-black flex items-center justify-center">
                  {holdingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] truncate">Assets</span>
          </button>

          {/* Slot 3: True Center Action FAB (+) */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg transition-all transform active:scale-95 ${
              showQuickActions
                ? 'bg-zinc-800 text-white rotate-45 border border-zinc-700'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-900/40'
            }`}
            aria-label="Quick Actions"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>

          {/* Slot 4: Snapshots / History */}
          <button
            onClick={() => {
              setActiveTab('snapshots');
              setShowQuickActions(false);
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition-all relative w-full ${
              activeTab === 'snapshots'
                ? 'text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="relative">
              <Camera className="h-5 w-5" />
              {snapshotCount > 0 && (
                <span className="absolute -top-1 -right-2.5 h-3.5 min-w-3.5 px-1 rounded-full bg-zinc-700 text-[8px] font-bold text-zinc-200 flex items-center justify-center border border-zinc-600">
                  {snapshotCount}
                </span>
              )}
            </div>
            <span className="text-[10px] truncate">History</span>
          </button>

          {/* Slot 5: Logout */}
          <button
            onClick={() => {
              setShowQuickActions(false);
              if (onLogout) onLogout();
            }}
            className="flex flex-col items-center gap-1 py-1 px-2 rounded-xl text-zinc-400 hover:text-rose-400 transition-all w-full"
            title="Sign Out"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] truncate">Sign Out</span>
          </button>

        </div>
      </div>
    </>
  );
}
