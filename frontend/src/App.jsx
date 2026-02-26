/**
 * App — root component.
 *
 * Sets up React Router v6 with routes:
 *   /          → redirect → /catalog
 *   /catalog   → CatalogPage
 *   /cart      → CartPage
 *   /checkout  → CheckoutPage   (Sprint 4)
 *   /profile   → placeholder    (Sprint 5)
 *
 * Applies Telegram WebApp theme colours to CSS :root so the TWA
 * adapts to the user's Telegram colour scheme automatically.
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BottomNav from '@components/layout/BottomNav'
import CatalogPage from '@pages/CatalogPage'
import CartPage from '@pages/CartPage'
import CheckoutPage from '@pages/CheckoutPage'
import { useTelegram } from '@hooks/useTelegram'

// ── React Query client ────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      gcTime: 1000 * 60 * 30,     // 30 min (was cacheTime in v4)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ── Placeholder pages ─────────────────────────────────────────────────────────

function PlaceholderPage({ title, emoji }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen pb-20" style={{ paddingTop: 'var(--safe-top)' }}>
      <span className="text-5xl">{emoji}</span>
      <p className="text-[var(--textm)] text-sm">{title} — буде в наступних спринтах</p>
    </div>
  )
}

// ── TWA theme sync ────────────────────────────────────────────────────────────

function TelegramThemeSync() {
  const { tg, themeParams } = useTelegram()

  useEffect(() => {
    if (!tg || !themeParams) return
    const root = document.documentElement
    // Map Telegram theme params to our CSS vars (non-destructive override)
    if (themeParams.bg_color)          root.style.setProperty('--tg-bg-color', themeParams.bg_color)
    if (themeParams.text_color)        root.style.setProperty('--tg-text-color', themeParams.text_color)
    if (themeParams.hint_color)        root.style.setProperty('--tg-hint-color', themeParams.hint_color)
    if (themeParams.link_color)        root.style.setProperty('--tg-link-color', themeParams.link_color)
    if (themeParams.button_color)      root.style.setProperty('--tg-button-color', themeParams.button_color)
    if (themeParams.button_text_color) root.style.setProperty('--tg-button-text-color', themeParams.button_text_color)
  }, [tg, themeParams])

  return null
}

// ── App shell ─────────────────────────────────────────────────────────────────

function AppShell() {
  const { tg } = useTelegram()

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
    }
  }, [tg])

  return (
    <>
      <TelegramThemeSync />
      <main
        className="relative"
        style={{ background: 'var(--cream)', minHeight: '100dvh' }}
      >
        <Routes>
          <Route path="/"         element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog"  element={<CatalogPage />} />
          <Route path="/cart"     element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/profile"  element={<PlaceholderPage title="Особистий кабінет" emoji="👤" />} />
          <Route path="*"         element={<Navigate to="/catalog" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  )
}

// ── Root export ───────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
