/**
 * // filepath: frontend/src/pages/ConstructorPage.jsx
 *
 * ConstructorPage — 2D bouquet constructor.
 *
 * Layout (top → bottom):
 *   1. Header with back button + "Очистити" action
 *   2. Occasion selector (pills)
 *   3. Canvas (draggable flower emojis over packaging background)
 *   4. AIHint (Claude Haiku tip, debounced 1.5 s)
 *   5. ElementPicker (tabs: Квіти / Зелень / Пакування / Декор)
 *   6. PriceBar (total + "В кошик" button)
 */
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useTelegram } from '@hooks/useTelegram'
import useConstructorStore, { useConstructorOccasion } from '@store/constructorStore'
import Canvas        from '@components/constructor/Canvas'
import ElementPicker from '@components/constructor/ElementPicker'
import AIHint        from '@components/constructor/AIHint'
import PriceBar      from '@components/constructor/PriceBar'
import { getElements } from '@api/elements'

// ── Occasion pills ────────────────────────────────────────────────────────────

const OCCASIONS = [
  'День народження',
  'Річниця',
  'Весілля',
  'Просто так',
  'Вибачення',
  'Випускний',
]

function OccasionPicker() {
  const occasion    = useConstructorOccasion()
  const setOccasion = useConstructorStore((s) => s.setOccasion)

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-4">
      {OCCASIONS.map((o) => (
        <button
          key={o}
          onClick={() => setOccasion(occasion === o ? '' : o)}
          className={clsx(
            'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
            occasion === o
              ? 'bg-[var(--green)] text-white border-[var(--green)]'
              : 'bg-white text-[var(--textm)] border-[var(--border)]',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConstructorPage() {
  const navigate = useNavigate()
  const { tg }   = useTelegram()

  const clearAll = useConstructorStore((s) => s.clearAll)
  const items    = useConstructorStore((s) => s.items)
  const packaging = useConstructorStore((s) => s.packaging)

  const { data: elements, isLoading } = useQuery({
    queryKey: ['bouquet-elements'],
    queryFn:  getElements,
    staleTime: 1000 * 60 * 30,  // elements rarely change
  })

  const hasContent = items.length > 0 || packaging

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        paddingTop: 'var(--safe-top)',
        background: 'var(--cream)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[var(--border)] text-[var(--deep)] text-xl"
        >
          ‹
        </button>

        <div className="text-center">
          <h1 className="text-[var(--deep)] text-sm font-bold">Конструктор букету</h1>
          <p className="text-[var(--textl)] text-[10px]">Торкніться квітки двічі — щоб прибрати</p>
        </div>

        <button
          onClick={clearAll}
          disabled={!hasContent}
          className={clsx(
            'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
            hasContent
              ? 'border-[#d9a0a6] text-[#8b4a52] bg-white'
              : 'border-[var(--border)] text-[var(--textl)] bg-white opacity-40',
          )}
        >
          Очистити
        </button>
      </div>

      {/* ── Scrollable main content ─────────────────────────────── */}
      <div className="flex-1 flex flex-col gap-3 overflow-hidden">
        {/* Occasion */}
        <OccasionPicker />

        {/* Canvas */}
        <div className="px-4">
          <Canvas />
        </div>

        {/* AI Hint */}
        <AIHint />

        {/* Element Picker */}
        <ElementPicker elements={elements} isLoading={isLoading} />
      </div>

      {/* ── PriceBar (fixed bottom) ─────────────────────────────── */}
      <PriceBar />
    </div>
  )
}
