/**
 * Button — base interactive element.
 *
 * Variants:
 *   primary   — solid green (main CTA)
 *   secondary — outlined green
 *   ghost     — transparent, text only
 *   danger    — solid red-ish (destructive actions)
 *   gold      — gold accent (premium / price CTA)
 *
 * Sizes: sm | md | lg
 */
import { clsx } from 'clsx'

const VARIANTS = {
  primary: [
    'text-[var(--cream)] font-medium',
    'bg-[var(--green)] hover:bg-[var(--mid)] active:bg-[var(--deep)]',
    'border border-transparent',
    'shadow-sm active:shadow-none',
  ],
  secondary: [
    'text-[var(--green)] font-medium',
    'bg-transparent hover:bg-[var(--cream2)] active:bg-[var(--cream3)]',
    'border border-[var(--light)]',
  ],
  ghost: [
    'text-[var(--green)] font-medium',
    'bg-transparent hover:bg-[var(--cream2)] active:bg-[var(--cream3)]',
    'border border-transparent',
  ],
  danger: [
    'text-white font-medium',
    'bg-[#c0392b] hover:bg-[#a93226] active:bg-[#922b21]',
    'border border-transparent',
  ],
  gold: [
    'text-[var(--deep)] font-semibold',
    'bg-[var(--gold)] hover:bg-[var(--goldl)] active:opacity-90',
    'border border-transparent',
  ],
}

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-[var(--radius-sm)]',
  md: 'px-5 py-2.5 text-sm rounded-[var(--radius-md)]',
  lg: 'px-6 py-3 text-base rounded-[var(--radius-lg)]',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={clsx(
        // Base
        'inline-flex items-center justify-center gap-2',
        'transition-all duration-[var(--transition-fast)]',
        'select-none outline-none',
        'focus-visible:ring-2 focus-visible:ring-[var(--light)] focus-visible:ring-offset-1',
        // Variant
        VARIANTS[variant] ?? VARIANTS.primary,
        // Size
        SIZES[size] ?? SIZES.md,
        // State
        fullWidth && 'w-full',
        isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
