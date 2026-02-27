/**
 * // filepath: frontend/src/pages/CreateSubscriptionPage.jsx
 *
 * CreateSubscriptionPage — Flower subscription setup form.
 *
 * Steps:
 *   1. Frequency — weekly / biweekly
 *   2. Bouquet size — S / M / L (with server-side prices)
 *   3. First delivery date + optional address
 *   4. Confirm & submit → POST /api/subscriptions
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { useTelegram } from '@hooks/useTelegram'
import { createSubscription } from '@api/subscriptions'

// ── Data ──────────────────────────────────────────────────────────────────────

const FREQ_OPTIONS = [
  {
    key: 'weekly',
    title: 'Щотижня',
    sub: '4 доставки на місяць',
    icon: '🌸',
  },
  {
    key: 'biweekly',
    title: 'Раз на два тижні',
    sub: '2 доставки на місяць',
    icon: '🌿',
  },
]

const SIZE_OPTIONS = [
  {
    key: 'S',
    title: 'Маленький',
    label: 'S',
    price: 599,
    desc: 'Ніжний мінімалістичний букет — ідеально для щоденного настрою',
    stems: '5–7 стеблин',
  },
  {
    key: 'M',
    title: 'Середній',
    label: 'M',
    price: 799,
    desc: 'Класичний розмір — яскравий акцент у будь-якому інтер\'єрі',
    stems: '10–12 стеблин',
  },
  {
    key: 'L',
    title: 'Великий',
    label: 'L',
    price: 1099,
    desc: 'Розкішна композиція для особливих моментів',
    stems: '18–22 стеблини',
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function minDeliveryDate() {
  const d = new Date()
  d.setDate(d.getDate() + 3)  // minimum 3 days from today
  return d.toISOString().split('T')[0]
}

function maxDeliveryDate() {
  const d = new Date()
  d.setDate(d.getDate() + 60)
  return d.toISOString().split('T')[0]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepFrequency({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[var(--deep)] text-lg font-bold">Як часто доставляти?</h2>
      <p className="text-[var(--textm)] text-sm -mt-1">
        Флорист збирає свіжий букет щоразу вручну
      </p>
      {FREQ_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={clsx(
            'flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all',
            value === opt.key
              ? 'border-[var(--green)] bg-[var(--sagelb)]'
              : 'border-[var(--border)] bg-white',
          )}
        >
          <span className="text-3xl">{opt.icon}</span>
          <div>
            <p className={clsx(
              'text-sm font-semibold',
              value === opt.key ? 'text-[var(--green)]' : 'text-[var(--deep)]',
            )}>
              {opt.title}
            </p>
            <p className="text-[var(--textm)] text-xs mt-0.5">{opt.sub}</p>
          </div>
          {value === opt.key && (
            <span className="ml-auto text-[var(--green)] text-lg">✓</span>
          )}
        </button>
      ))}
    </div>
  )
}

function StepSize({ value, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[var(--deep)] text-lg font-bold">Оберіть розмір букету</h2>
      <p className="text-[var(--textm)] text-sm -mt-1">
        Флорист щоразу підбирає найкращі сезонні квіти
      </p>
      {SIZE_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={clsx(
            'flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all',
            value === opt.key
              ? 'border-[var(--green)] bg-[var(--sagelb)]'
              : 'border-[var(--border)] bg-white',
          )}
        >
          <div
            className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              'text-base font-bold border',
              value === opt.key
                ? 'bg-[var(--green)] text-white border-[var(--green)]'
                : 'bg-[var(--cream3)] text-[var(--deep)] border-[var(--border)]',
            )}
          >
            {opt.label}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-1">
              <p className={clsx(
                'text-sm font-semibold',
                value === opt.key ? 'text-[var(--green)]' : 'text-[var(--deep)]',
              )}>
                {opt.title}
              </p>
              <span className="text-[var(--deep)] text-sm font-bold shrink-0">
                {opt.price} грн
              </span>
            </div>
            <p className="text-[var(--textm)] text-xs mt-0.5 leading-snug">{opt.desc}</p>
            <p className="text-[var(--textl)] text-[11px] mt-1">{opt.stems}</p>
          </div>
        </button>
      ))}
    </div>
  )
}

function StepDelivery({ date, address, onDate, onAddress }) {
  const min = minDeliveryDate()
  const max = maxDeliveryDate()

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-[var(--deep)] text-lg font-bold">Перша доставка</h2>

      <div>
        <label className="text-xs font-medium text-[var(--textm)] mb-1.5 block">
          Дата першої доставки
        </label>
        <input
          type="date"
          min={min}
          max={max}
          value={date}
          onChange={e => onDate(e.target.value)}
          className={clsx(
            'w-full rounded-xl border border-[var(--border)] px-4 py-3',
            'text-[var(--deep)] bg-white text-sm outline-none',
            'focus:border-[var(--sage)]',
          )}
        />
        <p className="text-[var(--textl)] text-xs mt-1.5">
          Мінімум через 3 дні для підготовки букету
        </p>
      </div>

      <div>
        <label className="text-xs font-medium text-[var(--textm)] mb-1.5 block">
          Адреса доставки (необов'язково)
        </label>
        <input
          type="text"
          value={address}
          onChange={e => onAddress(e.target.value)}
          placeholder="вул. Хрещатик 1, кв. 5"
          className={clsx(
            'w-full rounded-xl border border-[var(--border)] px-4 py-3',
            'text-[var(--deep)] bg-white text-sm outline-none placeholder:text-[var(--textl)]',
            'focus:border-[var(--sage)]',
          )}
        />
        <p className="text-[var(--textl)] text-xs mt-1.5">
          Якщо не вказати — самовивіз із магазину
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const STEPS = ['frequency', 'size', 'delivery']

export default function CreateSubscriptionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { tg } = useTelegram()

  const [step, setStep] = useState(0)
  const [frequency, setFrequency] = useState('weekly')
  const [size, setSize] = useState('M')
  const [deliveryDate, setDeliveryDate] = useState(minDeliveryDate())
  const [address, setAddress] = useState('')
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: createSubscription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] })
      setDone(true)
    },
  })

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1)
    } else {
      mutation.mutate({
        frequency,
        bouquet_size: size,
        next_delivery: deliveryDate,
        address: address.trim() || null,
      })
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(s => s - 1)
    } else {
      navigate(-1)
    }
  }

  const selectedSize = SIZE_OPTIONS.find(s => s.key === size)

  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-5 px-6 text-center"
        style={{ background: 'var(--cream)' }}
      >
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-6xl"
        >
          🌸
        </motion.span>
        <div>
          <h2 className="text-[var(--deep)] text-xl font-bold mb-2">Підписку оформлено!</h2>
          <p className="text-[var(--textm)] text-sm leading-relaxed max-w-[260px] mx-auto">
            За 2 дні до першої доставки ми надішлемо посилання на оплату в чат-бот.
          </p>
        </div>
        <button
          onClick={() => navigate('/profile', { replace: true })}
          className="px-8 py-3 bg-[var(--green)] text-white rounded-2xl text-sm font-semibold"
        >
          До кабінету
        </button>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ paddingTop: 'var(--safe-top)', background: 'var(--cream)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={handleBack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[var(--border)] text-[var(--deep)] text-lg shrink-0"
        >
          ‹
        </button>
        <div className="flex-1">
          <h1 className="text-[var(--deep)] text-base font-bold">Нова підписка</h1>
          <p className="text-[var(--textl)] text-xs">
            Крок {step + 1} з {STEPS.length}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-5 h-1.5 bg-[var(--cream3)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--green)] rounded-full transition-all duration-300"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <StepFrequency value={frequency} onChange={setFrequency} />
            )}
            {step === 1 && (
              <StepSize value={size} onChange={setSize} />
            )}
            {step === 2 && (
              <StepDelivery
                date={deliveryDate}
                address={address}
                onDate={setDeliveryDate}
                onAddress={setAddress}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer with price summary + CTA */}
      <div
        className="px-4 py-4 border-t border-[var(--border)] bg-[var(--cream)]"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 16px)' }}
      >
        {step === STEPS.length - 1 && selectedSize && (
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[var(--textm)] text-sm">
              {FREQ_OPTIONS.find(f => f.key === frequency)?.title} · {selectedSize.title}
            </span>
            <span className="text-[var(--deep)] text-base font-bold">
              {selectedSize.price} грн / доставка
            </span>
          </div>
        )}

        <button
          onClick={handleNext}
          disabled={mutation.isPending}
          className={clsx(
            'w-full py-4 rounded-2xl text-white text-sm font-semibold transition-opacity',
            mutation.isPending ? 'opacity-60' : 'opacity-100',
            'bg-[var(--green)]',
          )}
        >
          {mutation.isPending
            ? 'Зберігаємо…'
            : step < STEPS.length - 1
              ? 'Далі →'
              : '🌸 Оформити підписку'}
        </button>

        {mutation.isError && (
          <p className="text-center text-xs text-[#8b4a52] mt-2">
            {mutation.error?.message || 'Помилка. Спробуйте ще раз.'}
          </p>
        )}
      </div>
    </div>
  )
}
