/**
 * // filepath: frontend/src/App.jsx
 *
 * App — root component.
 *
 * Routes:
 *   /                  → redirect → /catalog
 *   /catalog           → CatalogPage
 *   /cart              → CartPage
 *   /checkout          → CheckoutPage
 *   /tinder            → TinderPage              (Sprint 6 — swipe mode)
 *   /greeting/:qrToken → GreetingPage            (Sprint 6 — public card viewer)
 *   /calendar          → CalendarPage            (Sprint 7 — important dates)
 *   /profile           → ProfilePage             (Sprint 8 — orders + subscriptions)
 *   /subscribe         → CreateSubscriptionPage  (Sprint 8 — new subscription form)
 *   *                  → redirect → /catalog
 */
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BottomNav              from '@components/layout/BottomNav'
import CatalogPage            from '@pages/CatalogPage'
import CartPage               from '@pages/CartPage'
import CheckoutPage           from '@pages/CheckoutPage'
import TinderPage             from '@pages/TinderPage'
import GreetingPage           from '@pages/GreetingPage'
import CalendarPage           from '@pages/CalendarPage'
import ProfilePage            from '@pages/ProfilePage'
import CreateSubscriptionPage from '@pages/CreateSubscriptionPage'
import { useTelegram } from '@hooks/useTelegram'

// ── React Query client ────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // 5 min
      gcTime:    1000 * 60 * 30,  // 30 min
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// ── Placeholder pages ─────────────────────────────────────────────────────────

function PlaceholderPage({ title, emoji }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 min-h-screen pb-20"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
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
    if (themeParams.bg_color)          root.style.setProperty('--tg-bg-color',          themeParams.bg_color)
    if (themeParams.text_color)        root.style.setProperty('--tg-text-color',        themeParams.text_color)
    if (themeParams.hint_color)        root.style.setProperty('--tg-hint-color',        themeParams.hint_color)
    if (themeParams.link_color)        root.style.setProperty('--tg-link-color',        themeParams.link_color)
    if (themeParams.button_color)      root.style.setProperty('--tg-button-color',      themeParams.button_color)
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
          {/* Core */}
          <Route path="/"         element={<Navigate to="/catalog" replace />} />
          <Route path="/catalog"  element={<CatalogPage />} />
          <Route path="/cart"     element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* Sprint 6 */}
          <Route path="/tinder"            element={<TinderPage />} />
          <Route path="/greeting/:qrToken" element={<GreetingPage />} />

          {/* Sprint 7 */}
          <Route path="/calendar" element={<CalendarPage />} />

          {/* Sprint 8 */}
          <Route path="/profile"    element={<ProfilePage />} />
          <Route path="/subscribe"  element={<CreateSubscriptionPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/catalog" replace />} />
        </Routes>
      </main>

      {/* BottomNav hidden on full-screen pages */}
      <Routes>
        <Route path="/checkout"            element={null} />
        <Route path="/greeting/:qrToken"   element={null} />
        <Route path="/tinder"              element={null} />
        <Route path="*"                    element={<BottomNav />} />
      </Routes>
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
