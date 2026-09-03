import { cn } from '@/lib/utils';

export function BrandMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('brand-mark flex shrink-0 items-center justify-center shadow-md shadow-primary/20', className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
    >
      <svg
        width={size * 0.52}
        height={size * 0.52}
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-brand-primary-contrast"
      >
        <path d="m3 17 6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    </span>
  );
}

export default BrandMark;
