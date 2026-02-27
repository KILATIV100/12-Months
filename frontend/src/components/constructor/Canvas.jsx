/**
 * // filepath: frontend/src/components/constructor/Canvas.jsx
 *
 * Canvas — 2D bouquet construction zone.
 *
 * • Shows the selected packaging as a centred background emoji.
 * • Each item (flower / green / decor) placed by the user appears as a
 *   large emoji that can be freely dragged within the canvas bounds.
 * • Double-tap / long-press brings up a remove "×" button via a
 *   small floating delete chip.
 * • Uses framer-motion drag with dragConstraints tied to the container ref.
 */
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import useConstructorStore, {
  useConstructorItems,
  useConstructorPackaging,
} from '@store/constructorStore'

// ── Item on canvas ────────────────────────────────────────────────────────────

function CanvasItem({ item, containerRef }) {
  const moveElement   = useConstructorStore((s) => s.moveElement)
  const removeElement = useConstructorStore((s) => s.removeElement)
  const [showDelete, setShowDelete] = useState(false)

  function handleDragEnd(_, info) {
    // `info.point` is screen coords; we need position relative to the container
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // framer-motion returns the drag offset from the initial position
    moveElement(item.instanceId, item.x + info.offset.x, item.y + info.offset.y)
  }

  return (
    <motion.div
      key={item.instanceId}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      initial={{ scale: 0, opacity: 0, x: item.x, y: item.y }}
      animate={{ scale: 1, opacity: 1, x: item.x, y: item.y }}
      exit={{ scale: 0, opacity: 0 }}
      onDragEnd={handleDragEnd}
      onTap={() => setShowDelete((v) => !v)}
      style={{ position: 'absolute', touchAction: 'none', cursor: 'grab' }}
      className="select-none"
      whileDrag={{ scale: 1.15, cursor: 'grabbing', zIndex: 50 }}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="text-4xl drop-shadow-sm leading-none"
          style={{ userSelect: 'none' }}
        >
          {item.element.emoji ?? '🌸'}
        </span>

        {/* Delete chip */}
        <AnimatePresence>
          {showDelete && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation()
                removeElement(item.instanceId)
              }}
              className={clsx(
                'absolute -top-2 -right-2 w-5 h-5 rounded-full',
                'bg-[#c0392b] text-white text-[10px] font-bold',
                'flex items-center justify-center shadow-md z-50',
              )}
            >
              ×
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

export default function Canvas() {
  const containerRef = useRef(null)
  const items     = useConstructorItems()
  const packaging = useConstructorPackaging()

  return (
    <div
      ref={containerRef}
      className={clsx(
        'relative w-full overflow-hidden rounded-3xl',
        'bg-gradient-to-b from-[#fdfaf5] to-[#f0ebe0]',
        'border border-[var(--border)] shadow-inner',
      )}
      style={{ height: '52vw', maxHeight: 320, minHeight: 200 }}
    >
      {/* Packaging background */}
      {packaging ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <span className="text-[80px] opacity-30 leading-none">
            {packaging.emoji ?? '📦'}
          </span>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
          <span className="text-5xl opacity-20">💐</span>
          <p className="text-[var(--textl)] text-xs opacity-60">
            Оберіть пакування та додайте квіти
          </p>
        </div>
      )}

      {/* Draggable items */}
      <AnimatePresence>
        {items.map((item) => (
          <CanvasItem
            key={item.instanceId}
            item={item}
            containerRef={containerRef}
          />
        ))}
      </AnimatePresence>

      {/* Items count badge */}
      {items.length > 0 && (
        <div
          className={clsx(
            'absolute top-2 right-2 bg-[var(--green)]/90 text-white',
            'text-[11px] font-semibold px-2 py-0.5 rounded-full',
            'backdrop-blur-sm',
          )}
        >
          {items.length} {items.length === 1 ? 'елемент' : items.length < 5 ? 'елементи' : 'елементів'}
        </div>
      )}
    </div>
  )
}
