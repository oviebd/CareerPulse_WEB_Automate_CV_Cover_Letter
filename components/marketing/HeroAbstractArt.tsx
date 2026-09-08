import { cn } from '@/lib/utils';

type Variant = 'hero' | 'interview';

type Props = {
  variant?: Variant;
  className?: string;
};

/** Token-based SVG abstract art — documents, kanban, and interview motifs. */
export function HeroAbstractArt({ variant = 'hero', className }: Props) {
  const compact = variant === 'interview';

  return (
    <div
      className={cn(
        'relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden',
        compact ? 'min-h-[220px]' : 'min-h-[280px]',
        className
      )}
      aria-hidden
    >
      {/* Ambient orbs */}
      <div
        className="absolute -left-[10%] top-[5%] h-[45%] w-[45%] rounded-full opacity-40 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--color-primary-200) 0%, transparent 70%)',
        }}
      />
      <div
        className="absolute -right-[5%] bottom-[10%] h-[40%] w-[40%] rounded-full opacity-30 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--color-accent-mint) 0%, transparent 70%)',
        }}
      />

      <svg
        viewBox="0 0 480 360"
        className="relative z-10 h-full w-full max-w-md px-4"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Kanban board silhouette */}
        <rect
          x="40"
          y="48"
          width="120"
          height="140"
          rx="12"
          fill="var(--color-surface)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <rect x="52" y="62" width="96" height="28" rx="6" fill="var(--color-primary-100)" />
        <rect x="52" y="98" width="96" height="22" rx="5" fill="var(--color-surface-2)" />
        <rect x="52" y="128" width="96" height="22" rx="5" fill="var(--color-surface-2)" />
        <rect x="52" y="158" width="72" height="18" rx="4" fill="var(--color-accent-mint)" opacity="0.35" />

        <rect
          x="180"
          y="48"
          width="120"
          height="140"
          rx="12"
          fill="var(--color-surface)"
          stroke="var(--color-border)"
          strokeWidth="1.5"
        />
        <rect x="192" y="62" width="96" height="28" rx="6" fill="var(--color-primary-200)" />
        <rect x="192" y="98" width="96" height="22" rx="5" fill="var(--color-surface-2)" />
        <rect x="192" y="128" width="96" height="22" rx="5" fill="var(--color-primary-100)" />

        {/* CV document */}
        <g transform="translate(320, 32) rotate(4)">
          <rect
            x="0"
            y="0"
            width="130"
            height="170"
            rx="10"
            fill="var(--color-surface)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <rect x="16" y="20" width="60" height="8" rx="4" fill="var(--color-primary-500)" />
          <rect x="16" y="36" width="98" height="5" rx="2.5" fill="var(--color-surface-2)" />
          <rect x="16" y="48" width="88" height="5" rx="2.5" fill="var(--color-surface-2)" />
          <rect x="16" y="68" width="40" height="5" rx="2.5" fill="var(--color-primary-300)" />
          <rect x="16" y="82" width="98" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="16" y="92" width="92" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="16" y="102" width="85" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="16" y="120" width="50" height="5" rx="2.5" fill="var(--color-primary-300)" />
          <rect x="16" y="134" width="98" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="16" y="144" width="90" height="4" rx="2" fill="var(--color-surface-2)" />
        </g>

        {/* Cover letter (offset) */}
        <g transform="translate(290, 200) rotate(-6)">
          <rect
            x="0"
            y="0"
            width="110"
            height="140"
            rx="10"
            fill="var(--color-surface)"
            stroke="var(--color-border)"
            strokeWidth="1.5"
          />
          <rect x="14" y="18" width="50" height="6" rx="3" fill="var(--color-accent-mint)" opacity="0.7" />
          <rect x="14" y="34" width="82" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="14" y="44" width="78" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="14" y="54" width="80" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="14" y="72" width="82" height="4" rx="2" fill="var(--color-surface-2)" />
          <rect x="14" y="82" width="75" height="4" rx="2" fill="var(--color-surface-2)" />
        </g>

        {/* Interview / conversation motif */}
        <circle
          cx="120"
          cy="260"
          r="52"
          fill="var(--color-primary-50)"
          stroke="var(--color-primary-200)"
          strokeWidth="1.5"
        />
        <circle cx="120" cy="260" r="32" fill="var(--color-primary-100)" opacity="0.6" />
        <path
          d="M120 228 L120 292 M88 260 L152 260"
          stroke="var(--color-primary-400)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="120" cy="260" r="8" fill="var(--color-primary-500)" />

        {/* Decorative arcs */}
        <path
          d="M60 300 Q240 340 420 280"
          stroke="var(--color-accent-gold)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="400" cy="80" r="6" fill="var(--color-accent-gold)" opacity="0.6" />
        <circle cx="360" cy="300" r="4" fill="var(--color-accent-mint)" opacity="0.7" />
      </svg>
    </div>
  );
}
