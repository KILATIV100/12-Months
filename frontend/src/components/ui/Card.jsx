/**
 * Card — surface container with consistent shadow + border.
 *
 * Variants:
 *   default  — cream background, subtle green border
 *   elevated — stronger shadow, used for modals / bottom sheets
 *   flat     — no shadow, only border (for list rows)
 *
 * Pass `interactive` to add hover/press effects (for clickable cards).
 */
import { clsx } from 'clsx'

const VARIANTS = {
  default: [
    'bg-[var(--cream2)]',
    'border border-[var(--border)]',
    'shadow-[var(--shadow-card)]',
    'rounded-[var(--radius-lg)]',
  ],
  elevated: [
    'bg-[var(--cream)]',
    'border border-[var(--border)]',
    'shadow-[var(--shadow-hover)]',
    'rounded-[var(--radius-xl)]',
  ],
  flat: [
    'bg-[var(--cream2)]',
    'border border-[var(--borderl)]',
    'rounded-[var(--radius-md)]',
  ],
}

export default function Card({
  children,
  variant = 'default',
  interactive = false,
  className = '',
  onClick,
  ...props
}) {
  const Tag = onClick ? 'button' : 'div'

  return (
    <Tag
      onClick={onClick}
      className={clsx(
        'overflow-hidden',
        VARIANTS[variant] ?? VARIANTS.default,
        interactive && [
          'cursor-pointer',
          'transition-all duration-[var(--transition-normal)]',
          'hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5',
          'active:translate-y-0 active:shadow-[var(--shadow-card)]',
        ],
        onClick && 'text-left w-full',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}
