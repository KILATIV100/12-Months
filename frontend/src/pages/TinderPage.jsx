/**
 * // filepath: frontend/src/pages/TinderPage.jsx
 *
 * Tinder-mode bouquet selector.
 *
 * Flow:
 *   1. Fetch up to 20 available products from the catalogue API.
 *   2. Show them as a swipeable card stack (framer-motion).
 *   3. After 10 swipes → "Аналізуємо смак..." loading screen.
 *   4. POST /api/swipes/session → get AI summary + 3 recommendations.
 *   5. Show results screen with Telegram MainButton → back to Catalog.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTelegram } from '@hooks/useTelegram'
import SwipeCard, { SwipeButtons } from '@components/tinder/SwipeCard'
import client from '@api/client'
import { createSwipeSession } from '@api/swipes'

// ── Constants ─────────────────────────────────────────────────────────────────

const SWIPES_TO_ANALYZE = 10   // send to AI after this many swipes
const CARDS_PER_FETCH   = 20   // how many products to load at once

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='none'%3E%3Crect width='80' height='80' fill='%23f0ebe0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='%23b5cea0'%3E🌸%3C/text%3E%3C/svg%3E"

function formatPrice(n) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

// ── Fetch products ─────────────────────────────────────────────────────────────

async function fetchTinderProducts() {
  const { data } = await client.get('/api/products', {
    params: { available_only: true, limit: CARDS_PER_FETCH, offset: 0 },
  })
  return data.items ?? []
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TinderPage() {
  const navigate = useNavigate()
  const { tg, showMainButton, hideMainButton, haptic, showBackButton, hideBackButton } = useTelegram()

  const [cardIndex, setCardIndex]     = useState(0)   // which card is on top
  const [likedIds, setLikedIds]       = useState([])
  const [dislikedIds, setDislikedIds] = useState([])
  const [phase, setPhase]             = useState('swiping')  // swiping | analyzing | results

  const resultsRef = useRef(null)

  // ── Load products ────────────────────────────────────────────────────────
  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ['tinder-products'],
    queryFn: fetchTinderProducts,
    staleTime: 1000 * 60 * 10,
  })

  // ── Swipe session mutation ───────────────────────────────────────────────
  const swipeMutation = useMutation({
    mutationFn: createSwipeSession,
    onSuccess: (data) => {
      resultsRef.current = data
      setPhase('results')
    },
    onError: () => {
      // Still show results with empty summary on error
      resultsRef.current = { ai_summary: 'Аналіз недоступний. Спробуйте ще раз.', recommendations: [] }
      setPhase('results')
    },
  })

  // ── Swipe threshold reached → analyze ────────────────────────────────────
  const totalSwiped = likedIds.length + dislikedIds.length

  useEffect(() => {
    if (phase === 'swiping' && totalSwiped >= SWIPES_TO_ANALYZE) {
      setPhase('analyzing')
      swipeMutation.mutate({ liked_ids: likedIds, disliked_ids: dislikedIds })
    }
  }, [totalSwiped, phase])

  // ── Also trigger when all cards are exhausted ─────────────────────────────
  useEffect(() => {
    if (
      phase === 'swiping' &&
      products.length > 0 &&
      cardIndex >= products.length &&
      totalSwiped > 0
    ) {
      setPhase('analyzing')
      swipeMutation.mutate({ liked_ids: likedIds, disliked_ids: dislikedIds })
    }
  }, [cardIndex, products.length, phase, totalSwiped])

  // ── Handle a swipe ────────────────────────────────────────────────────────
  const handleSwipe = useCallback((dir) => {
    const product = products[cardIndex]
    if (!product) return

    haptic?.impact('light')

    if (dir === 'right') {
      setLikedIds((prev) => [...prev, product.id])
    } else {
      setDislikedIds((prev) => [...prev, product.id])
    }
    setCardIndex((i) => i + 1)
  }, [cardIndex, products, haptic])

  // ── Telegram back button ──────────────────────────────────────────────────
  useEffect(() => {
    if (!tg) return
    tg.BackButton.show()
    tg.BackButton.onClick(() => navigate(-1))
    return () => {
      tg.BackButton.hide()
      tg.BackButton.offClick(() => navigate(-1))
    }
  }, [tg, navigate])

  // ── MainButton on results screen ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'results') return
    const handler = () => navigate('/catalog')
    showMainButton?.('До каталогу 🌸', handler, { color: '#1c3610', textColor: '#faf8f2' })
    return () => hideMainButton?.(handler)
  }, [phase, navigate, showMainButton, hideMainButton])

  // ── Render guards ─────────────────────────────────────────────────────────
  if (isLoading) return <LoadingScreen message="Завантажуємо букети…" />
  if (isError)   return <ErrorScreen onBack={() => navigate(-1)} />

  if (phase === 'analyzing') return <LoadingScreen message="Аналізуємо ваш смак…" ai />

  if (phase === 'results') {
    return (
      <ResultsScreen
        summary={resultsRef.current?.ai_summary ?? ''}
        recommendations={resultsRef.current?.recommendations ?? []}
        liked={likedIds.length}
        disliked={dislikedIds.length}
        onCatalog={() => navigate('/catalog')}
        onRestart={() => {
          setCardIndex(0)
          setLikedIds([])
          setDislikedIds([])
          setPhase('swiping')
          resultsRef.current = null
        }}
      />
    )
  }

  // ── Cards exhausted without hitting threshold ────────────────────────────
  if (cardIndex >= products.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 min-h-screen px-6 pb-24" style={{ paddingTop: 'var(--safe-top)' }}>
        <span className="text-5xl">🌹</span>
        <p className="text-center text-[var(--textm)]">Всі букети переглянуто!</p>
        <button
          onClick={() => { setCardIndex(0); setLikedIds([]); setDislikedIds([]) }}
          className="px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--green)] text-[var(--cream)] text-sm font-medium"
        >
          Почати знову
        </button>
      </div>
    )
  }

  // ── Main swiping UI ───────────────────────────────────────────────────────
  const visibleCards = products.slice(cardIndex, cardIndex + 3)

  return (
    <div
      className="flex flex-col min-h-screen pb-6"
      style={{ paddingTop: 'var(--safe-top)', background: 'var(--cream)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-light text-[var(--deep)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Тіндер-режим
          </h1>
          <p className="text-xs text-[var(--textl)] mt-0.5">
            {totalSwiped} / {SWIPES_TO_ANALYZE} свайпів
          </p>
        </div>

        {/* Progress pills */}
        <div className="flex gap-1">
          {Array.from({ length: SWIPES_TO_ANALYZE }).map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-4 rounded-full transition-all duration-300"
              style={{
                background: i < likedIds.length
                  ? 'var(--green)'
                  : i < totalSwiped
                  ? 'var(--pink)'
                  : 'var(--cream3)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative flex items-center justify-center px-4">
        <div className="relative w-full" style={{ height: 'clamp(360px, 72vw, 520px)' }}>
          <AnimatePresence>
            {visibleCards.map((product, i) => (
              <SwipeCard
                key={product.id}
                product={product}
                isTop={i === 0}
                stackIndex={i}
                onSwipe={i === 0 ? handleSwipe : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Action buttons */}
      <SwipeButtons
        onDislike={() => handleSwipe('left')}
        onLike={() => handleSwipe('right')}
        disabled={cardIndex >= products.length}
      />
    </div>
  )
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ message, ai }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-5 min-h-screen"
      style={{ paddingTop: 'var(--safe-top)', background: 'var(--cream)' }}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
        className="text-5xl"
      >
        {ai ? '✨' : '🌸'}
      </motion.div>
      <p
        className="text-base font-light text-[var(--deep)] text-center px-8"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {message}
      </p>
      {ai && (
        <p className="text-xs text-[var(--textl)] text-center px-10">
          Claude AI аналізує ваші вподобання…
        </p>
      )}
    </div>
  )
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen px-6" style={{ paddingTop: 'var(--safe-top)' }}>
      <span className="text-4xl">😔</span>
      <p className="text-center text-[var(--textm)]">Не вдалось завантажити букети.</p>
      <button onClick={onBack} className="text-[var(--green)] text-sm underline">
        Назад
      </button>
    </div>
  )
}

// ── Results screen ────────────────────────────────────────────────────────────

function ResultsScreen({ summary, recommendations, liked, disliked, onCatalog, onRestart }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col min-h-screen px-4 pb-32"
      style={{ paddingTop: 'var(--safe-top)', background: 'var(--cream)' }}
    >
      {/* Hero */}
      <div className="text-center py-8">
        <span className="text-5xl">✨</span>
        <h1
          className="mt-4 text-2xl font-light text-[var(--deep)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Ваш квітковий смак
        </h1>
        <p className="text-xs text-[var(--textl)] mt-1">
          ♥ {liked} · ✕ {disliked}
        </p>
      </div>

      {/* AI summary card */}
      <div
        className="rounded-[var(--radius-xl)] px-5 py-4 mb-6 border border-[var(--borderl)]"
        style={{ background: 'var(--goldl)' }}
      >
        <p className="text-xs font-medium text-[var(--gold)] uppercase tracking-wider mb-2">
          Аналіз від Claude AI
        </p>
        <p className="text-sm text-[var(--deep)] leading-relaxed italic">
          "{summary}"
        </p>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <>
          <p className="text-sm font-medium text-[var(--textm)] mb-3">
            Рекомендовані букети для вас:
          </p>
          <div className="space-y-3 mb-6">
            {recommendations.map((product) => (
              <RecommendationCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto">
        <button
          onClick={onCatalog}
          className="w-full py-3.5 rounded-[var(--radius-lg)] bg-[var(--green)] text-[var(--cream)] text-sm font-medium"
        >
          Перейти до каталогу 🌸
        </button>
        <button
          onClick={onRestart}
          className="w-full py-3 rounded-[var(--radius-lg)] border border-[var(--border)] text-[var(--textm)] text-sm"
        >
          Почати знову
        </button>
      </div>
    </motion.div>
  )
}

function RecommendationCard({ product }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--borderl)] p-3"
      style={{ background: 'var(--cream2)' }}
    >
      <div className="w-14 h-14 flex-none rounded-[var(--radius-md)] overflow-hidden bg-[var(--cream3)]">
        <img
          src={!imgError && product.image_url ? product.image_url : PLACEHOLDER_SVG}
          alt={product.name}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text)] truncate">{product.name}</p>
        {product.category && (
          <p className="text-xs text-[var(--textl)]">{product.category}</p>
        )}
      </div>
      <span
        className="text-sm font-bold text-[var(--gold)] tabular-nums"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        {formatPrice(product.base_price)}
      </span>
    </div>
  )
}
