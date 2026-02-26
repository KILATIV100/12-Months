/**
 * // filepath: frontend/src/pages/CheckoutPage.jsx
 *
 * CheckoutPage — 4-step order checkout.
 *
 * Step 1: Кошик        — read-only cart review
 * Step 2: Доставка     — pickup/delivery toggle, address, date + time slot
 * Step 3: Отримувач    — recipient name, phone, comment + optional greeting card
 * Step 4: Оплата       — summary + payment trigger
 *
 * Sprint 6 addition (Step 3):
 *   User can optionally create a greeting card (text or video).
 *   After createOrder succeeds, greeting is uploaded to /api/media/greeting.
 *   The QR code is shown in Step 4 summary.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useMutation } from '@tanstack/react-query'
import useCartStore, { useCartItems, useCartTotal } from '@store/cartStore'
import { useTelegram } from '@hooks/useTelegram'
import StepBar from '@components/checkout/StepBar'
import { Button } from '@components/ui'
import { createOrder, createPaymentLink } from '@api/orders'
import { uploadGreeting } from '@api/media'

// ── Constants ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 4

const TIME_SLOTS = [
  '09:00–11:00',
  '11:00–13:00',
  '13:00–15:00',
  '15:00–17:00',
  '17:00–19:00',
  '19:00–21:00',
]

const MAX_VIDEO_MB = 50

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function formatPrice(n) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

const PLACEHOLDER_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='none'%3E%3Crect width='200' height='200' fill='%23f0ebe0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='40' fill='%23b5cea0'%3E🌸%3C/text%3E%3C/svg%3E"

// ── Main component ────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const navigate   = useNavigate()
  const items      = useCartItems()
  const cartTotal  = useCartTotal()
  const clearCart  = useCartStore((s) => s.clearCart)

  const { tg, showMainButton, hideMainButton, setMainButtonLoading, haptic, showAlert } = useTelegram()

  const [step, setStep] = useState(1)
  const [formError, setFormError] = useState('')

  // Delivery form state
  const [deliveryType, setDeliveryType]         = useState('delivery')
  const [address, setAddress]                   = useState('')
  const [deliveryDate, setDeliveryDate]         = useState(tomorrowISO())
  const [deliveryTimeSlot, setDeliveryTimeSlot] = useState(TIME_SLOTS[1])

  // Recipient form state
  const [recipientName, setRecipientName]   = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [comment, setComment]               = useState('')

  // Greeting card state (Sprint 6)
  const [greetingMode, setGreetingMode]   = useState('none')   // none | text | video
  const [greetingText, setGreetingText]   = useState('')
  const [greetingVideo, setGreetingVideo] = useState(null)     // File | null

  // QR result (filled after successful greeting upload)
  const [qrData, setQrData] = useState(null)

  // Redirect empty cart
  useEffect(() => {
    if (items.length === 0) navigate('/cart', { replace: true })
  }, [items.length, navigate])

  // ── Validation ───────────────────────────────────────────────────────────
  function validateStep(s) {
    if (s === 2 && deliveryType === 'delivery' && !address.trim()) {
      return 'Вкажіть адресу доставки'
    }
    if (s === 3) {
      if (!recipientName.trim()) return "Вкажіть ім'я отримувача"
      const phone = recipientPhone.replace(/\s/g, '')
      if (!/^\+?[\d]{7,15}$/.test(phone)) return 'Невірний номер телефону'
      if (greetingMode === 'text' && !greetingText.trim()) {
        return 'Введіть текст листівки або оберіть «Без листівки»'
      }
      if (greetingMode === 'video' && !greetingVideo) {
        return 'Оберіть відео-файл або оберіть «Без листівки»'
      }
    }
    return ''
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setFormError('')
    const err = validateStep(step)
    if (err) { setFormError(err); return }
    if (step < TOTAL_STEPS) {
      haptic.impact('light')
      setStep((s) => s + 1)
    }
  }, [step, deliveryType, address, recipientName, recipientPhone, greetingMode, greetingText, greetingVideo, haptic])

  const goBack = useCallback(() => {
    setFormError('')
    if (step > 1) {
      haptic.impact('soft')
      setStep((s) => s - 1)
    } else {
      navigate(-1)
    }
  }, [step, navigate, haptic])

  // ── Order + payment mutation ──────────────────────────────────────────────
  const orderMutation = useMutation({
    mutationFn: async () => {
      const orderPayload = {
        items: items.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
        delivery_type: deliveryType,
        address: deliveryType === 'delivery' ? address.trim() : null,
        delivery_date: deliveryDate || null,
        delivery_time_slot: deliveryType === 'delivery' ? deliveryTimeSlot : null,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        comment: comment.trim() || null,
      }

      const order   = await createOrder(orderPayload)
      const payment = await createPaymentLink(order.id)

      // Upload greeting if the user added one (non-blocking)
      if (greetingMode !== 'none') {
        try {
          const result = await uploadGreeting({
            orderId: order.id,
            greetingType: greetingMode,
            greetingText: greetingMode === 'text' ? greetingText.trim() : greetingText.trim() || null,
            videoFile:    greetingMode === 'video' ? greetingVideo : null,
          })
          setQrData(result)
        } catch {
          // Greeting upload failure must NOT block the payment flow
        }
      }

      return { order, payment }
    },

    onSuccess: ({ payment }) => {
      clearCart()
      if (tg) {
        tg.openLink(payment.checkout_url)
      } else {
        window.open(payment.checkout_url, '_blank')
      }
      navigate('/catalog', { replace: true })
    },

    onError: (err) => {
      setMainButtonLoading(false)
      showAlert(err?.message ?? 'Помилка при оформленні. Спробуйте ще раз.')
    },
  })

  const handlePay = useCallback(() => {
    setFormError('')
    const err = validateStep(step)
    if (err) { setFormError(err); return }
    haptic.impact('medium')
    setMainButtonLoading(true)
    orderMutation.mutate()
  }, [step, orderMutation, haptic, setMainButtonLoading])

  // ── Telegram MainButton ───────────────────────────────────────────────────
  useEffect(() => {
    const isLastStep = step === TOTAL_STEPS
    const label   = isLastStep ? `Оплатити ${formatPrice(cartTotal)}` : 'Далі →'
    const handler = isLastStep ? handlePay : goNext

    showMainButton(label, handler, { color: '#1c3610', textColor: '#faf8f2' })
    return () => hideMainButton(handler)
  }, [step, cartTotal, goNext, handlePay, showMainButton, hideMainButton])

  // ── Telegram BackButton ───────────────────────────────────────────────────
  useEffect(() => {
    if (!tg) return
    tg.BackButton.onClick(goBack)
    tg.BackButton.show()
    return () => {
      tg.BackButton.offClick(goBack)
      tg.BackButton.hide()
    }
  }, [tg, goBack])

  return (
    <div
      className="flex flex-col min-h-screen pb-24 bg-[var(--cream)]"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      {/* Header */}
      <div
        className={clsx(
          'sticky top-0 z-[var(--z-overlay)]',
          'bg-[var(--cream)]/95 backdrop-blur-md',
          'border-b border-[var(--borderl)]',
        )}
      >
        <div className="flex items-center px-4 pt-3 pb-1 gap-3">
          {!tg && (
            <button onClick={goBack} className="text-[var(--green)] p-1 -ml-1" aria-label="Назад">
              <BackIcon />
            </button>
          )}
          <h1
            className="text-lg font-light tracking-wide text-[var(--deep)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Оформлення
          </h1>
        </div>
        <StepBar currentStep={step} />
      </div>

      {/* Step content */}
      <div className="flex-1 px-4 py-4">
        {formError && (
          <div className="mb-4 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--pinkl)] border border-[var(--pink)] text-sm text-[#8b4a52]">
            ⚠️ {formError}
          </div>
        )}

        {step === 1 && <Step1Review items={items} total={cartTotal} />}

        {step === 2 && (
          <Step2Delivery
            deliveryType={deliveryType}          setDeliveryType={setDeliveryType}
            address={address}                    setAddress={setAddress}
            deliveryDate={deliveryDate}          setDeliveryDate={setDeliveryDate}
            deliveryTimeSlot={deliveryTimeSlot}  setDeliveryTimeSlot={setDeliveryTimeSlot}
          />
        )}

        {step === 3 && (
          <Step3Recipient
            recipientName={recipientName}   setRecipientName={setRecipientName}
            recipientPhone={recipientPhone} setRecipientPhone={setRecipientPhone}
            comment={comment}               setComment={setComment}
            greetingMode={greetingMode}     setGreetingMode={setGreetingMode}
            greetingText={greetingText}     setGreetingText={setGreetingText}
            greetingVideo={greetingVideo}   setGreetingVideo={setGreetingVideo}
          />
        )}

        {step === 4 && (
          <Step4Summary
            items={items}
            total={cartTotal}
            deliveryType={deliveryType}
            address={address}
            deliveryDate={deliveryDate}
            deliveryTimeSlot={deliveryTimeSlot}
            recipientName={recipientName}
            recipientPhone={recipientPhone}
            comment={comment}
            greetingMode={greetingMode}
            greetingText={greetingText}
            greetingVideo={greetingVideo}
            qrData={qrData}
          />
        )}
      </div>

      {/* Bottom CTA (non-Telegram fallback) */}
      {!tg && (
        <div className="fixed bottom-0 left-0 right-0 px-4 py-3 bg-[var(--cream)]/95 backdrop-blur-md border-t border-[var(--borderl)]">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            loading={orderMutation.isPending}
            onClick={step === TOTAL_STEPS ? handlePay : goNext}
          >
            {step === TOTAL_STEPS ? `Оплатити ${formatPrice(cartTotal)}` : 'Далі →'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Step 1: Cart Review ───────────────────────────────────────────────────────

function Step1Review({ items, total }) {
  return (
    <div className="space-y-3">
      <SectionTitle>Ваше замовлення</SectionTitle>

      {items.map(({ product, quantity }) => (
        <div
          key={product.id}
          className="flex items-center gap-3 bg-[var(--cream2)] rounded-[var(--radius-md)] border border-[var(--borderl)] p-3"
        >
          <div className="w-14 h-14 flex-none rounded-[var(--radius-sm)] overflow-hidden bg-[var(--cream3)]">
            <img
              src={product.image_url || PLACEHOLDER_SVG}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.src = PLACEHOLDER_SVG }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--text)] truncate">{product.name}</p>
            <p className="text-xs text-[var(--textl)] mt-0.5">× {quantity}</p>
          </div>
          <span className="text-sm font-semibold text-[var(--gold)] tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
            {formatPrice(product.base_price * quantity)}
          </span>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2 border-t border-[var(--borderl)] mt-1">
        <span className="text-sm text-[var(--textm)]">Разом:</span>
        <span className="text-base font-bold text-[var(--gold)]" style={{ fontFamily: 'var(--font-mono)' }}>
          {formatPrice(total)}
        </span>
      </div>
    </div>
  )
}

// ── Step 2: Delivery ──────────────────────────────────────────────────────────

function Step2Delivery({
  deliveryType, setDeliveryType,
  address, setAddress,
  deliveryDate, setDeliveryDate,
  deliveryTimeSlot, setDeliveryTimeSlot,
}) {
  return (
    <div className="space-y-5">
      <SectionTitle>Спосіб отримання</SectionTitle>

      {/* Pickup / Delivery toggle */}
      <div className="flex gap-2 bg-[var(--cream2)] rounded-[var(--radius-lg)] p-1">
        {[
          { value: 'pickup',   label: '🏪 Самовивіз' },
          { value: 'delivery', label: '🚗 Доставка' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDeliveryType(value)}
            className={clsx(
              'flex-1 py-2 text-sm font-medium rounded-[var(--radius-md)]',
              'transition-all duration-[var(--transition-fast)]',
              deliveryType === value
                ? 'bg-[var(--green)] text-[var(--cream)] shadow-sm'
                : 'text-[var(--textm)] hover:text-[var(--text)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {deliveryType === 'delivery' && (
        <div className="space-y-1.5">
          <FieldLabel required>Адреса доставки</FieldLabel>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="вул. Хрещатик, 1, кв. 10"
            rows={2}
            className={inputClass}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <FieldLabel required>Дата {deliveryType === 'delivery' ? 'доставки' : 'самовивозу'}</FieldLabel>
        <input
          type="date"
          value={deliveryDate}
          min={todayISO()}
          onChange={(e) => setDeliveryDate(e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel>Час {deliveryType === 'delivery' ? 'доставки' : 'самовивозу'}</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => setDeliveryTimeSlot(slot)}
              className={clsx(
                'py-2 px-1 text-xs font-medium rounded-[var(--radius-md)]',
                'border transition-all duration-[var(--transition-fast)]',
                deliveryTimeSlot === slot
                  ? 'bg-[var(--green)] text-[var(--cream)] border-[var(--green)]'
                  : 'bg-[var(--cream2)] text-[var(--textm)] border-[var(--border)] hover:border-[var(--sage)]',
              )}
            >
              {slot}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Recipient + Greeting card ────────────────────────────────────────

function Step3Recipient({
  recipientName, setRecipientName,
  recipientPhone, setRecipientPhone,
  comment, setComment,
  greetingMode, setGreetingMode,
  greetingText, setGreetingText,
  greetingVideo, setGreetingVideo,
}) {
  const fileInputRef = useRef(null)

  function handleVideoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      alert(`Відео не повинно перевищувати ${MAX_VIDEO_MB} МБ`)
      return
    }
    setGreetingVideo(file)
  }

  return (
    <div className="space-y-5">
      <SectionTitle>Дані отримувача</SectionTitle>

      <div className="space-y-1.5">
        <FieldLabel required>Ім'я отримувача</FieldLabel>
        <input
          type="text"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
          placeholder="Марія Іванова"
          autoComplete="name"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel required>Телефон</FieldLabel>
        <input
          type="tel"
          value={recipientPhone}
          onChange={(e) => setRecipientPhone(e.target.value)}
          placeholder="+380 XX XXX XX XX"
          autoComplete="tel"
          inputMode="tel"
          className={inputClass}
        />
        <p className="text-[10px] text-[var(--textl)]">
          Флорист зателефонує для уточнення деталей доставки
        </p>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Побажання / коментар</FieldLabel>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Наприклад: дзвінок у домофон — 48. Без лілій."
          rows={2}
          className={inputClass}
        />
      </div>

      {/* ── Greeting card section ──────────────────────────────────── */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">💌</span>
          <h3 className="text-sm font-medium text-[var(--deep)]">Вітальна листівка</h3>
        </div>

        {/* Mode selector */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { value: 'none',  emoji: '✕',  desc: 'Без листівки' },
            { value: 'text',  emoji: '✍️', desc: 'Текст' },
            { value: 'video', emoji: '🎥', desc: 'Відео' },
          ].map(({ value, emoji, desc }) => (
            <button
              key={value}
              onClick={() => setGreetingMode(value)}
              className={clsx(
                'flex flex-col items-center gap-1.5 py-3 px-2',
                'rounded-[var(--radius-lg)] border text-xs font-medium',
                'transition-all duration-[var(--transition-fast)]',
                greetingMode === value
                  ? 'bg-[var(--green)] text-[var(--cream)] border-[var(--green)]'
                  : 'bg-[var(--cream2)] text-[var(--textm)] border-[var(--border)] hover:border-[var(--sage)]',
              )}
            >
              <span className="text-xl leading-none">{emoji}</span>
              <span>{desc}</span>
            </button>
          ))}
        </div>

        {/* Text greeting input */}
        {greetingMode === 'text' && (
          <div className="space-y-1.5">
            <FieldLabel required>Текст листівки</FieldLabel>
            <textarea
              value={greetingText}
              onChange={(e) => setGreetingText(e.target.value)}
              placeholder="З днем народження! Нехай кожен день буде яскравим та наповненим радістю…"
              rows={4}
              maxLength={500}
              className={inputClass}
            />
            <div className="flex justify-end">
              <span className="text-[10px] text-[var(--textl)]">{greetingText.length}/500</span>
            </div>
          </div>
        )}

        {/* Video greeting input */}
        {greetingMode === 'video' && (
          <div className="space-y-3">
            <FieldLabel required>Відео-файл (до {MAX_VIDEO_MB} МБ)</FieldLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'w-full py-5 rounded-[var(--radius-lg)] border-2 border-dashed',
                'flex flex-col items-center gap-2 text-sm',
                'transition-colors duration-[var(--transition-fast)]',
                greetingVideo
                  ? 'border-[var(--green)] bg-[var(--cream2)] text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--textm)] hover:border-[var(--sage)]',
              )}
            >
              <span className="text-2xl">{greetingVideo ? '✅' : '📹'}</span>
              {greetingVideo ? (
                <span className="font-medium truncate max-w-[200px]">{greetingVideo.name}</span>
              ) : (
                <>
                  <span>Натисніть, щоб обрати відео</span>
                  <span className="text-xs text-[var(--textl)]">MP4, MOV, AVI до 50 МБ</span>
                </>
              )}
            </button>
            {greetingVideo && (
              <button
                onClick={() => setGreetingVideo(null)}
                className="text-xs text-[var(--pink)] w-full text-center"
              >
                Видалити відео
              </button>
            )}

            {/* Optional caption for video */}
            <div className="space-y-1.5">
              <FieldLabel>Підпис до відео (необов'язково)</FieldLabel>
              <input
                type="text"
                value={greetingText}
                onChange={(e) => setGreetingText(e.target.value)}
                placeholder="З любов'ю для тебе!"
                maxLength={100}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Step 4: Summary + Payment ─────────────────────────────────────────────────

function Step4Summary({
  items, total,
  deliveryType, address, deliveryDate, deliveryTimeSlot,
  recipientName, recipientPhone, comment,
  greetingMode, greetingText, greetingVideo,
  qrData,
}) {
  const dateFormatted = deliveryDate
    ? new Date(deliveryDate + 'T12:00:00').toLocaleDateString('uk-UA', {
        weekday: 'long', day: 'numeric', month: 'long',
      })
    : '—'

  const rows = [
    { label: 'Спосіб',    value: deliveryType === 'delivery' ? '🚗 Доставка' : '🏪 Самовивіз' },
    deliveryType === 'delivery' && address && { label: 'Адреса', value: address },
    { label: 'Дата',      value: dateFormatted },
    deliveryTimeSlot && { label: 'Час',       value: deliveryTimeSlot },
    { label: 'Отримувач', value: recipientName },
    { label: 'Телефон',   value: recipientPhone },
    comment && { label: 'Коментар',  value: comment },
    greetingMode !== 'none' && {
      label: 'Листівка',
      value: greetingMode === 'text'
        ? `✍️ "${greetingText.slice(0, 40)}${greetingText.length > 40 ? '…' : ''}"`
        : `🎥 ${greetingVideo?.name ?? 'відео'}`,
    },
  ].filter(Boolean)

  return (
    <div className="space-y-4">
      <SectionTitle>Перевірте замовлення</SectionTitle>

      {/* Order items count */}
      <div className="bg-[var(--cream2)] rounded-[var(--radius-lg)] border border-[var(--borderl)] px-4 py-3">
        <p className="text-sm text-[var(--textm)]">
          Товарів: <span className="font-medium text-[var(--text)]">{items.length}</span>
          {' '}· Позицій:{' '}
          <span className="font-medium text-[var(--text)]">
            {items.reduce((s, i) => s + i.quantity, 0)}
          </span>
        </p>
      </div>

      {/* Delivery details */}
      <div className="bg-[var(--cream2)] rounded-[var(--radius-lg)] border border-[var(--borderl)] divide-y divide-[var(--borderl)]">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between items-start gap-3 px-4 py-2.5">
            <span className="text-xs text-[var(--textl)] flex-none pt-0.5">{row.label}</span>
            <span className="text-sm text-[var(--text)] text-right leading-snug">{row.value}</span>
          </div>
        ))}
      </div>

      {/* QR code preview (if greeting was already uploaded in a previous visit to this step) */}
      {qrData && (
        <div
          className="rounded-[var(--radius-lg)] border border-[var(--borderl)] px-4 py-4 text-center"
          style={{ background: 'var(--goldl)' }}
        >
          <p className="text-xs text-[var(--gold)] font-medium uppercase tracking-wider mb-3">
            QR-листівка готова!
          </p>
          <img
            src={qrData.qr_png_base64}
            alt="QR code"
            className="w-36 h-36 mx-auto rounded-[var(--radius-md)]"
          />
          <p className="text-[10px] text-[var(--textl)] mt-2 break-all">
            {qrData.qr_public_url}
          </p>
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between bg-[var(--goldl)] rounded-[var(--radius-lg)] px-4 py-3">
        <span className="text-sm font-medium text-[var(--deep)]">До сплати</span>
        <span
          className="text-xl font-bold text-[var(--deep)]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {formatPrice(total)}
        </span>
      </div>

      <p className="text-[11px] text-[var(--textl)] text-center leading-relaxed px-2">
        Натискаючи «Оплатити», ви погоджуєтесь з умовами замовлення.
        Оплата через LiqPay — безпечно.
      </p>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <h2
      className="text-base font-medium text-[var(--deep)] mb-1"
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {children}
    </h2>
  )
}

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
  'resize-none',
)

function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  )
}
