/**
 * // filepath: frontend/src/components/calendar/EventForm.jsx
 *
 * EventForm — slide-up bottom drawer for adding a new calendar event.
 *
 * Props:
 *   isOpen    {boolean}  — whether the form is visible
 *   onClose   {fn}       — called when user cancels
 *   onSubmit  {fn(data)} — called with validated form data
 *   isLoading {boolean}  — disables submit while mutation is pending
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'

// ── Preset event labels ───────────────────────────────────────────────────────

const PRESET_LABELS = [
  { label: 'День народження', emoji: '🎂' },
  { label: 'Річниця',         emoji: '💍' },
  { label: 'Весілля',         emoji: '💒' },
  { label: '8 Березня',       emoji: '🌷' },
  { label: 'День закоханих',  emoji: '💕' },
  { label: 'Новий рік',       emoji: '🎉' },
  { label: 'Інше',            emoji: '📅' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EventForm({ isOpen, onClose, onSubmit, isLoading }) {
  const [label, setLabel]             = useState('')
  const [customLabel, setCustomLabel] = useState('')
  const [personName, setPersonName]   = useState('')
  const [eventDate, setEventDate]     = useState('')
  const [repeatYearly, setRepeatYearly] = useState(true)
  const [error, setError]             = useState('')

  const firstInputRef = useRef(null)

  // Focus first field when form opens
  useEffect(() => {
    if (isOpen) {
      setError('')
      setTimeout(() => firstInputRef.current?.focus(), 350)
    }
  }, [isOpen])

  // Resolve final label
  const finalLabel = label === 'Інше' ? customLabel.trim() : label

  function validate() {
    if (!finalLabel) return 'Оберіть або введіть назву події'
    if (!eventDate)   return 'Оберіть дату події'
    return ''
  }

  function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    onSubmit({
      label:          finalLabel,
      person_name:    personName.trim() || null,
      date:           eventDate,
      repeat_yearly:  repeatYearly,
      reminder_days:  [3, 1],
    })
  }

  function handleClose() {
    // Reset form
    setLabel('')
    setCustomLabel('')
    setPersonName('')
    setEventDate('')
    setRepeatYearly(true)
    setError('')
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={clsx(
              'fixed bottom-0 left-0 right-0 z-50',
              'rounded-t-[var(--radius-xl)] shadow-2xl',
              'max-h-[90vh] overflow-y-auto',
            )}
            style={{ background: 'var(--cream)' }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--border)]" />
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-8 pt-2 space-y-5">
              {/* Title */}
              <div className="flex items-center justify-between">
                <h2
                  className="text-lg font-medium text-[var(--deep)]"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  Нова подія
                </h2>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-[var(--textl)] text-xl leading-none p-1"
                  aria-label="Закрити"
                >
                  ×
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--pinkl)] border border-[var(--pink)] text-sm text-[#8b4a52]">
                  ⚠️ {error}
                </div>
              )}

              {/* Event label — preset pills */}
              <div className="space-y-2">
                <FieldLabel required>Назва події</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {PRESET_LABELS.map(({ label: l, emoji }) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => { setLabel(l); setError('') }}
                      className={clsx(
                        'px-3 py-1.5 rounded-full text-sm border',
                        'transition-all duration-[var(--transition-fast)]',
                        label === l
                          ? 'bg-[var(--green)] text-[var(--cream)] border-[var(--green)]'
                          : 'bg-[var(--cream2)] text-[var(--textm)] border-[var(--border)] hover:border-[var(--sage)]',
                      )}
                    >
                      {emoji} {l}
                    </button>
                  ))}
                </div>

                {/* Custom label input */}
                {label === 'Інше' && (
                  <input
                    ref={firstInputRef}
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Введіть назву події…"
                    maxLength={100}
                    className={inputClass}
                  />
                )}
              </div>

              {/* Person name */}
              <div className="space-y-1.5">
                <FieldLabel>Для кого</FieldLabel>
                <input
                  ref={label !== 'Інше' ? firstInputRef : undefined}
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Мама, Коханий, Сестра…"
                  maxLength={100}
                  className={inputClass}
                />
              </div>

              {/* Date picker */}
              <div className="space-y-1.5">
                <FieldLabel required>Дата</FieldLabel>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => { setEventDate(e.target.value); setError('') }}
                  className={inputClass}
                />
              </div>

              {/* Repeat yearly toggle */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-[var(--text)]">Нагадувати щороку</p>
                  <p className="text-xs text-[var(--textl)]">
                    Автоматично повторюється кожен рік
                  </p>
                </div>
                <Toggle
                  checked={repeatYearly}
                  onChange={setRepeatYearly}
                />
              </div>

              {/* Reminder info */}
              <div
                className="rounded-[var(--radius-lg)] px-4 py-3 text-xs text-[var(--textm)] space-y-1"
                style={{ background: 'var(--sagelp, var(--cream2))' }}
              >
                <p className="font-medium text-[var(--green)]">🔔 Нагадування</p>
                <p>• За 3 дні — AI підбере 3 ідеальних букети</p>
                <p>• За 1 день — термінове нагадування</p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className={clsx(
                  'w-full py-3.5 rounded-[var(--radius-lg)]',
                  'text-sm font-medium',
                  'bg-[var(--green)] text-[var(--cream)]',
                  'transition-opacity disabled:opacity-60',
                )}
              >
                {isLoading ? 'Зберігаємо…' : '✅ Зберегти дату'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-medium text-[var(--textm)]">
      {children}
      {required && <span className="ml-0.5 text-[var(--pink)]">*</span>}
    </label>
  )
}

const inputClass = clsx(
  'w-full px-3 py-2.5 text-sm',
  'bg-[var(--cream2)] text-[var(--text)]',
  'placeholder:text-[var(--textl)]',
  'border border-[var(--border)] rounded-[var(--radius-md)]',
  'outline-none focus:border-[var(--light)] focus:bg-[var(--cream)]',
  'transition-colors duration-[var(--transition-fast)]',
)

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-12 h-6 rounded-full transition-colors duration-200',
        checked ? 'bg-[var(--green)]' : 'bg-[var(--border)]',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow',
          'transition-transform duration-200',
          checked && 'translate-x-6',
        )}
      />
    </button>
  )
}
