/**
 * // filepath: frontend/src/pages/CalendarPage.jsx
 *
 * CalendarPage — "Мої дати" screen.
 *
 * Shows a list of upcoming important dates sorted by next occurrence.
 * Each item has a colour-coded dot (pink/gold/green) and a "через X днів" badge.
 * A FAB (+) button opens EventForm to add a new date.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useTelegram } from '@hooks/useTelegram'
import EventForm from '@components/calendar/EventForm'
import { getDates, createDate, deleteDate } from '@api/dates'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DOT_CLASSES = {
  pink:  'bg-[var(--pink)]',
  gold:  'bg-[var(--gold)]',
  green: 'bg-[var(--sage)]',
}

const BADGE_CLASSES = {
  urgent:  'bg-[var(--pinkl)] text-[#8b4a52] border-[var(--pink)]',
  soon:    'bg-[var(--goldl)] text-[var(--deep)] border-[var(--gold)]',
  default: 'bg-[var(--cream3)] text-[var(--textm)] border-[var(--border)]',
}

function daysLabel(days) {
  if (days === 0)  return 'сьогодні!'
  if (days === 1)  return 'завтра'
  if (days <= 7)   return `через ${days} дн.`
  if (days <= 30)  return `через ${days} дн.`
  if (days < 365)  return `через ${Math.round(days / 30)} міс.`
  return `через ${Math.round(days / 365)} р.`
}

function badgeVariant(days) {
  if (days <= 1)  return 'urgent'
  if (days <= 7)  return 'soon'
  return 'default'
}

function formatDate(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })
}

// ── CalendarPage ──────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { tg } = useTelegram()
  const qc = useQueryClient()

  const [formOpen, setFormOpen]       = useState(false)
  const [deletingId, setDeletingId]   = useState(null)

  const { data: dates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['important-dates'],
    queryFn: getDates,
    staleTime: 1000 * 60 * 2,
  })

  const createMutation = useMutation({
    mutationFn: createDate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['important-dates'] })
      setFormOpen(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteDate,
    onMutate: (id) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null)
      qc.invalidateQueries({ queryKey: ['important-dates'] })
    },
  })

  return (
    <div
      className="flex flex-col min-h-screen pb-28"
      style={{ paddingTop: 'var(--safe-top)', background: 'var(--cream)' }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <div
        className={clsx(
          'sticky top-0 z-[var(--z-overlay)]',
          'bg-[var(--cream)]/95 backdrop-blur-md',
          'border-b border-[var(--borderl)]',
          'px-4 py-4',
        )}
      >
        <h1
          className="text-xl font-light text-[var(--deep)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Мій Календар
        </h1>
        <p className="text-xs text-[var(--textl)] mt-0.5">
          Важливі дати з автонагадуванням
        </p>
      </div>

      {/* ── Content ──────────────────────────────────────────────── */}
      <div className="flex-1 px-4 py-4">

        {isLoading && <SkeletonList />}

        {isError && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="text-4xl">😔</span>
            <p className="text-sm text-[var(--textm)]">Не вдалось завантажити дати</p>
            <button onClick={refetch} className="text-xs text-[var(--green)] underline">
              Спробувати ще раз
            </button>
          </div>
        )}

        {!isLoading && !isError && dates.length === 0 && (
          <EmptyState onAdd={() => setFormOpen(true)} />
        )}

        {!isLoading && !isError && dates.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {dates.map((item) => (
                <DateCard
                  key={item.id}
                  item={item}
                  onDelete={() => deleteMutation.mutate(item.id)}
                  isDeleting={deletingId === item.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── FAB — add new date ──────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.90 }}
        onClick={() => setFormOpen(true)}
        className={clsx(
          'fixed right-5 z-30',
          'w-14 h-14 rounded-full shadow-xl',
          'flex items-center justify-center text-2xl',
          'bg-[var(--green)] text-[var(--cream)]',
        )}
        style={{ bottom: 'calc(var(--safe-bottom, 0px) + 80px)' }}
        aria-label="Додати дату"
      >
        +
      </motion.button>

      {/* ── Event Form drawer ─────────────────────────────────────── */}
      <EventForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}

// ── DateCard ──────────────────────────────────────────────────────────────────

function DateCard({ item, onDelete, isDeleting }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dotClass   = DOT_CLASSES[item.dot_color]   ?? DOT_CLASSES.green
  const badgeClass = BADGE_CLASSES[badgeVariant(item.days_until)]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
      className={clsx(
        'relative rounded-[var(--radius-lg)] border border-[var(--borderl)]',
        'px-4 py-3.5 flex items-center gap-3',
        'transition-opacity',
        isDeleting && 'opacity-40',
      )}
      style={{ background: 'var(--cream2)' }}
    >
      {/* Colour dot */}
      <div className={clsx('w-3 h-3 rounded-full flex-none', dotClass)} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-medium text-[var(--text)]">{item.label}</span>
          {item.person_name && (
            <span className="text-xs text-[var(--textl)]">· {item.person_name}</span>
          )}
        </div>
        <p className="text-xs text-[var(--textl)] mt-0.5">
          {formatDate(item.next_date ?? item.date)}
          {item.repeat_yearly && (
            <span className="ml-1.5 opacity-60">↻ щороку</span>
          )}
        </p>
      </div>

      {/* Badge — "через X днів" */}
      <span
        className={clsx(
          'flex-none text-[11px] font-medium px-2 py-0.5 rounded-full border',
          badgeClass,
        )}
      >
        {daysLabel(item.days_until)}
      </span>

      {/* Delete button */}
      <div className="flex-none ml-1">
        {confirmDelete ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false) }}
              className="text-[10px] px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--pink)] text-white"
            >
              Так
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[10px] px-2 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] text-[var(--textm)]"
            >
              Ні
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[var(--textl)] hover:text-[var(--pink)] p-1 transition-colors"
            aria-label="Видалити"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 pt-16 pb-8 text-center px-6"
    >
      <span className="text-6xl">📅</span>
      <div>
        <h2
          className="text-lg font-light text-[var(--deep)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Немає жодної дати
        </h2>
        <p className="text-sm text-[var(--textl)] mt-2 leading-relaxed">
          Додайте важливі дати — ми нагадаємо та підберемо ідеальний букет
        </p>
      </div>
      <button
        onClick={onAdd}
        className="px-6 py-3 rounded-[var(--radius-lg)] bg-[var(--green)] text-[var(--cream)] text-sm font-medium"
      >
        + Додати першу дату
      </button>

      {/* Examples */}
      <div className="w-full space-y-2 mt-2">
        {[
          { dot: 'pink',  label: 'День народження Мами',  days: 12  },
          { dot: 'gold',  label: 'Річниця знайомства',    days: 34  },
          { dot: 'green', label: 'День закоханих',        days: 183 },
        ].map(({ dot, label, days }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border border-[var(--borderl)] opacity-50"
            style={{ background: 'var(--cream2)' }}
          >
            <div className={clsx('w-3 h-3 rounded-full flex-none', DOT_CLASSES[dot])} />
            <span className="text-sm text-[var(--textm)] flex-1">{label}</span>
            <span className="text-[11px] text-[var(--textl)]">{daysLabel(days)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Skeleton list ─────────────────────────────────────────────────────────────

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-[var(--borderl)] px-4 py-3.5 flex items-center gap-3 animate-pulse"
          style={{ background: 'var(--cream2)' }}
        >
          <div className="w-3 h-3 rounded-full bg-[var(--cream3)] flex-none" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 rounded bg-[var(--cream3)] w-2/3" />
            <div className="h-2.5 rounded bg-[var(--cream3)] w-1/2" />
          </div>
          <div className="h-5 w-16 rounded-full bg-[var(--cream3)]" />
        </div>
      ))}
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}
