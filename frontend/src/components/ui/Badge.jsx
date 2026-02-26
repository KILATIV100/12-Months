/**
 * Badge — small pill label for statuses, tags, counts.
 *
 * Variants:
 *   sage    — muted green (default; category tags)
 *   gold    — gold (prices, premium)
 *   pink    — pink (events, likes)
 *   green   — strong green (available, success)
 *   neutral — grey (inactive, info)
 *   count   — compact circular counter (cart badge)
 */
import { clsx } from 'clsx'

const VARIANTS = {
  sage: 'bg-[var(--sage2)] text-[var(--green)]',
  gold: 'bg-[var(--goldl)] text-[var(--deep)]',
  pink: 'bg-[var(--pinkl)] text-[#8b4a52]',
  green: 'bg-[var(--light)] text-[var(--cream)]',
  neutral: 'bg-[var(--cream3)] text-[var(--textm)]',
  count: [
    'bg-[var(--pink)] text-white',
    'min-w-[18px] h-[18px] flex items-center justify-center',
    'rounded-full text-[10px] font-bold leading-none px-1',
  ],
}

export default function Badge({
  children,
  variant = 'sage',
  className = '',
  ...props
}) {
  const isCount = variant === 'count'

  return (
    <span
      className={clsx(
        'font-medium',
        !isCount && 'inline-flex items-center px-2 py-0.5 text-xs rounded-[var(--radius-full)]',
        VARIANTS[variant] ?? VARIANTS.sage,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
