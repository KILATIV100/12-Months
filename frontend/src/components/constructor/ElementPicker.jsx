/**
 * // filepath: frontend/src/components/constructor/ElementPicker.jsx
 *
 * ElementPicker — scrollable panel of bouquet elements.
 *
 * Tabs: Квіти | Зелень | Пакування | Декор
 * Each tab shows a horizontal scroll list of element cards.
 * Tapping a card:
 *   - For "base" (packaging): sets it as the packaging in constructorStore.
 *   - For everything else: adds an item to the canvas (addElement).
 */
import { useState } from 'react'
import { clsx } from 'clsx'
import useConstructorStore, { useConstructorPackaging } from '@store/constructorStore'

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'flower', label: 'Квіти',     icon: '🌸' },
  { key: 'green',  label: 'Зелень',    icon: '🌿' },
  { key: 'base',   label: 'Пакування', icon: '📦' },
  { key: 'decor',  label: 'Декор',     icon: '🎀' },
]

// ── Element card ──────────────────────────────────────────────────────────────

function ElementCard({ element, isSelected, onTap }) {
  return (
    <button
      onClick={onTap}
      className={clsx(
        'flex flex-col items-center gap-1 px-3 py-2.5 rounded-2xl shrink-0',
        'border-2 transition-all active:scale-95',
        isSelected
          ? 'border-[var(--green)] bg-[var(--sagelb)]'
          : 'border-[var(--border)] bg-white',
      )}
      style={{ minWidth: 72 }}
    >
      <span className="text-3xl leading-none">{element.emoji ?? '🌸'}</span>
      <span
        className={clsx(
          'text-[10px] font-medium leading-tight text-center max-w-[72px] line-clamp-2',
          isSelected ? 'text-[var(--green)]' : 'text-[var(--textm)]',
        )}
      >
        {element.name.replace(/^[^\s]+\s/, '')}  {/* strip leading emoji from name */}
      </span>
      <span className="text-[10px] text-[var(--textl)]">
        {element.price_per_unit} грн
      </span>
    </button>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-2xl border border-[var(--border)] bg-white animate-pulse"
      style={{ minWidth: 72, height: 90 }}
    />
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function ElementPicker({ elements, isLoading }) {
  const [activeTab, setActiveTab] = useState('flower')

  const addElement   = useConstructorStore((s) => s.addElement)
  const setPackaging = useConstructorStore((s) => s.setPackaging)
  const packaging    = useConstructorPackaging()

  const tabElements = elements?.[activeTab] ?? []

  function handleTap(element) {
    if (element.type === 'base') {
      setPackaging(element)
    } else {
      addElement(element)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Tab bar */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar px-4">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium shrink-0',
              'border transition-all',
              activeTab === tab.key
                ? 'bg-[var(--green)] text-white border-[var(--green)]'
                : 'bg-white text-[var(--textm)] border-[var(--border)]',
            )}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Horizontal scroll of cards */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-1">
        {isLoading
          ? [1, 2, 3, 4, 5].map((i) => <SkeletonCard key={i} />)
          : tabElements.length === 0
            ? (
                <p className="text-[var(--textl)] text-xs px-1 py-3 italic">
                  Немає доступних елементів
                </p>
              )
            : tabElements.map((el) => (
                <ElementCard
                  key={el.id}
                  element={el}
                  isSelected={activeTab === 'base' && packaging?.id === el.id}
                  onTap={() => handleTap(el)}
                />
              ))
        }
      </div>
    </div>
  )
}
