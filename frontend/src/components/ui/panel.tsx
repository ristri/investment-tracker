import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

export type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'quaternary'
  | 'danger'
  | 'neutral';

const TONE_INK: Record<Tone, string> = {
  primary: 'text-brand-primary-ink',
  secondary: 'text-brand-secondary-ink',
  tertiary: 'text-brand-tertiary-ink',
  quaternary: 'text-brand-quaternary-ink',
  danger: 'text-destructive',
  neutral: 'text-foreground',
};

const TONE_TINT: Record<Tone, string> = {
  primary: 'bg-brand-primary/10 text-brand-primary-ink border-brand-primary/20',
  secondary: 'bg-brand-secondary/15 text-brand-secondary-ink border-brand-secondary/20',
  tertiary: 'bg-brand-tertiary/15 text-brand-tertiary-ink border-brand-tertiary/20',
  quaternary: 'bg-brand-quaternary/15 text-brand-quaternary-ink border-brand-quaternary/20',
  danger: 'bg-destructive/15 text-destructive border-destructive/20',
  neutral: 'bg-muted text-muted-foreground border-surface-border',
};

/* -------------------------------------------------------------------------- */
/* Panel shell                                                                */
/* -------------------------------------------------------------------------- */

export function Panel({
  className,
  padded = true,
  ...props
}: React.ComponentProps<'div'> & { padded?: boolean }) {
  return (
    <div
      data-slot="panel"
      className={cn('card-surface flex flex-col', padded && 'p-4 sm:p-6', className)}
      {...props}
    />
  );
}

export function PanelHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-header"
      className={cn('mb-4 flex items-start justify-between gap-3', className)}
      {...props}
    />
  );
}

export function PanelTitle({
  className,
  children,
  sub,
  ...props
}: React.ComponentProps<'h3'> & { sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3
        data-slot="panel-title"
        className={cn('truncate text-base font-bold text-foreground tracking-tight', className)}
        {...props}
      >
        {children}
      </h3>
      {sub ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function PanelControl({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'div';
  return (
    <Comp
      data-slot="panel-control"
      className={cn(
        'shrink-0 rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground',
        asChild &&
          'cursor-pointer transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        className
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Icon tile                                                                  */
/* -------------------------------------------------------------------------- */

export function IconTile({
  icon: Icon,
  tone = 'neutral',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims =
    size === 'sm' ? 'h-8 w-8 rounded-[10px]' : size === 'lg' ? 'h-12 w-12 rounded-tile' : 'h-10 w-10 rounded-tile';
  const glyph = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-5 w-5' : 'h-[18px] w-[18px]';
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center border', dims, TONE_TINT[tone], className)}
    >
      <Icon className={glyph} />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Badges & Pills                                                             */
/* -------------------------------------------------------------------------- */

export function StatPill({
  className,
  tone = 'neutral',
  ...props
}: React.ComponentProps<'span'> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border',
        TONE_TINT[tone],
        className
      )}
      {...props}
    />
  );
}

export function EmojiBadge({
  emoji,
  children,
  className,
}: {
  emoji: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-semibold',
        className
      )}
    >
      <span aria-hidden>{emoji}</span>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Highlight panel                                                            */
/* -------------------------------------------------------------------------- */

const HIGHLIGHT_FILL: Record<'secondary' | 'tertiary' | 'quaternary' | 'primary', string> = {
  primary: 'bg-brand-primary text-brand-primary-contrast',
  secondary: 'bg-brand-secondary text-brand-secondary-contrast',
  tertiary: 'bg-brand-tertiary text-brand-tertiary-contrast',
  quaternary: 'bg-brand-quaternary text-brand-quaternary-contrast',
};

export function HighlightPanel({
  accent = 'primary',
  title,
  stat,
  badge,
  footer,
  className,
  children,
}: {
  accent?: 'primary' | 'secondary' | 'tertiary' | 'quaternary';
  title: React.ReactNode;
  stat?: React.ReactNode;
  badge?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const fill = HIGHLIGHT_FILL[accent];
  return (
    <div className={cn('flex flex-col rounded-card p-5 sm:p-6 shadow-md', fill, className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider opacity-90">{title}</p>
        {badge ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-black/15 dark:bg-white/15 px-2.5 py-0.5 text-[11px] font-bold">
            {badge}
          </span>
        ) : null}
      </div>
      {stat ? <p className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight tnum">{stat}</p> : null}
      {children}
      {footer ? <p className="mt-2 text-xs font-medium opacity-80">{footer}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* StatBlock                                                                  */
/* -------------------------------------------------------------------------- */

export function StatBlock({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'neutral',
  tintValue = false,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  tintValue?: boolean;
  className?: string;
}) {
  return (
    <Panel className={cn('gap-0', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        {Icon ? <IconTile icon={Icon} tone={tone} size="sm" /> : null}
      </div>
      <p className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        <span
          className={cn(
            'text-2xl sm:text-3xl font-extrabold tracking-tight tnum',
            tintValue ? TONE_INK[tone] : 'text-foreground'
          )}
        >
          {value}
        </span>
        {unit ? <span className="text-xs font-medium text-muted-foreground">{unit}</span> : null}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* ProgressRing (Donut SVG)                                                   */
/* -------------------------------------------------------------------------- */

export function ProgressRing({
  percent,
  label,
  sublabel,
  accent = 'primary',
  size = 160,
  thickness = 14,
  className,
}: {
  percent: number;
  label: React.ReactNode;
  sublabel?: React.ReactNode;
  accent?: 'primary' | 'secondary' | 'tertiary';
  size?: number;
  thickness?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const stroke = `hsl(var(--brand-${accent}))`;

  return (
    <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
        <span className="text-2xl sm:text-3xl font-extrabold leading-none tracking-tight text-foreground tnum">
          {label}
        </span>
        {sublabel ? (
          <span className="mt-1 text-[11px] font-medium text-muted-foreground max-w-[110px] truncate">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LegendRow                                                                  */
/* -------------------------------------------------------------------------- */

export function LegendRow({
  color,
  label,
  value,
  delta,
  deltaGood = true,
}: {
  color: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'muted';
  label: React.ReactNode;
  value: React.ReactNode;
  delta?: React.ReactNode;
  deltaGood?: boolean;
}) {
  const dot =
    color === 'secondary'
      ? 'bg-brand-secondary'
      : color === 'tertiary'
      ? 'bg-brand-tertiary'
      : color === 'quaternary'
      ? 'bg-brand-quaternary'
      : color === 'primary'
      ? 'bg-brand-primary'
      : 'bg-muted-foreground/50';

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', dot)} />
        <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-base sm:text-lg font-bold tracking-tight text-foreground tnum">{value}</span>
        {delta ? (
          <span
            className={cn(
              'text-[11px] font-semibold tnum',
              deltaGood ? 'text-brand-primary-ink' : 'text-destructive'
            )}
          >
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pill bar chart                                                             */
/* -------------------------------------------------------------------------- */

export interface PillBar {
  label: string;
  percent: number;
  display?: string;
  active?: boolean;
  color?: string;
}

export function PillBarChart({
  bars,
  height = 140,
  accent = 'primary',
  className,
}: {
  bars: PillBar[];
  height?: number;
  accent?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
}) {
  return (
    <div className={cn('flex items-end gap-2 sm:gap-3', className)}>
      {bars.map((bar, i) => {
        const pct = Math.max(0, Math.min(100, Number.isFinite(bar.percent) ? bar.percent : 0));
        const fillPct = pct === 0 ? 0 : Math.max(pct, 12);
        return (
          <div key={`${bar.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              className="relative flex w-full max-w-[52px] items-end overflow-hidden rounded-full bg-muted/80"
              style={{ height }}
            >
              {pct > 0 ? (
                <div
                  className={cn(
                    'flex w-full items-start justify-center rounded-full pt-2 transition-all duration-700',
                    bar.active
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'bg-primary/25 text-foreground font-semibold'
                  )}
                  style={{
                    height: `${fillPct}%`,
                    backgroundColor: bar.color ? bar.color : undefined,
                  }}
                >
                  <span className="text-[10px] leading-none tnum">
                    {bar.display ?? `${Math.round(pct)}%`}
                  </span>
                </div>
              ) : (
                <span className="absolute inset-x-0 bottom-2 text-center text-[10px] font-medium leading-none text-muted-foreground">
                  0
                </span>
              )}
            </div>
            <span
              className={cn(
                'w-full truncate text-center text-[11px]',
                bar.active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground'
              )}
            >
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Meter                                                                      */
/* -------------------------------------------------------------------------- */

export function Meter({
  percent,
  accent = 'primary',
  className,
}: {
  percent: number;
  accent?: 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'danger';
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const fill =
    accent === 'secondary'
      ? 'bg-brand-secondary'
      : accent === 'tertiary'
      ? 'bg-brand-tertiary'
      : accent === 'quaternary'
      ? 'bg-brand-quaternary'
      : accent === 'danger'
      ? 'bg-destructive'
      : 'bg-primary';

  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', fill)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
