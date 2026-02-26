/**
 * BottomNav — fixed bottom navigation bar.
 *
 * Tabs: Головна · Каталог · Кошик · Кабінет
 * The Кошик tab shows a badge with the current item count.
 *
 * Respects the iOS safe-area-inset-bottom via CSS var(--safe-bottom).
 */
import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import { useCartCount } from '@store/cartStore'
import { Badge } from '@components/ui'

const NAV_ITEMS = [
  {
    to: '/',
    end: true,
    label: 'Головна',
    icon: HomeIcon,
  },
  {
    to: '/catalog',
    label: 'Каталог',
    icon: CatalogIcon,
  },
  {
    to: '/cart',
    label: 'Кошик',
    icon: CartIcon,
    badge: true,
  },
  {
    to: '/profile',
    label: 'Кабінет',
    icon: ProfileIcon,
  },
]

export default function BottomNav() {
  const cartCount = useCartCount()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[var(--z-overlay)]"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      {/* blur backdrop */}
      <div
        className={clsx(
          'flex items-stretch',
          'bg-[var(--cream)]/90 backdrop-blur-md',
          'border-t border-[var(--border)]',
          'shadow-[0_-4px_24px_rgba(45,80,22,0.07)]'
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
                  : 'text-[var(--textl)] hover:text-[var(--sage)]'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  <Icon
                    className={clsx(
                      'w-5 h-5 transition-transform duration-[var(--transition-fast)]',
                      isActive && 'scale-110'
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
                    isActive ? 'text-[var(--green)]' : 'text-[var(--textl)]'
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

function HomeIcon({ className, filled }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={filled ? 0 : 1.8}>
      {filled
        ? <path fill="currentColor" d="M10.55 2.533a2 2 0 0 1 2.9 0l7 7.56A2 2 0 0 1 21 11.44V20a2 2 0 0 1-2 2h-4v-5a3 3 0 0 0-6 0v5H5a2 2 0 0 1-2-2v-8.56a2 2 0 0 1 .55-1.347l7-7.56Z" />
        : <path strokeLinecap="round" strokeLinejoin="round" d="m3 9.5 9-7 9 7V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z M9 21V12h6v9" />
      }
    </svg>
  )
}

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
