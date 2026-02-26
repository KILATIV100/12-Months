/**
 * CatalogPage — main shopping screen.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │  Header (store name)         │
 *   │  SearchBar                   │
 *   │  Category filter (h-scroll)  │
 *   │  ProductGrid (2-col CSS grid)│
 *   └──────────────────────────────┘
 *
 * Data fetching: @tanstack/react-query → /api/products + /api/products/categories
 * Search is debounced (400 ms) to avoid request spam.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import client from '@api/client'
import ProductCard from '@components/catalog/ProductCard'
import { Badge } from '@components/ui'
import { useTelegram } from '@hooks/useTelegram'

// ── Category config ────────────────────────────────────────────────────────────

const CATEGORY_LABELS = {
  bouquets: '💐 Готові букети',
  single:   '🌹 Поштучно',
  decor:    '🎀 Декор',
  green:    '🌿 Зелень',
}

// ── API fetchers ───────────────────────────────────────────────────────────────

async function fetchCategories() {
  const { data } = await client.get('/products/categories')
  return data.categories // string[]
}

async function fetchProducts({ category, search }) {
  const params = {}
  if (category) params.category = category
  if (search)   params.search   = search
  params.limit = 60
  const { data } = await client.get('/products', { params })
  return data // { items, total, limit, offset }
}

// ── Debounce hook ──────────────────────────────────────────────────────────────

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CatalogPage() {
  const { haptic } = useTelegram()
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const searchInputRef          = useRef(null)
  const debouncedSearch         = useDebounce(search)

  // ── Queries ───────────────────────────────────────────────
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 10,
  })

  const {
    data: productsData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['products', { category, search: debouncedSearch }],
    queryFn: () => fetchProducts({ category, search: debouncedSearch }),
    staleTime: 1000 * 60 * 2,
    placeholderData: (prev) => prev,
  })

  const categories = categoriesData ?? []
  const products   = productsData?.items ?? []
  const total      = productsData?.total ?? 0

  // ── Handlers ──────────────────────────────────────────────
  const handleCategorySelect = useCallback((slug) => {
    setCategory((prev) => (prev === slug ? '' : slug))
    haptic.selection()
  }, [haptic])

  const handleSearchClear = useCallback(() => {
    setSearch('')
    searchInputRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col min-h-screen pb-[80px]">

      {/* ── Sticky header area ──────────────────────────────── */}
      <div
        className={clsx(
          'sticky top-0 z-[var(--z-overlay)]',
          'bg-[var(--cream)]/95 backdrop-blur-md',
          'border-b border-[var(--borderl)]',
          'px-4 pt-3 pb-2 space-y-2.5'
        )}
        style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}
      >
        {/* Store title */}
        <div className="flex items-center justify-between">
          <h1
            className="text-xl font-light tracking-wide text-[var(--deep)]"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            12 Місяців
          </h1>
          {total > 0 && (
            <span className="text-xs text-[var(--textl)]">
              {total} товар{plural(total)}
            </span>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--textl)] pointer-events-none">
            <SearchIcon />
          </span>
          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук квітів, букетів..."
            className={clsx(
              'w-full pl-9 pr-9 py-2 text-sm',
              'bg-[var(--cream2)] text-[var(--text)]',
              'placeholder:text-[var(--textl)]',
              'border border-[var(--border)] rounded-[var(--radius-full)]',
              'outline-none focus:border-[var(--light)] focus:bg-[var(--cream)]',
              'transition-colors duration-[var(--transition-fast)]'
            )}
          />
          {search && (
            <button
              onClick={handleSearchClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--textl)] hover:text-[var(--text)]"
              aria-label="Очистити пошук"
            >
              <CloseIcon />
            </button>
          )}
        </div>

        {/* Category filter — horizontal scroll */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            {/* "All" pill */}
            <FilterPill
              active={category === ''}
              onClick={() => { setCategory(''); haptic.selection() }}
            >
              Всі
            </FilterPill>

            {categories.map((slug) => (
              <FilterPill
                key={slug}
                active={category === slug}
                onClick={() => handleCategorySelect(slug)}
              >
                {CATEGORY_LABELS[slug] ?? slug}
              </FilterPill>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="flex-1 px-4 pt-4">
        {isLoading && products.length === 0 ? (
          <SkeletonGrid />
        ) : isError ? (
          <ErrorState message={error?.message} />
        ) : products.length === 0 ? (
          <EmptyState search={search} category={category} />
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FilterPill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-none whitespace-nowrap',
        'text-xs font-medium px-3 py-1.5 rounded-[var(--radius-full)]',
        'border transition-colors duration-[var(--transition-fast)]',
        'outline-none active:scale-95',
        active
          ? 'bg-[var(--green)] text-[var(--cream)] border-[var(--green)]'
          : 'bg-[var(--cream2)] text-[var(--textm)] border-[var(--border)] hover:border-[var(--sage)]'
      )}
    >
      {children}
    </button>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] overflow-hidden animate-pulse bg-[var(--cream2)]">
          <div className="aspect-square bg-[var(--cream3)]" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-[var(--cream3)] rounded-full w-3/4" />
            <div className="h-3 bg-[var(--cream3)] rounded-full w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ search, category }) {
  const CATEGORY_LABELS_SHORT = {
    bouquets: 'готових букетів',
    single:   'поштучних квітів',
    decor:    'декору',
    green:    'зелені',
  }
  const categoryLabel = CATEGORY_LABELS_SHORT[category] ?? category

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="text-5xl">🌸</span>
      <p className="text-[var(--textm)] text-sm leading-relaxed">
        {search
          ? `Нічого не знайдено за запитом «${search}»`
          : category
            ? `Поки немає ${categoryLabel} в наявності`
            : 'Каталог порожній'
        }
      </p>
      {(search || category) && (
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-[var(--light)] underline underline-offset-2"
        >
          Показати всі товари
        </button>
      )}
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <span className="text-4xl">⚠️</span>
      <p className="text-[var(--textm)] text-sm">{message ?? 'Не вдалося завантажити каталог'}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-sm text-[var(--light)] underline underline-offset-2"
      >
        Спробувати знову
      </button>
    </div>
  )
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function plural(n) {
  if (n % 10 === 1 && n % 100 !== 11) return ''
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'и'
  return 'ів'
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
