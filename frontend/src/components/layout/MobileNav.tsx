import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Target,
  Plus,
  UploadCloud,
  Camera,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TabType } from './Sidebar';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenSnapshotModal: () => void;
  holdingCount: number;
  snapshotCount: number;
}

export function MobileNav({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenImportModal,
  onOpenSnapshotModal,
  holdingCount,
  snapshotCount,
}: MobileNavProps) {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  return (
    <>
      {/* Quick Action Drawer powered by Radix Dialog */}
      <Dialog open={isQuickActionOpen} onOpenChange={setIsQuickActionOpen}>
        <DialogContent className="sm:max-w-sm rounded-t-card sm:rounded-card p-5">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Quick Actions</DialogTitle>
            <DialogDescription>Add to your portfolio or capture a milestone</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                setIsQuickActionOpen(false);
                onOpenImportModal();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-tile bg-muted/50 hover:bg-muted text-left transition-colors border border-surface-border/60"
            >
              <div className="p-2 rounded-xl bg-brand-secondary/15 text-brand-secondary-ink border border-brand-secondary/20">
                <UploadCloud className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Import Statement</p>
                <p className="text-[10px] text-muted-foreground">Upload Groww Excel or EPFO Passbook</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickActionOpen(false);
                onOpenAddModal();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-tile bg-muted/50 hover:bg-muted text-left transition-colors border border-surface-border/60"
            >
              <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/20">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Add Manual Asset</p>
                <p className="text-[10px] text-muted-foreground">Add SGB, PPF, FD, or Custom Equities</p>
              </div>
            </button>

            <button
              onClick={() => {
                setIsQuickActionOpen(false);
                onOpenSnapshotModal();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-tile bg-muted/50 hover:bg-muted text-left transition-colors border border-surface-border/60"
            >
              <div className="p-2 rounded-xl bg-brand-quaternary/15 text-brand-quaternary-ink border border-brand-quaternary/20">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Milestone Snapshot</p>
                <p className="text-[10px] text-muted-foreground">Record current net worth milestone</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Symmetrical 5-slot Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-surface-border bg-surface/95 px-1 py-1.5 backdrop-blur-xl md:hidden">
        {/* Slot 1: Dashboard */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-tile px-1 py-1 text-[10px] font-semibold transition-colors',
            activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        {/* Slot 2: Holdings */}
        <button
          type="button"
          onClick={() => setActiveTab('holdings')}
          className={cn(
            'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-tile px-1 py-1 text-[10px] font-semibold transition-colors relative',
            activeTab === 'holdings' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="relative">
            <Layers className="h-4 w-4" />
            {holdingCount > 0 && (
              <span className="absolute -top-1 -right-2 h-3 min-w-3 px-0.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground flex items-center justify-center">
                {holdingCount}
              </span>
            )}
          </div>
          <span>Holdings</span>
        </button>

        {/* Slot 3: Center FAB (+) */}
        <div className="flex flex-1 items-center justify-center">
          <button
            type="button"
            onClick={() => setIsQuickActionOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
            aria-label="Quick Actions"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Slot 4: Portfolio Intelligence */}
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={cn(
            'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-tile px-1 py-1 text-[10px] font-semibold transition-colors',
            activeTab === 'analytics' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Insights</span>
        </button>

        {/* Slot 5: Milestones */}
        <button
          type="button"
          onClick={() => setActiveTab('snapshots')}
          className={cn(
            'flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 rounded-tile px-1 py-1 text-[10px] font-semibold transition-colors relative',
            activeTab === 'snapshots' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <div className="relative">
            <Target className="h-4 w-4" />
            {snapshotCount > 0 && (
              <span className="absolute -top-1 -right-2 h-3 min-w-3 px-0.5 rounded-full bg-brand-quaternary text-[8px] font-bold text-white flex items-center justify-center">
                {snapshotCount}
              </span>
            )}
          </div>
          <span>Milestones</span>
        </button>
      </nav>
    </>
  );
}
