import { useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'artha_sidebar_width';

export const DEFAULT_SIDEBAR_WIDTH = 250;
export const MIN_SIDEBAR_WIDTH = 190;
export const MAX_SIDEBAR_WIDTH = 380;

function clamp(px: number): number {
  return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, Math.round(px)));
}

function readStored(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SIDEBAR_WIDTH;
    const n = Number(raw);
    return Number.isFinite(n) ? clamp(n) : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

export interface ResizableSidebar {
  width: number;
  isResizing: boolean;
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onDoubleClick: () => void;
    role: 'separator';
    'aria-orientation': 'vertical';
    'aria-label': string;
    'aria-valuenow': number;
    'aria-valuemin': number;
    'aria-valuemax': number;
    tabIndex: number;
  };
}

export function useResizableSidebar(): ResizableSidebar {
  const [width, setWidthState] = useState<number>(readStored);
  const [isResizing, setResizing] = useState(false);

  const widthRef = useRef(width);
  const setWidth = useCallback((px: number) => {
    widthRef.current = px;
    setWidthState(px);
  }, []);

  const persist = useCallback((px: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(px));
    } catch {}
  }, []);

  const startDrag = useCallback(
    (clientXStart: number) => {
      const startWidth = widthRef.current;
      setResizing(true);

      const prevUserSelect = document.body.style.userSelect;
      const prevCursor = document.body.style.cursor;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      const move = (clientX: number) => {
        setWidth(clamp(startWidth + (clientX - clientXStart)));
      };

      const onMouseMove = (e: MouseEvent) => move(e.clientX);
      const onTouchMove = (e: TouchEvent) => {
        if (e.touches[0]) move(e.touches[0].clientX);
      };

      const stop = () => {
        setResizing(false);
        document.body.style.userSelect = prevUserSelect;
        document.body.style.cursor = prevCursor;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', stop);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', stop);
        window.removeEventListener('touchcancel', stop);
        persist(widthRef.current);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', stop);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', stop);
      window.addEventListener('touchcancel', stop);
    },
    [persist, setWidth]
  );

  const nudge = useCallback(
    (delta: number) => {
      const next = clamp(widthRef.current + delta);
      setWidth(next);
      persist(next);
    },
    [persist, setWidth]
  );

  const reset = useCallback(() => {
    setWidth(DEFAULT_SIDEBAR_WIDTH);
    persist(DEFAULT_SIDEBAR_WIDTH);
  }, [persist, setWidth]);

  return {
    width,
    isResizing,
    handleProps: {
      onMouseDown: (e) => {
        e.preventDefault();
        startDrag(e.clientX);
      },
      onTouchStart: (e) => {
        if (e.touches[0]) startDrag(e.touches[0].clientX);
      },
      onKeyDown: (e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudge(e.shiftKey ? -32 : -8);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudge(e.shiftKey ? 32 : 8);
        } else if (e.key === 'Home') {
          e.preventDefault();
          reset();
        }
      },
      onDoubleClick: reset,
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': 'Resize sidebar',
      'aria-valuenow': width,
      'aria-valuemin': MIN_SIDEBAR_WIDTH,
      'aria-valuemax': MAX_SIDEBAR_WIDTH,
      tabIndex: 0,
    },
  };
}
