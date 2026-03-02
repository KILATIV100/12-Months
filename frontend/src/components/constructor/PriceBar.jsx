/**
 * // filepath: frontend/src/components/constructor/PriceBar.jsx
 *
 * PriceBar — fixed bottom bar for the 2D constructor.
 *
 * Shows the current bouquet price (packaging + all items) and a
 * "В кошик" button.
 *
 * On "В кошик":
 *   1. Builds a custom-bouquet cart item.
 *   2. Calls cartStore.addCustomBouquet().
 *   3. Clears the constructor state.
 *   4. Navigates to /cart.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import useConstructorStore, {
  useConstructorTotal,
  useConstructorItems,
  useConstructorPackaging,
} from '@store/constructorStore'
import useCartStore from '@store/cartStore'
import { useTelegram } from '@hooks/useTelegram'

export default function PriceBar() {
  const navigate   = useNavigate()
  const items      = useConstructorItems()
  const packaging  = useConstructorPackaging()
  const total      = useConstructorTotal()
  const clearAll   = useConstructorStore((s) => s.clearAll)

  const addCustomBouquet = useCartStore((s) => s.addCustomBouquet)
  const { haptic } = useTelegram()

  const [added, setAdded] = useState(false)

  const isEmpty = items.length === 0 && !packaging

  function handleAddToCart() {
    if (isEmpty) return
    haptic.impact('light')

    // Build element list for the API
    const elements = items.map((i) => ({
      element_id: i.element.id,
      quantity:   1,
    }))

    addCustomBouquet({
      packagingId:    packaging?.id ?? null,
      packagingEmoji: packaging?.emoji ?? null,
      elements,
      elementDetails: items.map((i) => i.element),
      totalPrice:     total,
    })

    setAdded(true)
    setTimeout(() => {
      clearAll()
      navigate('/cart')
    }, 600)
  }

  return (
    <div
      className="px-4 py-3 bg-[var(--cream)] border-t border-[var(--border)]"
      style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}
    >
      <div className="flex items-center gap-3">
        {/* Price */}
        <div className="flex-1">
          <p className="text-[10px] text-[var(--textl)] mb-0.5">Вартість букету</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={total}
              initial={{ y: -4, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 4, opacity: 0 }}
              className="text-lg font-bold text-[var(--deep)]"
            >
              {total > 0 ? `${total} грн` : '0 грн'}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <button
          onClick={handleAddToCart}
          disabled={isEmpty || added}
          className={clsx(
            'px-5 py-3 rounded-2xl text-sm font-semibold transition-all',
            added
              ? 'bg-[var(--sage)] text-white scale-95'
              : isEmpty
                ? 'bg-[var(--cream3)] text-[var(--textl)] cursor-not-allowed'
                : 'bg-[var(--green)] text-white active:scale-95',
          )}
        >
          {added ? '✓ Додано!' : '🛒 В кошик'}
        </button>
      </div>

      {/* Composition summary */}
      {!isEmpty && (
        <p className="text-[10px] text-[var(--textl)] mt-1">
          {packaging ? `${packaging.emoji} пакування` : ''}
          {packaging && items.length > 0 ? ' · ' : ''}
          {items.length > 0 ? `${items.length} елементів` : ''}
        </p>
      )}
    </div>
  )
}
