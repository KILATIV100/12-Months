/**
 * StepBar — visual step indicator for the checkout flow.
 *
 * Steps:
 *   1. Підтвердження  (cart review)
 *   2. Доставка       (delivery details)
 *   3. Отримувач      (recipient info)
 *   4. Оплата         (payment)
 *
 * Props:
 *   currentStep  {number}  1–4
 *   totalSteps   {number}  default 4
 */
import { clsx } from 'clsx'

const STEPS = [
  { label: 'Кошик',     shortLabel: '1' },
  { label: 'Доставка',  shortLabel: '2' },
  { label: 'Отримувач', shortLabel: '3' },
  { label: 'Оплата',    shortLabel: '4' },
]

export default function StepBar({ currentStep = 1 }) {
  return (
    <div className="w-full px-4 py-3">
      <div className="flex items-center justify-between relative">

        {/* Connecting line (behind circles) */}
        <div
          className="absolute top-[14px] left-0 right-0 h-[2px] bg-[var(--cream3)] -z-0"
          aria-hidden
        />
        {/* Progress line */}
        <div
          className="absolute top-[14px] left-0 h-[2px] bg-[var(--green)] -z-0 transition-all duration-500 ease-out"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
          }}
          aria-hidden
        />

        {/* Step circles */}
        {STEPS.map((step, index) => {
          const stepNum = index + 1
          const isCompleted = stepNum < currentStep
          const isCurrent   = stepNum === currentStep
          const isPending   = stepNum > currentStep

          return (
            <div
              key={stepNum}
              className="flex flex-col items-center gap-1.5 z-10"
            >
              {/* Circle */}
              <div
                className={clsx(
                  'w-7 h-7 rounded-full flex items-center justify-center',
                  'text-xs font-semibold',
                  'border-2 transition-all duration-300',
                  isCompleted && [
                    'bg-[var(--green)] border-[var(--green)] text-[var(--cream)]',
                  ],
                  isCurrent && [
                    'bg-[var(--cream)] border-[var(--green)] text-[var(--green)]',
                    'shadow-[0_0_0_4px_rgba(28,54,16,0.12)]',
                  ],
                  isPending && [
                    'bg-[var(--cream2)] border-[var(--cream3)] text-[var(--textl)]',
                  ]
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isCompleted
                  ? <CheckIcon />
                  : stepNum
                }
              </div>

              {/* Label */}
              <span
                className={clsx(
                  'text-[10px] leading-none font-medium whitespace-nowrap',
                  isCompleted && 'text-[var(--sage)]',
                  isCurrent   && 'text-[var(--green)]',
                  isPending   && 'text-[var(--textl)]',
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="2.5 8 6.5 12 13.5 4" />
    </svg>
  )
}
