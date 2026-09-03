import React from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Plus,
  UploadCloud,
  Camera,
  ChevronDown,
  Sparkles,
  Command,
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { useTheme } from '@/lib/theme';
import { PortfolioSummary } from '@investment-tracker/shared';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenSnapshotModal: () => void;
  onOpenCommandPalette: () => void;
  isPrivacyMode: boolean;
  setIsPrivacyMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  summary?: PortfolioSummary;
  refreshPrices: (force?: boolean) => Promise<any>;
  isRefreshing: boolean;
  username?: string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export function Header({
  onOpenAddModal,
  onOpenImportModal,
  onOpenSnapshotModal,
  onOpenCommandPalette,
  isPrivacyMode,
  setIsPrivacyMode,
  summary,
  refreshPrices,
  isRefreshing,
  username,
}: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-border bg-background/85 px-4 sm:px-6 py-3 backdrop-blur-xl transition-all">
      {/* Left: Mobile Brand & Desktop Greeting */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile only brand mark */}
        <div className="flex items-center gap-2 md:hidden">
          <BrandMark size={32} />
          <span className="font-extrabold text-base tracking-tight text-foreground">Artha</span>
        </div>

        {/* Desktop Greeting */}
        <div className="hidden md:block min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {greeting()}
          </p>
          <p className="truncate text-base lg:text-lg font-extrabold tracking-tight text-foreground">
            Welcome back{username ? <span className="capitalize">, {username}</span> : ''}
          </p>
        </div>
      </div>

      {/* Center: Command Search Pill */}
      <div className="flex flex-1 justify-center max-w-md mx-2 sm:mx-6">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex min-h-[38px] w-full items-center gap-2.5 rounded-full border border-surface-border bg-card px-3.5 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground shadow-sm group"
        >
          <Search className="h-3.5 w-3.5 shrink-0 group-hover:text-primary transition-colors" />
          <span className="flex-1 text-left truncate">Search assets, scrips, schemes...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-surface-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </button>
      </div>

      {/* Right: Controls & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        
        {/* Market Freshness Status Tag (Desktop) */}
        {summary?.marketFreshnessInfo && summary.marketFreshnessInfo.isMarketRate && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-surface-border text-[11px] font-medium text-muted-foreground cursor-default"
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full flex-shrink-0',
                    summary.marketFreshnessInfo.staleness === 'fresh'
                      ? 'bg-emerald-500 animate-pulse'
                      : summary.marketFreshnessInfo.staleness === 'moderate'
                      ? 'bg-amber-500'
                      : 'bg-muted-foreground'
                  )}
                />
                <span>Rates: <strong className="text-foreground font-semibold">{summary.marketFreshnessInfo.relativeTime}</strong></span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <div>
                <p className="font-bold text-foreground">Market Price Freshness</p>
                <p className="text-muted-foreground text-[10px]">
                  Updated: {summary.marketFreshnessInfo.formattedExact} ({summary.marketFreshnessInfo.sourceLabel})
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Refresh Live Prices Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => refreshPrices(true)}
              disabled={isRefreshing}
              aria-label="Refresh Market Prices"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-primary')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isRefreshing ? 'Fetching latest quotes...' : 'Refresh Live Market Prices'}
          </TooltipContent>
        </Tooltip>

        {/* Privacy Mode Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isPrivacyMode ? 'secondary' : 'outline'}
              size="icon-sm"
              onClick={() => setIsPrivacyMode((prev) => !prev)}
              className={cn(isPrivacyMode && 'bg-primary/15 text-primary border-primary/30')}
              aria-label="Toggle privacy mode"
            >
              {isPrivacyMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isPrivacyMode ? 'Disable Privacy Mode (Show Figures)' : 'Enable Privacy Mode (Mask Figures)'}
          </TooltipContent>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Switch to {isDark ? 'Light' : 'Dark'} Mode
          </TooltipContent>
        </Tooltip>

        {/* Quick Action Dropdown (+ New) on Desktop */}
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5 font-bold shadow-sm">
                <Plus className="h-3.5 w-3.5" />
                <span>New</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Portfolio Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={onOpenImportModal}>
                <UploadCloud className="h-4 w-4 text-brand-secondary-ink" />
                <span>Import Statement</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenAddModal}>
                <Plus className="h-4 w-4 text-primary" />
                <span>Add Manual Asset</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenSnapshotModal}>
                <Camera className="h-4 w-4 text-brand-quaternary-ink" />
                <span>Milestone Snapshot</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </header>
  );
}
