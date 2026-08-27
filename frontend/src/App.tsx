import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { useHoldings } from './hooks/useHoldings';
import { useSnapshots } from './hooks/useSnapshots';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';
import { HeroMetrics } from './components/dashboard/HeroMetrics';
import { AllocationDonut } from './components/dashboard/AllocationDonut';
import { AssetCategoryCards } from './components/dashboard/AssetCategoryCards';
import { HoldingsTable } from './components/holdings/HoldingsTable';
import { SnapshotsView } from './components/snapshots/SnapshotsView';
import { ImportModal } from './components/imports/ImportModal';
import { AddAssetModal } from './components/manual-forms/AddAssetModal';
import { SnapshotModal } from './components/snapshots/SnapshotModal';
import { AuthModal } from './components/auth/AuthModal';
import { AssetClass } from '@investment-tracker/shared';
import { Toaster } from 'sonner';
import { Loader2, Plus, UploadCloud } from 'lucide-react';

export function App() {
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  const { holdings, summary, isLoading: isHoldingsLoading, deleteHolding } = useHoldings();
  const { snapshots, deleteSnapshot } = useSnapshots();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'holdings' | 'snapshots'>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<AssetClass | 'all'>('all');
  
  // Privacy mode (mask financial numbers)
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('artha_privacy_mode') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('artha_privacy_mode', String(isPrivacyMode));
  }, [isPrivacyMode]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthModal />
        <Toaster position="top-right" theme="dark" richColors />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300 pb-20 md:pb-8">
      
      {/* Toast Notifications */}
      <Toaster position="top-right" theme="dark" richColors />

      {/* Main App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
        isPrivacyMode={isPrivacyMode}
        setIsPrivacyMode={setIsPrivacyMode}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-5 sm:py-6 space-y-6">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Hero Metrics */}
            <HeroMetrics summary={summary} isPrivacyMode={isPrivacyMode} />

            {/* Empty state prompt if 0 holdings */}
            {holdings.length === 0 && !isHoldingsLoading && (
              <div className="rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-10 text-center space-y-4 shadow-xl">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="font-bold text-lg text-white">Your Portfolio is Empty</h3>
                  <p className="text-xs text-zinc-400">
                    Import your statement from Groww (Stocks, ETFs, SGBs, Mutual Funds) or EPFO Passbook PDF to get started in seconds.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
                  >
                    <UploadCloud className="h-4 w-4" />
                    <span>Import Statement</span>
                  </button>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Manual Asset</span>
                  </button>
                </div>
              </div>
            )}

            {/* Asset Class & Macro Allocation Suite */}
            {holdings.length > 0 && (
              <AllocationDonut summary={summary} isPrivacyMode={isPrivacyMode} />
            )}

            {/* Asset Categories Grid */}
            {holdings.length > 0 && (
              <AssetCategoryCards
                summary={summary}
                selectedCategory={selectedCategory}
                isPrivacyMode={isPrivacyMode}
                onSelectCategory={(cat) => {
                  setSelectedCategory(cat);
                }}
              />
            )}

            {/* Holdings Table & Mobile Cards */}
            {holdings.length > 0 && (
              <HoldingsTable
                holdings={holdings}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                onDeleteHolding={deleteHolding}
                isPrivacyMode={isPrivacyMode}
              />
            )}

          </div>
        )}

        {/* TAB 2: HOLDINGS */}
        {activeTab === 'holdings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">All Portfolio Assets</h2>
                <p className="text-xs text-zinc-400">Detailed overview of all active holdings across 7 asset classes</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-all flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Asset</span>
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1.5"
                >
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>Import</span>
                </button>
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

        {/* TAB 3: SNAPSHOTS */}
        {activeTab === 'snapshots' && (
          <SnapshotsView
            snapshots={snapshots}
            onTakeSnapshot={() => setIsSnapshotModalOpen(true)}
            onDeleteSnapshot={deleteSnapshot}
          />
        )}

      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onOpenSnapshotModal={() => setIsSnapshotModalOpen(true)}
        onLogout={logout}
        holdingCount={holdings.length}
        snapshotCount={snapshots.length}
      />

      {/* Modals */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <AddAssetModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <SnapshotModal
        isOpen={isSnapshotModalOpen}
        onClose={() => setIsSnapshotModalOpen(false)}
      />

    </div>
  );
}
