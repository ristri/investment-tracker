import React, { useCallback, useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  Target,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Plus,
  UploadCloud,
  Camera,
} from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { useResizableSidebar } from '@/hooks/useResizableSidebar';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type TabType = 'dashboard' | 'holdings' | 'analytics' | 'snapshots';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  holdingCount: number;
  snapshotCount: number;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  onOpenSnapshotModal: () => void;
  username?: string;
  onLogout: () => void;
}

const COLLAPSE_KEY = 'artha_sidebar_collapsed';
const RAIL_WIDTH = 76;

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export const NAV_ITEMS = [
  { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'holdings' as TabType, label: 'Holdings', icon: Layers, badgeKey: 'holdingCount' },
  { id: 'analytics' as TabType, label: 'Portfolio Intelligence', icon: BarChart3 },
  { id: 'snapshots' as TabType, label: 'Milestones', icon: Target, badgeKey: 'snapshotCount' },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  holdingCount,
  snapshotCount,
  onOpenAddModal,
  onOpenImportModal,
  onOpenSnapshotModal,
  username,
  onLogout,
}: SidebarProps) {
  const { width: sidebarWidth, isResizing, handleProps } = useResizableSidebar();
  const [collapsed, setCollapsed] = useState<boolean>(readCollapsed);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }, []);

  return (
    <aside
      style={{ width: collapsed ? RAIL_WIDTH : sidebarWidth }}
      className={cn(
        'relative sticky top-0 hidden h-screen shrink-0 flex-col justify-between border-r border-surface-border bg-surface md:flex select-none z-20',
        collapsed ? 'items-center px-3 py-4' : 'p-4'
      )}
    >
      {/* Top Header & Brand */}
      <div className={cn('w-full min-w-0 flex-1 overflow-y-auto scrollbar-none', collapsed && 'flex flex-col items-center')}>
        
        {/* Brand Mark Link */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            'group mb-6 flex cursor-pointer items-center gap-3 rounded-tile transition-all',
            collapsed ? 'justify-center p-1' : 'px-2 py-1.5 hover:bg-muted/60'
          )}
        >
          <BrandMark size={38} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="block truncate text-base font-extrabold tracking-tight text-foreground">
                  Artha
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-primary/15 text-primary border border-primary/25">
                  Tracker
                </span>
              </div>
              <span className="block truncate text-[11px] font-medium text-muted-foreground">
                Investment & Wealth
              </span>
            </div>
          )}
        </div>

        {/* Navigation items */}
        <nav className={cn('flex flex-col', collapsed ? 'items-center gap-1.5' : 'gap-1')}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            const badgeValue =
              item.badgeKey === 'holdingCount'
                ? holdingCount
                : item.badgeKey === 'snapshotCount'
                ? snapshotCount
                : undefined;

            const buttonContent = (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex items-center rounded-tile text-xs font-semibold transition-all relative',
                  collapsed
                    ? 'h-11 w-11 justify-center'
                    : 'min-h-[40px] w-full gap-3 px-3 py-2 text-left',
                  active
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-bold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                {!collapsed && badgeValue !== undefined && badgeValue > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-full text-[10px] font-bold tnum',
                      active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/15 text-foreground'
                    )}
                  >
                    {badgeValue}
                  </span>
                )}
                {collapsed && badgeValue !== undefined && badgeValue > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                  <TooltipContent side="right">
                    <span>{item.label}</span>
                    {badgeValue !== undefined && badgeValue > 0 ? ` (${badgeValue})` : ''}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return buttonContent;
          })}
        </nav>

        {/* Expanded Quick Action Buttons */}
        {!collapsed && (
          <div className="mt-6 pt-4 border-t border-surface-border/80 space-y-1.5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Quick Actions
            </p>
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-tile text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground transition-colors text-left"
            >
              <Plus className="h-3.5 w-3.5 text-primary" />
              <span>Add Manual Asset</span>
            </button>
            <button
              onClick={onOpenImportModal}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-tile text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground transition-colors text-left"
            >
              <UploadCloud className="h-3.5 w-3.5 text-brand-secondary-ink" />
              <span>Import Statement</span>
            </button>
            <button
              onClick={onOpenSnapshotModal}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-tile text-xs font-semibold bg-muted/60 hover:bg-muted text-foreground transition-colors text-left"
            >
              <Camera className="h-3.5 w-3.5 text-brand-quaternary-ink" />
              <span>Milestone Snapshot</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div
        className={cn(
          'w-full border-t border-surface-border pt-3',
          collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
        )}
      >
        {collapsed ? (
          <>
            {/* Expand sidebar button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="flex h-10 w-10 items-center justify-center rounded-tile text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>

            {/* Sign out */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-10 w-10 items-center justify-center rounded-tile text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out ({username || 'user'})</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            {/* User row and logout */}
            <div className="flex items-center justify-between px-1 py-1">
              <div className="min-w-0 flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                  {username ? username.charAt(0) : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{username || 'Investor'}</p>
                  <p className="text-[10px] text-muted-foreground">Portfolio Owner</p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Sign Out</TooltipContent>
              </Tooltip>
            </div>

            {/* Collapse toggle */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex min-h-[34px] w-full items-center gap-2 rounded-tile px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <PanelLeftClose className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Collapse to icon rail</span>
            </button>
          </>
        )}
      </div>

      {/* Drag handle for expanded mode */}
      {!collapsed && (
        <div
          {...handleProps}
          title="Drag to resize sidebar — double-click to reset"
          className={cn(
            'group absolute inset-y-0 -right-1 w-2 cursor-col-resize focus:outline-none z-30',
            isResizing ? 'bg-primary/60' : 'hover:bg-primary/40 focus-visible:bg-primary/60'
          )}
        >
          <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent group-hover:bg-primary/50" />
        </div>
      )}
    </aside>
  );
}
