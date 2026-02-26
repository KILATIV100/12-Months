/**
 * // filepath: frontend/src/pages/GreetingPage.jsx
 *
 * Public greeting-card viewer.
 *
 * Opened by the recipient after scanning the QR code on the bouquet.
 * No Telegram auth required — fully public.
 *
 * Route: /greeting/:qrToken
 */
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { getGreeting } from '@api/media'

// ── Animation variants ────────────────────────────────────────────────────────

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
}

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
}

// ── GreetingPage ──────────────────────────────────────────────────────────────

export default function GreetingPage() {
  const { qrToken } = useParams()

  const { data: greeting, isLoading, isError } = useQuery({
    queryKey: ['greeting', qrToken],
    queryFn: () => getGreeting(qrToken),
    retry: 1,
    staleTime: Infinity,   // greeting content never changes
  })

  if (isLoading) return <LoadingView />
  if (isError || !greeting) return <NotFoundView />

  return (
    <div
      className="min-h-screen flex flex-col items-center px-5 py-8"
      style={{ background: 'var(--cream)', fontFamily: 'var(--font-sans)' }}
    >
      {/* Decorative petal band */}
      <PetalBand />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        {/* Brand */}
        <motion.div variants={fadeUp} className="text-center">
          <p
            className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--sage)]"
          >
            12 Місяців
          </p>
          <p className="text-[10px] text-[var(--textl)] mt-0.5">
            Преміум доставка квітів
          </p>
        </motion.div>

        {/* Big flower emoji */}
        <motion.div
          variants={fadeUp}
          className="text-7xl"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(28,54,16,0.15))' }}
        >
          🌸
        </motion.div>

        {/* Greeting header */}
        <motion.div variants={fadeUp} className="text-center">
          <h1
            className="text-2xl font-light text-[var(--deep)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Вам — квіти!
          </h1>
          {greeting.recipient_name && (
            <p className="mt-1 text-base text-[var(--textm)]">
              Для <span className="font-medium text-[var(--deep)]">{greeting.recipient_name}</span>
            </p>
          )}
        </motion.div>

        {/* Divider */}
        <motion.div variants={fadeUp} className="w-16 h-px bg-[var(--borderl)]" />

        {/* Content: video OR text */}
        {greeting.greeting_type === 'video' && greeting.greeting_url ? (
          <motion.div variants={fadeUp} className="w-full">
            <VideoPlayer url={greeting.greeting_url} />
          </motion.div>
        ) : greeting.greeting_type === 'text' && greeting.greeting_text ? (
          <motion.div variants={fadeUp} className="w-full">
            <TextGreeting text={greeting.greeting_text} />
          </motion.div>
        ) : (
          <motion.div variants={fadeUp} className="w-full">
            <DefaultGreeting />
          </motion.div>
        )}

        {/* Footer */}
        <motion.div variants={fadeUp} className="text-center mt-4">
          <p className="text-[10px] text-[var(--textl)] leading-relaxed">
            Замовлено у квітковій майстерні «12 Місяців»
          </p>
        </motion.div>
      </motion.div>

      {/* Bottom petal */}
      <PetalBand bottom />
    </div>
  )
}

// ── Video player ──────────────────────────────────────────────────────────────

function VideoPlayer({ url }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="text-center py-6 text-[var(--textl)] text-sm">
        Відео недоступне. Можливо, воно ще обробляється.
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-xl)] overflow-hidden shadow-lg bg-black">
      <video
        src={url}
        controls
        playsInline
        className="w-full max-h-[60vh] object-contain"
        onError={() => setError(true)}
      />
    </div>
  )
}

// ── Text greeting ─────────────────────────────────────────────────────────────

function TextGreeting({ text }) {
  return (
    <div
      className="relative rounded-[var(--radius-xl)] px-6 py-5 border border-[var(--borderl)]"
      style={{ background: 'var(--goldl)' }}
    >
      {/* Quote decoration */}
      <span
        className="absolute -top-4 left-5 text-5xl text-[var(--gold)] select-none"
        style={{ fontFamily: 'var(--font-serif)', lineHeight: 1, opacity: 0.35 }}
        aria-hidden="true"
      >
        "
      </span>

      <p
        className="text-base leading-relaxed text-[var(--deep)] text-center"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {text}
      </p>
    </div>
  )
}

// ── Default greeting (no content) ────────────────────────────────────────────

function DefaultGreeting() {
  return (
    <div
      className="rounded-[var(--radius-xl)] px-6 py-5 border border-[var(--borderl)] text-center"
      style={{ background: 'var(--cream2)' }}
    >
      <p
        className="text-base leading-relaxed text-[var(--textm)] italic"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        З найщирішими побажаннями та любов'ю!
      </p>
    </div>
  )
}

// ── Decorative petal band ─────────────────────────────────────────────────────

function PetalBand({ bottom }) {
  const petals = ['🌸', '🌺', '🌷', '🌹', '🌼', '💐']
  return (
    <div
      className={`flex justify-center gap-4 text-xl opacity-30 py-4 ${bottom ? 'mt-6' : 'mb-2'}`}
      aria-hidden="true"
    >
      {petals.map((p, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.2}s` }}>{p}</span>
      ))}
    </div>
  )
}

// ── Loading view ──────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-5"
      style={{ background: 'var(--cream)' }}
    >
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
        className="text-5xl"
      >
        🌸
      </motion.span>
      <p className="text-sm text-[var(--textl)]">Відкриваємо листівку…</p>
    </div>
  )
}

// ── Not found view ────────────────────────────────────────────────────────────

function NotFoundView() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 px-6"
      style={{ background: 'var(--cream)' }}
    >
      <span className="text-5xl">🥀</span>
      <p
        className="text-lg font-light text-[var(--deep)] text-center"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        Листівку не знайдено
      </p>
      <p className="text-sm text-[var(--textl)] text-center max-w-xs">
        Можливо, посилання застаріло або листівки ще не було додано до цього замовлення.
      </p>
    </div>
  )
}
