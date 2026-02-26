/**
 * ProductCard — displays one product in the catalogue grid.
 *
 * Shows: photo, category badge, name, price, add-to-cart button.
 * Handles the in-cart state (shows quantity stepper when added).
 * Triggers haptic feedback on add.
 */
import { clsx } from 'clsx'
import { Badge } from '@components/ui'
import useCartStore, { useItemQuantity } from '@store/cartStore'
import { useTelegram } from '@hooks/useTelegram'

const CATEGORY_LABELS = {
  bouquets: 'Готові букети',
  single:   'Поштучно',
  decor:    'Декор',
  green:    'Зелень',
}

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='none'%3E%3Crect width='400' height='400' fill='%23f0ebe0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='64' fill='%23b5cea0'%3E🌸%3C/text%3E%3C/svg%3E"

export default function ProductCard({ product }) {
  const { haptic } = useTelegram()
  const addItem = useCartStore((s) => s.addItem)
  const decrementItem = useCartStore((s) => s.decrementItem)
  const removeItem = useCartStore((s) => s.removeItem)
  const quantity = useItemQuantity(product.id)
  const inCart = quantity > 0

  function handleAdd(e) {
    e.stopPropagation()
    addItem(product)
    haptic.impact('light')
  }

  function handleIncrement(e) {
    e.stopPropagation()
    addItem(product)
    haptic.selection()
  }

  function handleDecrement(e) {
    e.stopPropagation()
    decrementItem(product.id)
    haptic.selection()
  }

  const formattedPrice = new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(product.base_price)

  return (
    <article
      className={clsx(
        'flex flex-col overflow-hidden',
        'bg-[var(--cream2)] rounded-[var(--radius-lg)]',
        'border border-[var(--border)]',
        'shadow-[var(--shadow-card)]',
        'transition-shadow duration-[var(--transition-normal)]',
        'hover:shadow-[var(--shadow-hover)]'
      )}
    >
      {/* ── Photo ─────────────────────────────────────────────── */}
      <div className="relative aspect-square overflow-hidden bg-[var(--cream3)]">
        <img
          src={product.image_url || PLACEHOLDER_SVG}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER_SVG }}
        />

        {/* Unavailable overlay */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded-full">
              Немає в наявності
            </span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute top-2 left-2">
          <Badge variant="sage">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </Badge>
        </div>
      </div>

      {/* ── Info ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <h3
          className="text-sm font-medium text-[var(--text)] leading-snug line-clamp-2"
          style={{ fontFamily: 'var(--font-sans)' }}
        >
          {product.name}
        </h3>

        <div className="flex items-center justify-between mt-auto gap-2">
          {/* Price */}
          <span
            className="text-base font-semibold text-[var(--gold)] leading-none"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {formattedPrice}
          </span>

          {/* Cart control */}
          {!product.is_available ? (
            <span className="text-[10px] text-[var(--textl)]">недоступно</span>
          ) : inCart ? (
            /* Stepper */
            <div
              className={clsx(
                'flex items-center gap-1',
                'bg-[var(--green)] rounded-[var(--radius-full)]',
                'px-1.5 py-1'
              )}
            >
              <button
                onClick={handleDecrement}
                className="w-6 h-6 flex items-center justify-center text-[var(--cream)] rounded-full hover:bg-[var(--mid)] active:bg-[var(--deep)] transition-colors"
                aria-label="Зменшити"
              >
                <MinusIcon />
              </button>
              <span className="text-[var(--cream)] text-sm font-semibold w-4 text-center leading-none">
                {quantity}
              </span>
              <button
                onClick={handleIncrement}
                className="w-6 h-6 flex items-center justify-center text-[var(--cream)] rounded-full hover:bg-[var(--mid)] active:bg-[var(--deep)] transition-colors"
                aria-label="Збільшити"
              >
                <PlusIcon />
              </button>
            </div>
          ) : (
            /* Add button */
            <button
              onClick={handleAdd}
              className={clsx(
                'flex items-center gap-1.5',
                'bg-[var(--green)] text-[var(--cream)]',
                'text-xs font-medium',
                'px-3 py-1.5 rounded-[var(--radius-full)]',
                'hover:bg-[var(--mid)] active:bg-[var(--deep)]',
                'transition-colors duration-[var(--transition-fast)]',
                'shadow-sm active:shadow-none'
              )}
              aria-label={`Додати ${product.name} до кошика`}
            >
              <PlusIcon className="w-3.5 h-3.5" />
              В кошик
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function PlusIcon({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}

function MinusIcon({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  )
}
