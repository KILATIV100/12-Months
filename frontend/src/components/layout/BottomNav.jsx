/**
 * // filepath: frontend/src/components/layout/BottomNav.jsx
 *
 * BottomNav — fixed bottom navigation bar.
 *
 * Tabs: Каталог · Тіндер · Кошик · Календар · Кабінет
 *
 * Sprint 7 changes:
 *   - Added Календар tab (/calendar) — replaces "Головна"
 *   - Added Тіндер tab (/tinder) for easy access
 *   - Removed the redundant "/" (home) tab that just redirected to /catalog
 *
 * The Кошик tab shows a count badge via useCartCount().
 */
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useCartCount } from '@store/cartStore'
import { Badge } from '@components/ui'

const NAV_ITEMS = [
  {
    to:    '/catalog',
    label: 'Каталог',
    icon:  CatalogIcon,
  },
  {
    to:    '/tinder',
    label: 'Тіндер',
    icon:  TinderIcon,
  },
  {
    to:    '/cart',
    label: 'Кошик',
    icon:  CartIcon,
    badge: true,
  },
  {
    to:    '/calendar',
    label: 'Дати',
    icon:  CalendarIcon,
  },
  {
    to:    '/profile',
    label: 'Кабінет',
    icon:  ProfileIcon,
  },
]

export default function BottomNav() {
  const cartCount = useCartCount()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-overlay)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div
        className={clsx(
          'flex items-stretch',
          'bg-[var(--cream)]/90 backdrop-blur-md',
          'border-t border-[var(--border)]',
          'shadow-[0_-4px_24px_rgba(45,80,22,0.07)]',
        )}
      >
        {NAV_ITEMS.map(({ to, end, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5',
                'pt-2 pb-1.5 min-h-[56px]',
                'transition-colors duration-[var(--transition-fast)]',
                'outline-none select-none',
                isActive
                  ? 'text-[var(--green)]'
                  : 'text-[var(--textl)] hover:text-[var(--sage)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon
                    className={clsx(
                      'w-5 h-5 transition-transform duration-[var(--transition-fast)]',
                      isActive && 'scale-110',
                    )}
                    filled={isActive}
                  />
                  {badge && cartCount > 0 && (
                    <Badge
                      variant="count"
                      className="absolute -top-1.5 -right-1.5"
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </Badge>
                  )}
                </span>
                <span
                  className={clsx(
                    'text-[10px] leading-none font-medium tracking-wide',
                    isActive ? 'text-[var(--green)]' : 'text-[var(--textl)]',
                  )}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

// ── Inline SVG icons ───────────────────────────────────────────────────────────

function CatalogIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled
        ? <path fill="currentColor" d="M4 5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5Zm9 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V5ZM4 14a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-4Zm9 0a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1v-4Z" />
        : <>
            <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" />
            <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" />
            <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" />
            <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" />
          </>
      }
    </svg>
  )
}

function TinderIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled
        ? <path fill="currentColor" d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402Z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="M12 21c-5.6-5.5-11-10.3-11-14.4C1 3 4.1 1.6 6.3 1.6c1.3 0 4.1.5 5.7 4.5 1.6-4 4.5-4.4 5.7-4.4C20.2 1.7 23 3.3 23 6.6 23 10.7 17.6 15.5 12 21Z" />
      }
    </svg>
  )
}

function CartIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled
        ? <path fill="currentColor" d="M2 3a1 1 0 0 1 1-1h1.28a2 2 0 0 1 1.897 1.368L6.72 5H20a1 1 0 0 1 .962 1.275l-2 7A1 1 0 0 1 18 14H8l.5 2H18a1 1 0 0 1 0 2H8a1 1 0 0 1-.962-.725L4.28 5H3a1 1 0 0 1-1-1Zm7 14a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
        : <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <line x1="3" y1="6" x2="21" y2="6" strokeLinecap="round" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 10a4 4 0 0 1-8 0" />
          </>
      }
    </svg>
  )
}

function CalendarIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled
        ? <path fill="currentColor" d="M8 2a1 1 0 0 1 1 1v1h6V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1Zm-3 8v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9H5Zm3 3a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM8 17a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" />
        : <>
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" />
            <line x1="16" y1="2" x2="16" y2="6" strokeLinecap="round" />
            <line x1="8"  y1="2" x2="8"  y2="6" strokeLinecap="round" />
            <line x1="3"  y1="10" x2="21" y2="10" strokeLinecap="round" />
            <circle cx="8"  cy="15" r="1" fill="currentColor" stroke="none" />
            <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
            <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
          </>
      }
    </svg>
  )
}

function ProfileIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled
        ? <path fill="currentColor" d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2Zm0 12c5.523 0 10 2.239 10 5v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-1c0-2.761 4.477-5 10-5Z" />
        : <>
            <circle cx="12" cy="8" r="4" strokeLinecap="round" />
            <path strokeLinecap="round" d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" />
          </>
      }
    </svg>
  )
}
