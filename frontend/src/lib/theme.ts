import { useState, useEffect } from 'react';

const THEME_KEY = 'artha_theme';

export type Theme = 'light' | 'dark';

export function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark') return true;
  if (saved === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export interface UseThemeResult {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setThemeMode: (dark: boolean) => void;
}

export function useTheme(): UseThemeResult {
  const [isDark, setIsDark] = useState<boolean>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try {
      localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    } catch {}
    applyTheme(next);
  };

  const setThemeMode = (dark: boolean) => {
    setIsDark(dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
    } catch {}
    applyTheme(dark);
  };

  return {
    isDark,
    theme: isDark ? 'dark' : 'light',
    toggleTheme,
    setThemeMode,
  };
}
