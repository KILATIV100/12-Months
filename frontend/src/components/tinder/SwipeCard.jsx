/**
 * // filepath: frontend/src/components/tinder/SwipeCard.jsx
 *
 * Single swipe card for Tinder-mode product selection.
 *
 * Props:
 *   product    — Product object { id, name, image_url, category, base_price, composition }
 *   onSwipe(dir) — callback with "left" | "right" when card is dismissed
 *   isTop      — only the top card is interactive / fully visible
 *   stackIndex — 0 = top, 1 = next, 2 = hidden (affects scale/offset)
 */
import { useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  useAnimation,
} from 'framer-motion'
import { clsx } from 'clsx'

// ── Constants ─────────────────────────────────────────────────────────────────

const SWIPE_THRESHOLD = 100   // px — card dismissed beyond this
const ROTATION_MAX    = 18    // degrees — max card tilt
const DISMISS_DIST    = 600   // px — fly-away distance

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' fill='none'%3E%3Crect width='400' height='400' fill='%23f0ebe0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='80' fill='%23b5cea0'%3E🌸%3C/text%3E%3C/svg%3E"

function formatPrice(n) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

// ── SwipeCard ─────────────────────────────────────────────────────────────────

export default function SwipeCard({ product, onSwipe, isTop, stackIndex }) {
  const controls = useAnimation()
  const x         = useMotionValue(0)
  const rotate    = useTransform(x, [-DISMISS_DIST, 0, DISMISS_DIST], [-ROTATION_MAX, 0, ROTATION_MAX])
  const likeOpacity    = useTransform(x, [0, SWIPE_THRESHOLD],    [0, 1])
  const dislikeOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0],   [1, 0])

  const [imgError, setImgError] = useState(false)

  async function handleDragEnd(_, info) {
    const offsetX = info.offset.x
    if (Math.abs(offsetX) >= SWIPE_THRESHOLD) {
      const dir = offsetX > 0 ? 'right' : 'left'
      await controls.start({
        x: dir === 'right' ? DISMISS_DIST : -DISMISS_DIST,
        opacity: 0,
        transition: { duration: 0.35, ease: 'easeOut' },
      })
      onSwipe(dir)
    } else {
      // Snap back to centre
      controls.start({ x: 0, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } })
    }
  }

  // Cards behind the top are scaled down and slightly shifted upward
  const scaleMap  = [1, 0.95, 0.90]
  const yOffMap   = [0, -12, -22]
  const zMap      = [10, 5, 1]

  const scale   = scaleMap[stackIndex] ?? 0.88
  const yOff    = yOffMap[stackIndex]  ?? -28
  const zIndex  = zMap[stackIndex]     ?? 0

  return (
    <motion.div
      animate={controls}
      style={{ x, rotate, zIndex, position: 'absolute', width: '100%' }}
      initial={{ scale, y: yOff }}
      whileHover={isTop ? { scale: 1.01 } : undefined}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={isTop ? handleDragEnd : undefined}
      className={clsx(
        'w-full select-none touch-none',
        isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none',
      )}
    >
      {/* ── Card body ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] shadow-[0_8px_40px_rgba(28,54,16,0.18)]"
        style={{ background: 'var(--cream2)' }}
      >
        {/* Flower image */}
        <div className="relative h-[62vw] max-h-[360px] overflow-hidden bg-[var(--cream3)]">
          <img
            src={!imgError && product.image_url ? product.image_url : PLACEHOLDER_SVG}
            alt={product.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Like overlay — green tint */}
          <motion.div
            style={{ opacity: likeOpacity }}
            className="absolute inset-0 flex items-center justify-center"
            pointerEvents="none"
          >
            <div className="absolute inset-0 bg-[var(--green)] opacity-20" />
            <div
              className="relative z-10 px-6 py-2 rounded-[var(--radius-md)] border-4 border-[var(--green)] rotate-[-12deg]"
              style={{ background: 'rgba(28,54,16,0.12)' }}
            >
              <span className="text-3xl font-extrabold text-[var(--green)] uppercase tracking-widest">
                ♥ Люблю
              </span>
            </div>
          </motion.div>

          {/* Dislike overlay — pink/red tint */}
          <motion.div
            style={{ opacity: dislikeOpacity }}
            className="absolute inset-0 flex items-center justify-center"
            pointerEvents="none"
          >
            <div className="absolute inset-0 bg-[var(--pink)] opacity-20" />
            <div
              className="relative z-10 px-6 py-2 rounded-[var(--radius-md)] border-4 border-[var(--pink)] rotate-[12deg]"
              style={{ background: 'rgba(200,80,80,0.12)' }}
            >
              <span className="text-3xl font-extrabold text-[var(--pink)] uppercase tracking-widest">
                ✕ Пропустити
              </span>
            </div>
          </motion.div>

          {/* Gradient overlay for text readability */}
          <div
            className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
            style={{ background: 'linear-gradient(transparent, rgba(28,20,10,0.55))' }}
          />

          {/* Category badge */}
          {product.category && (
            <span
              className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: 'rgba(250,248,242,0.88)', color: 'var(--deep)' }}
            >
              {product.category}
            </span>
          )}
        </div>

        {/* ── Text content ─────────────────────────────────────────────── */}
        <div className="px-5 py-4">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="text-xl font-medium text-[var(--deep)] leading-tight"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {product.name}
            </h3>
            <span
              className="text-lg font-bold text-[var(--gold)] tabular-nums flex-none"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatPrice(product.base_price)}
            </span>
          </div>

          {product.composition && (
            <p className="mt-2 text-sm text-[var(--textm)] leading-relaxed line-clamp-2">
              {product.composition}
            </p>
          )}
        </div>

        {/* ── Swipe hint (only on top card) ────────────────────────────── */}
        {isTop && (
          <div className="flex items-center justify-between px-5 pb-4 text-xs text-[var(--textl)]">
            <span>← Пропустити</span>
            <span className="text-[10px] opacity-50">перетягни</span>
            <span>Люблю →</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ── Action buttons (outside the card, used in TinderPage) ────────────────────

export function SwipeButtons({ onDislike, onLike, disabled }) {
  return (
    <div className="flex items-center justify-center gap-10 py-4">
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onDislike}
        disabled={disabled}
        className={clsx(
          'w-16 h-16 rounded-full flex items-center justify-center text-2xl',
          'border-2 border-[var(--pink)] bg-[var(--cream2)] shadow-md',
          'transition-opacity disabled:opacity-40',
        )}
        aria-label="Пропустити"
      >
        ✕
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={onLike}
        disabled={disabled}
        className={clsx(
          'w-16 h-16 rounded-full flex items-center justify-center text-2xl',
          'border-2 border-[var(--green)] bg-[var(--cream2)] shadow-md',
          'transition-opacity disabled:opacity-40',
        )}
        aria-label="Люблю"
      >
        ♥
      </motion.button>
    </div>
  )
}
