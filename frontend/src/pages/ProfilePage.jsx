/**
 * // filepath: frontend/src/pages/ProfilePage.jsx
 *
 * ProfilePage — Personal cabinet with two tabs:
 *   1. "Замовлення"   — order history list
 *   2. "Підписки"     — active and past subscriptions with manage actions
 *
 * Sprint 8: full implementation.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useTelegram } from '@hooks/useTelegram'
import { getMyOrders } from '@api/orders'
import { getSubscriptions, updateSubscriptionStatus } from '@api/subscriptions'
import { getUserMe } from '@api/users'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_UA = {
  new:       { label: 'Нове',        cls: 'bg-[var(--cream3)] text-[var(--textm)]' },
  in_work:   { label: 'В роботі',    cls: 'bg-[var(--goldl)]  text-[var(--deep)]' },
  ready:     { label: 'Готове',      cls: 'bg-[var(--sagelb)] text-[var(--green)]' },
  delivered: { label: 'Доставлено',  cls: 'bg-[var(--sagelb)] text-[var(--green)]' },
  cancelled: { label: 'Скасовано',   cls: 'bg-[#f5e4e6]       text-[#8b4a52]' },
}

const FREQ_UA = { weekly: 'Щотижня', biweekly: 'Раз на 2 тижні' }
const SIZE_LABELS = { S: 'Маленький (S)', M: 'Середній (M)', L: 'Великий (L)' }

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
}

function formatDateLong(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Order card ────────────────────────────────────────────────────────────────

function OrderCard({ order }) {
  const st = STATUS_UA[order.status] || { label: order.status, cls: 'bg-[var(--cream3)] text-[var(--textm)]' }
  const names = order.items.slice(0, 2).map(i => i.product_name || '…').join(', ')
  const moreCount = order.items.length - 2

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-2 shadow-[0_1px_6px_rgba(45,80,22,0.06)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[var(--textm)] text-xs">
          #{order.id.slice(-6).toUpperCase()}
        </span>
        <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full border border-transparent', st.cls)}>
          {st.label}
        </span>
      </div>

      <p className="text-[var(--deep)] text-sm font-medium leading-snug">
        {names}{moreCount > 0 ? ` +${moreCount}` : ''}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[var(--textl)] text-xs">
          {order.delivery_type === 'delivery' ? '🚚 Доставка' : '🏪 Самовивіз'}
        </span>
        <span className="text-[var(--deep)] text-sm font-semibold">
          {order.total_price} грн
        </span>
      </div>
    </div>
  )
}

// ── Subscription card ─────────────────────────────────────────────────────────

function SubscriptionCard({ sub, onManage }) {
  const isPaused = sub.is_active && sub.paused_until
  const isCancelled = !sub.is_active

  const statusLabel = isCancelled
    ? 'Скасована'
    : isPaused
      ? `Пауза до ${formatDate(sub.paused_until)}`
      : 'Активна'

  const statusCls = isCancelled
    ? 'bg-[#f5e4e6] text-[#8b4a52]'
    : isPaused
      ? 'bg-[var(--goldl)] text-[var(--deep)]'
      : 'bg-[var(--sagelb)] text-[var(--green)]'

  const what = sub.bouquet_size
    ? SIZE_LABELS[sub.bouquet_size] || sub.bouquet_size
    : 'Букет з каталогу'

  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-3 shadow-[0_1px_6px_rgba(45,80,22,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[var(--deep)] text-sm font-semibold">{what}</p>
          <p className="text-[var(--textm)] text-xs mt-0.5">{FREQ_UA[sub.frequency]}</p>
        </div>
        <span className={clsx('text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0', statusCls)}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--textm)]">
        <span>Наступна доставка</span>
        <span className="font-medium text-[var(--deep)]">{formatDateLong(sub.next_delivery)}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-[var(--textm)]">
        <span>Ціна</span>
        <span className="font-semibold text-[var(--deep)]">{sub.price} грн</span>
      </div>

      {!isCancelled && (
        <div className="flex gap-2 mt-1">
          {isPaused ? (
            <button
              onClick={() => onManage(sub, 'resume')}
              className={clsx(
                'flex-1 text-xs font-medium py-2 rounded-xl border transition-colors',
                'border-[var(--green)] text-[var(--green)] bg-transparent',
                'active:bg-[var(--sagelb)]',
              )}
            >
              ▶ Поновити
            </button>
          ) : (
            <button
              onClick={() => onManage(sub, 'pause')}
              className={clsx(
                'flex-1 text-xs font-medium py-2 rounded-xl border transition-colors',
                'border-[var(--gold)] text-[var(--deep)] bg-transparent',
                'active:bg-[var(--goldl)]',
              )}
            >
              ⏸ Пауза
            </button>
          )}
          <button
            onClick={() => onManage(sub, 'cancel')}
            className={clsx(
              'flex-1 text-xs font-medium py-2 rounded-xl border transition-colors',
              'border-[#d9a0a6] text-[#8b4a52] bg-transparent',
              'active:bg-[#f5e4e6]',
            )}
          >
            ✕ Скасувати
          </button>
        </div>
      )}
    </div>
  )
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-2 animate-pulse">
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-[var(--cream3)] rounded-full" />
        <div className="h-5 w-16 bg-[var(--cream3)] rounded-full" />
      </div>
      <div className="h-4 w-3/4 bg-[var(--cream3)] rounded-full" />
      <div className="flex justify-between">
        <div className="h-3 w-20 bg-[var(--cream3)] rounded-full" />
        <div className="h-4 w-16 bg-[var(--cream3)] rounded-full" />
      </div>
    </div>
  )
}

// ── Pause date picker modal ───────────────────────────────────────────────────

function PauseModal({ sub, onConfirm, onClose }) {
  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minISO = minDate.toISOString().split('T')[0]

  const maxDate = new Date()
  maxDate.setDate(maxDate.getDate() + 90)
  const maxISO = maxDate.toISOString().split('T')[0]

  const [until, setUntil] = useState(minISO)

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--cream)] rounded-t-3xl w-full max-w-lg p-6 pb-safe">
        <h3 className="text-[var(--deep)] font-semibold text-base mb-4">
          Поставити на паузу до…
        </h3>
        <input
          type="date"
          min={minISO}
          max={maxISO}
          value={until}
          onChange={e => setUntil(e.target.value)}
          className={clsx(
            'w-full rounded-xl border border-[var(--border)] px-4 py-3',
            'text-[var(--deep)] bg-white text-sm outline-none',
            'focus:border-[var(--sage)]',
          )}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-[var(--border)] text-sm text-[var(--textm)]"
          >
            Скасувати
          </button>
          <button
            onClick={() => onConfirm(sub.id, until)}
            className="flex-1 py-3 rounded-2xl bg-[var(--green)] text-white text-sm font-medium"
          >
            Підтвердити
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Bonus Tab ─────────────────────────────────────────────────────────────────

function BonusTab({ me, meLoading, tg }) {
  function handleShare() {
    if (!me?.referral_link) return
    if (tg) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(me.referral_link)}&text=${encodeURIComponent('🌿 Приєднуйся до 12 Months — преміальна доставка квітів!')}`
      )
    } else {
      navigator.clipboard?.writeText(me.referral_link)
    }
  }

  if (meLoading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-28 rounded-2xl bg-[var(--cream3)]" />
        <div className="h-16 rounded-2xl bg-[var(--cream3)]" />
        <div className="h-12 rounded-2xl bg-[var(--cream3)]" />
      </div>
    )
  }

  const balance = me?.bonus_balance ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Balance card */}
      <div
        className="rounded-2xl px-5 py-5 flex flex-col gap-1"
        style={{ background: 'linear-gradient(135deg, var(--green) 0%, var(--mid) 100%)' }}
      >
        <p className="text-[var(--cream)] text-xs opacity-80 uppercase tracking-wider">Ваш бонусний баланс</p>
        <p className="text-[var(--cream)] text-4xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
          {balance}
        </p>
        <p className="text-[var(--cream)] text-xs opacity-70 mt-1">1 бонус = 1 грн знижки</p>
      </div>

      {/* How it works */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-4 flex flex-col gap-3">
        <p className="text-[var(--deep)] text-sm font-semibold">Як це працює?</p>
        {[
          { icon: '🔗', text: 'Поділіться реферальним посиланням з другом' },
          { icon: '🎉', text: 'Коли друг зробить перше замовлення — вам +50 бонусів' },
          { icon: '🛒', text: 'Списуйте бонуси при оформленні замовлення' },
        ].map(({ icon, text }) => (
          <div key={text} className="flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{icon}</span>
            <p className="text-[var(--textm)] text-sm leading-snug">{text}</p>
          </div>
        ))}
      </div>

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={!me?.referral_link}
        className={clsx(
          'w-full py-4 rounded-2xl text-sm font-semibold transition-all',
          'bg-[var(--gold)] text-white active:scale-95',
          !me?.referral_link && 'opacity-50 cursor-not-allowed',
        )}
      >
        🎁 Запросити друга
      </button>

      {me?.referral_link && (
        <p className="text-[10px] text-[var(--textl)] text-center break-all px-2">
          {me.referral_link}
        </p>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { tg } = useTelegram()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState('orders')
  const [pauseTarget, setPauseTarget] = useState(null)

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => getMyOrders({ limit: 20 }),
  })

  const { data: subs = [], isLoading: subsLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: getSubscriptions,
  })

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['user-me'],
    queryFn: getUserMe,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, body }) => updateSubscriptionStatus(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  })

  function handleManage(sub, action) {
    if (action === 'pause') {
      setPauseTarget(sub)
      return
    }
    statusMutation.mutate({ id: sub.id, body: { action } })
  }

  function handlePauseConfirm(subId, paused_until) {
    statusMutation.mutate({ id: subId, body: { action: 'pause', paused_until } })
    setPauseTarget(null)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ paddingTop: 'var(--safe-top)', paddingBottom: 'calc(var(--safe-bottom) + 72px)', background: 'var(--cream)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-[var(--deep)] text-xl font-bold">Мій кабінет</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mb-4 overflow-x-auto scrollbar-none">
        {[
          { key: 'orders', label: 'Замовлення' },
          { key: 'subs',   label: 'Підписки' },
          { key: 'bonus',  label: '🎁 Бонуси' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={clsx(
              'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
              tab === key
                ? 'bg-[var(--green)] text-white border-[var(--green)]'
                : 'bg-white text-[var(--textm)] border-[var(--border)]',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-4 flex flex-col gap-3">
        {tab === 'orders' && (
          <>
            {ordersLoading && [1, 2, 3].map(i => <SkeletonCard key={i} />)}

            {!ordersLoading && orders.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="text-5xl">🛍</span>
                <p className="text-[var(--textm)] text-sm max-w-[200px]">
                  У вас ще немає замовлень.<br />Відкрийте каталог та оберіть букет!
                </p>
                <button
                  onClick={() => navigate('/catalog')}
                  className="mt-2 px-6 py-2.5 bg-[var(--green)] text-white rounded-2xl text-sm font-medium"
                >
                  До каталогу
                </button>
              </div>
            )}

            {!ordersLoading && orders.map(o => <OrderCard key={o.id} order={o} />)}
          </>
        )}

        {tab === 'subs' && (
          <>
            {subsLoading && [1, 2].map(i => <SkeletonCard key={i} />)}

            {!subsLoading && subs.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="text-5xl">🌸</span>
                <p className="text-[var(--textm)] text-sm max-w-[220px]">
                  У вас ще немає підписок.<br />Отримуйте свіжі букети кожного тижня!
                </p>
                <button
                  onClick={() => navigate('/subscribe')}
                  className="mt-2 px-6 py-2.5 bg-[var(--green)] text-white rounded-2xl text-sm font-medium"
                >
                  Оформити підписку
                </button>
              </div>
            )}

            {!subsLoading && subs.map(s => (
              <SubscriptionCard key={s.id} sub={s} onManage={handleManage} />
            ))}

            {!subsLoading && subs.length > 0 && (
              <button
                onClick={() => navigate('/subscribe')}
                className={clsx(
                  'w-full py-3 rounded-2xl border-2 border-dashed border-[var(--sage)]',
                  'text-[var(--sage)] text-sm font-medium mt-1',
                  'active:bg-[var(--sagelb)]',
                )}
              >
                + Нова підписка
              </button>
            )}
          </>
        )}

        {tab === 'bonus' && (
          <BonusTab me={me} meLoading={meLoading} tg={tg} />
        )}
      </div>

      {/* Pause modal */}
      {pauseTarget && (
        <PauseModal
          sub={pauseTarget}
          onConfirm={handlePauseConfirm}
          onClose={() => setPauseTarget(null)}
        />
      )}
    </div>
  )
}
