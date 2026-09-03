import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useHoldings } from './hooks/useHoldings';
import { useSnapshots } from './hooks/useSnapshots';
import { useTheme } from './lib/theme';
import { Sidebar, TabType } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { CommandPalette } from './components/CommandPalette';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { HeroMetrics } from './components/dashboard/HeroMetrics';
import { AllocationDonut } from './components/dashboard/AllocationDonut';
import { AssetCategoryCards } from './components/dashboard/AssetCategoryCards';
import { TopMoversCard } from './components/dashboard/TopMoversCard';
import { AnalyticsView } from './components/analytics/AnalyticsView';
import { HoldingsTable } from './components/holdings/HoldingsTable';
import { SnapshotsView } from './components/snapshots/SnapshotsView';
import { HoldingDetailModal } from './components/holdings/HoldingDetailModal';
import { ImportModal } from './components/imports/ImportModal';
import { AddAssetModal } from './components/manual-forms/AddAssetModal';
import { SnapshotModal } from './components/snapshots/SnapshotModal';
import { AuthModal } from './components/auth/AuthModal';
import { TooltipProvider } from './components/ui/tooltip';
import { AssetClass, Holding } from '@investment-tracker/shared';
import { Toaster, toast } from 'sonner';
import { Loader2, Plus, UploadCloud } from 'lucide-react';
import { Button } from './components/ui/button';

export function App() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const {
    holdings,
    summary,
    isLoading: isHoldingsLoading,
    deleteHolding,
    refreshPrices,
    isRefreshing,
  } = useHoldings();
  const { snapshots, deleteSnapshot } = useSnapshots();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<AssetClass | 'all'>('all');

  // Privacy mode (mask financial numbers)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('artha_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('artha_privacy_mode', String(isPrivacyMode));
    } catch {}
  }, [isPrivacyMode]);

  // Modal dialog states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [inspectedHolding, setInspectedHolding] = useState<Holding | null>(null);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      // Command + K or Ctrl + K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // ? -> Keyboard Shortcuts Cheat Sheet
      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // P -> Toggle Privacy
      if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPrivacyMode((prev) => !prev);
        return;
      }

      // T -> Toggle Theme
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      // Tab navigation shortcuts
      if (e.key.toLowerCase() === 'd') {
        setActiveTab('dashboard');
      } else if (e.key.toLowerCase() === 'h') {
        setActiveTab('holdings');
      } else if (e.key.toLowerCase() === 'i') {
        setActiveTab('analytics');
      } else if (e.key.toLowerCase() === 'm') {
        setActiveTab('snapshots');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  // Export CSV Handler
  const handleExportData = useCallback(() => {
    if (holdings.length === 0) {
      toast.error('No portfolio holdings to export');
      return;
    }
    const headers = ['Asset Class', 'Name', 'Symbol', 'ISIN', 'Quantity', 'Avg Buy Price', 'Invested Amount', 'Live Price', 'Statement Value'];
    const rows = holdings.map((h) => [
      h.asset_class,
      `"${h.name.replace(/"/g, '""')}"`,
      h.symbol || '',
      h.isin || '',
      h.quantity,
      h.avg_buy_price,
      h.invested_amount,
      h.live_price ?? '',
      h.statement_value ?? '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `artha-portfolio-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Portfolio exported to CSV');
  }, [holdings]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthModal />
        <Toaster position="top-right" theme={isDark ? 'dark' : 'light'} richColors />
      </>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased selection:bg-primary/20 selection:text-primary">
        
        {/* Toast Notifications */}
        <Toaster position="top-right" theme={isDark ? 'dark' : 'light'} richColors />

        {/* Collapsible Sidebar (Desktop) */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          holdingCount={holdings.length}
          snapshotCount={snapshots.length}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
          username={user.username}
          onLogout={logout}
        />

        {/* Right Shell: Header + Content View */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
          
          {/* Header */}
          <Header
            onOpenAddModal={() => setIsAddModalOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
            onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
            isPrivacyMode={isPrivacyMode}
            setIsPrivacyMode={setIsPrivacyMode}
            summary={summary}
            refreshPrices={(force) => refreshPrices(Boolean(force))}
            isRefreshing={isRefreshing}
            username={user.username}
          />

          {/* Main View Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
            
            {/* VIEW 1: DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                
                {/* Hero Metrics */}
                <HeroMetrics summary={summary} holdings={holdings} isPrivacyMode={isPrivacyMode} />

                {/* Empty State Prompt if 0 holdings */}
                {holdings.length === 0 && !isHoldingsLoading && (
                  <div className="card-surface p-8 sm:p-12 text-center space-y-4 rounded-card">
                    <div className="h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto border border-primary/25">
                      <UploadCloud className="h-7 w-7" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                      <h3 className="font-extrabold text-lg text-foreground">Your Portfolio is Empty</h3>
                      <p className="text-xs text-muted-foreground">
                        Import your statement from Groww (Stocks, ETFs, SGBs, Mutual Funds), INDmoney US Equities, or EPFO Passbook PDF to get started in seconds.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <Button
                        onClick={() => setIsImportModalOpen(true)}
                        className="gap-2 font-bold shadow-md shadow-primary/20"
                      >
                        <UploadCloud className="h-4 w-4" />
                        <span>Import Statement</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddModalOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Add Manual Asset</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Donut & Macro Split */}
                {holdings.length > 0 && (
                  <AllocationDonut summary={summary} isPrivacyMode={isPrivacyMode} />
                )}

                {/* Category Cards */}
                {holdings.length > 0 && (
                  <AssetCategoryCards
                    summary={summary}
                    selectedCategory={selectedCategory}
                    isPrivacyMode={isPrivacyMode}
                    onSelectCategory={(cat) => setSelectedCategory(cat)}
                  />
                )}

                {/* Top Movers (Gainers & Laggers) */}
                {holdings.length > 0 && (
                  <TopMoversCard
                    holdings={holdings}
                    onSelectHolding={(h) => setInspectedHolding(h)}
                    isPrivacyMode={isPrivacyMode}
                  />
                )}

                {/* Holdings Table on Dashboard */}
                {holdings.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                        Portfolio Holdings & Positions
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('holdings')}
                        className="text-xs text-primary font-semibold"
                      >
                        View Full Screen →
                      </Button>
                    </div>
                    <HoldingsTable
                      holdings={holdings}
                      selectedCategory={selectedCategory}
                      onSelectCategory={setSelectedCategory}
                      onDeleteHolding={deleteHolding}
                      isPrivacyMode={isPrivacyMode}
                    />
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: HOLDINGS */}
            {activeTab === 'holdings' && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground tracking-tight">Portfolio Holdings</h2>
                    <p className="text-xs text-muted-foreground">
                      Complete list of your active investments, unit allocations, cost basis, and live market quotes.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddModalOpen(true)}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Asset</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsImportModalOpen(true)}
                      className="gap-1.5 font-bold shadow-md shadow-primary/20"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>Import</span>
                    </Button>
                  </div>
                </div>

                <HoldingsTable
                  holdings={holdings}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onDeleteHolding={deleteHolding}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            )}

            {/* VIEW 3: PORTFOLIO INTELLIGENCE */}
            {activeTab === 'analytics' && (
              <div className="animate-in fade-in-50 duration-200">
                <AnalyticsView
                  summary={summary}
                  holdings={holdings}
                  isPrivacyMode={isPrivacyMode}
                />
              </div>
            )}

            {/* VIEW 4: MILESTONES / SNAPSHOTS */}
            {activeTab === 'snapshots' && (
              <div className="animate-in fade-in-50 duration-200">
                <SnapshotsView
                  snapshots={snapshots}
                  onTakeSnapshot={() => setIsSnapshotModalOpen(true)}
                  onDeleteSnapshot={deleteSnapshot}
                />
              </div>
            )}

          </main>
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <MobileNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
          holdingCount={holdings.length}
          snapshotCount={snapshots.length}
        />

        {/* Universal Command Palette (⌘K) */}
        <CommandPalette
          open={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          holdings={holdings}
          onSelectHolding={(h) => setInspectedHolding(h)}
          onNavigate={(tab) => setActiveTab(tab)}
          onOpenImportModal={() => setIsImportModalOpen(true)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
          onTogglePrivacy={() => setIsPrivacyMode((prev) => !prev)}
          onToggleTheme={toggleTheme}
          onExportData={handleExportData}
          onRefreshPrices={() => refreshPrices(true)}
          isPrivacyMode={isPrivacyMode}
          isDark={isDark}
        />

        {/* Keyboard Shortcuts Cheat Sheet (?) */}
        <KeyboardShortcutsModal
          open={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        {/* Holding Details Modal */}
        <HoldingDetailModal
          holding={inspectedHolding}
          isOpen={Boolean(inspectedHolding)}
          onClose={() => setInspectedHolding(null)}
          onDeleteHolding={deleteHolding}
          isPrivacyMode={isPrivacyMode}
        />

        {/* Statement Import Modal */}
        <ImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
        />

        {/* Add Manual Asset Modal */}
        <AddAssetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />

        {/* Milestone Snapshot Modal */}
        <SnapshotModal
          isOpen={isSnapshotModalOpen}
          onClose={() => setIsSnapshotModalOpen(false)}
        />

      </div>
    </TooltipProvider>
  );
}
