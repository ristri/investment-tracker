import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '⌘K / Ctrl+K', description: 'Open universal Command Palette' },
  { key: '?', description: 'Open Keyboard Shortcuts cheat sheet' },
  { key: 'P', description: 'Toggle Privacy Mode (mask/unmask balances)' },
  { key: 'T', description: 'Toggle Theme (Light / Dark mode)' },
  { key: 'D', description: 'Jump to Dashboard view' },
  { key: 'H', description: 'Jump to Holdings view' },
  { key: 'I', description: 'Jump to Portfolio Intelligence view' },
  { key: 'M', description: 'Jump to Milestones view' },
  { key: 'ESC', description: 'Dismiss active dialog or search' },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/20">
              <Keyboard className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle>Keyboard Shortcuts</DialogTitle>
              <DialogDescription>Quick navigation keys across the application</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="divide-y divide-surface-border/70 pt-2">
          {SHORTCUTS.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 text-xs">
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="rounded-md border border-surface-border bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-foreground">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
