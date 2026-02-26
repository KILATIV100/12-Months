/**
 * CartPage — shopping cart screen.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │ Header "Мій кошик (N)"           │
 *   │ Cart item rows (image, name,     │
 *   │   stepper, price, remove)        │
 *   │  ─────────────────────────────── │
 *   │ Order summary (subtotal)         │
 *   │ [Оформити замовлення] CTA        │
 *   └──────────────────────────────────┘
 *
 * When in Telegram, the native MainButton shows the total and triggers checkout.
 * Outside Telegram, a regular button is rendered inside the page.
 *
 * Checkout routing: navigates to /checkout (Sprint 4).
 */
import { useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
import useCartStore, { useCartItems, useCartTotal, useCartCount } from '@store/cartStore'
import { Button } from '@components/ui'
import { useTelegram } from '@hooks/useTelegram'

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='none'%3E%3Crect width='200' height='200' fill='%23f0ebe0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='48' fill='%23b5cea0'%3E🌸%3C/text%3E%3C/svg%3E"

function formatPrice(n) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export default function CartPage() {
  const navigate    = useNavigate()
  const items       = useCartItems()
  const total       = useCartTotal()
  const count       = useCartCount()
  const addItem     = useCartStore((s) => s.addItem)
  const decrement   = useCartStore((s) => s.decrementItem)
  const removeItem  = useCartStore((s) => s.removeItem)
  const clearCart   = useCartStore((s) => s.clearCart)

  const { tg, showMainButton, hideMainButton, haptic } = useTelegram()

  // ── Telegram MainButton ──────────────────────────────────
  const handleCheckout = useCallback(() => {
    haptic.impact('medium')
    navigate('/checkout')
  }, [navigate, haptic])

  useEffect(() => {
    if (!tg || count === 0) {
      hideMainButton(handleCheckout)
      return
    }
    showMainButton(
      `Оформити замовлення · ${formatPrice(total)}`,
      handleCheckout,
      { color: '#1c3610', textColor: '#faf8f2' }
    )
    return () => hideMainButton(handleCheckout)
  }, [tg, count, total, showMainButton, hideMainButton, handleCheckout])

  // ── Empty state ──────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 px-6 pb-[80px]"
        style={{ minHeight: '100dvh', paddingTop: 'var(--safe-top)' }}
      >
        <span className="text-6xl">🛒</span>
        <h2
          className="text-xl font-light text-[var(--deep)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Кошик порожній
        </h2>
        <p className="text-sm text-[var(--textm)] text-center leading-relaxed">
          Додайте квіти з каталогу —<br />вони чекають на вас 🌸
        </p>
        <Button onClick={() => navigate('/catalog')} variant="primary" size="lg">
          Перейти до каталогу
        </Button>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col min-h-screen pb-[80px]"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      {/* ── Header ────────────────────────────────────────── */}
      <div
        className={clsx(
          'sticky top-0 z-[var(--z-overlay)]',
          'bg-[var(--cream)]/95 backdrop-blur-md',
          'border-b border-[var(--borderl)]',
          'px-4 py-3 flex items-center justify-between'
        )}
      >
        <h1
          className="text-lg font-light text-[var(--deep)] tracking-wide"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Мій кошик
          <span className="ml-2 text-sm text-[var(--textl)] font-normal" style={{ fontFamily: 'var(--font-sans)' }}>
            ({count})
          </span>
        </h1>

        <button
          onClick={() => {
            haptic.notification('warning')
            clearCart()
          }}
          className="text-xs text-[var(--textl)] hover:text-[#c0392b] transition-colors"
        >
          Очистити
        </button>
      </div>

      {/* ── Item list ─────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-3 space-y-3">
        <AnimatePresence initial={false}>
          {items.map(({ product, quantity }) => (
            <motion.div
              key={product.id}
              layout
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -48, transition: { duration: 0.2 } }}
              className={clsx(
                'flex items-center gap-3',
                'bg-[var(--cream2)] rounded-[var(--radius-lg)]',
                'border border-[var(--borderl)]',
                'p-3'
              )}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 flex-none rounded-[var(--radius-md)] overflow-hidden bg-[var(--cream3)]">
                <img
                  src={product.image_url || PLACEHOLDER_SVG}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = PLACEHOLDER_SVG }}
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text)] truncate leading-snug">
                  {product.name}
                </p>
                <p
                  className="text-sm text-[var(--gold)] font-semibold mt-0.5"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {formatPrice(product.base_price * quantity)}
                </p>
                {quantity > 1 && (
                  <p className="text-[10px] text-[var(--textl)]">
                    {formatPrice(product.base_price)} × {quantity}
                  </p>
                )}
              </div>

              {/* Quantity stepper + remove */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex items-center gap-1 bg-[var(--cream3)] rounded-[var(--radius-full)] px-1 py-0.5">
                  <StepBtn onClick={() => { decrement(product.id); haptic.selection() }} aria="Зменшити">
                    <MinusIcon />
                  </StepBtn>
                  <span className="text-sm font-semibold text-[var(--text)] w-5 text-center">
                    {quantity}
                  </span>
                  <StepBtn onClick={() => { addItem(product); haptic.selection() }} aria="Збільшити">
                    <PlusIcon />
                  </StepBtn>
                </div>

                <button
                  onClick={() => { removeItem(product.id); haptic.notification('error') }}
                  className="text-[var(--textl)] hover:text-[#c0392b] transition-colors p-1"
                  aria-label="Видалити з кошика"
                >
                  <TrashIcon />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Order summary ─────────────────────────────────── */}
      <div className="px-4 pt-4 pb-2 border-t border-[var(--borderl)] mt-4 space-y-3">
        {/* Subtotal row */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--textm)]">Сума замовлення</span>
          <span
            className="font-semibold text-[var(--text)]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {formatPrice(total)}
          </span>
        </div>

        {/* Delivery note */}
        <p className="text-[11px] text-[var(--textl)] leading-relaxed">
          Вартість доставки розраховується при оформленні.
        </p>

        {/* CTA — shown only when NOT in Telegram (MainButton covers it) */}
        {!tg && (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleCheckout}
            className="mt-1"
          >
            Оформити замовлення · {formatPrice(total)}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBtn({ onClick, aria, children }) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className={clsx(
        'w-6 h-6 flex items-center justify-center',
        'text-[var(--green)] rounded-full',
        'hover:bg-[var(--cream)] active:bg-[var(--sage2)]',
        'transition-colors duration-[var(--transition-fast)]'
      )}
    >
      {children}
    </button>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="8" y1="2" x2="8" y2="14" /><line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
