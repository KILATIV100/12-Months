/**
 * // filepath: frontend/src/components/constructor/AIHint.jsx
 *
 * AIHint — Claude Haiku florist tip displayed above ElementPicker.
 *
 * • Watches the current bouquet composition (element names list).
 * • Debounces changes by 1.5 s to avoid calling the API on every single tap.
 * • Shows a "Флорист думає…" skeleton while loading.
 * • Graceful: hides entirely if the bouquet is empty.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFlowersList, useConstructorOccasion, useConstructorTotal } from '@store/constructorStore'
import { getBouquetHint } from '@api/ai'

// ── useDebounce ───────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AIHint() {
  const flowersList = useFlowersList()
  const occasion    = useConstructorOccasion()
  const total       = useConstructorTotal()

  const [hint, setHint]       = useState('')
  const [loading, setLoading] = useState(false)
  const abortRef = useRef(null)

  // Debounce the flowers list (serialised as a string for stable comparison)
  const debouncedKey = useDebounce(flowersList.join('|'), 1500)

  useEffect(() => {
    if (flowersList.length === 0) {
      setHint('')
      return
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current = false

    setLoading(true)
    const cancelled = { value: false }
    abortRef.current = cancelled

    getBouquetHint({
      flowers_list: flowersList,
      budget:       Math.round(total),
      occasion:     occasion || '',
    })
      .then(({ hint: h }) => {
        if (!cancelled.value) setHint(h)
      })
      .catch(() => {
        if (!cancelled.value) setHint('')
      })
      .finally(() => {
        if (!cancelled.value) setLoading(false)
      })

    return () => { cancelled.value = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKey, occasion])

  if (flowersList.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        key="ai-hint"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="mx-4 overflow-hidden"
      >
        <div className="flex items-start gap-2 px-3 py-2.5 bg-[var(--goldl)] rounded-2xl border border-[var(--gold)]/40">
          <span className="text-lg shrink-0 mt-0.5">🌺</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-[var(--deep)] uppercase tracking-wider mb-0.5">
              Флорист підказує
            </p>
            {loading ? (
              <div className="h-3 w-3/4 bg-[var(--gold)]/30 rounded-full animate-pulse" />
            ) : (
              <p className="text-xs text-[var(--deep)] leading-snug">{hint}</p>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
