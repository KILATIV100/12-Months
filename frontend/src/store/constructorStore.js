/**
 * // filepath: frontend/src/store/constructorStore.js
 *
 * Zustand store for the 2D bouquet constructor.
 *
 * State:
 *   packaging  — selected base element (BouquetElement | null)
 *   items      — draggable flowers/greens/decor on the canvas
 *                [{ instanceId, element, x, y }]
 *   occasion   — chosen event label ("День народження" etc.)
 *
 * The store is NOT persisted — the constructor starts fresh each visit.
 */
import { create } from 'zustand'

const useConstructorStore = create((set, get) => ({
  /** @type {{ id: string, name: string, emoji: string, price_per_unit: number, ... } | null} */
  packaging: null,

  /**
   * Items placed on the canvas.
   * @type {Array<{ instanceId: string, element: object, x: number, y: number }>}
   */
  items: [],

  /** Human-readable event label for AI hint context. */
  occasion: '',

  // ── Actions ──────────────────────────────────────────────────────────────

  setPackaging(element) {
    set({ packaging: element })
  },

  /** Add an element to the canvas at the centre (x=0, y=0 relative to container). */
  addElement(element) {
    const instanceId = crypto.randomUUID()
    set((state) => ({
      items: [...state.items, { instanceId, element, x: 0, y: 0 }],
    }))
  },

  removeElement(instanceId) {
    set((state) => ({
      items: state.items.filter((i) => i.instanceId !== instanceId),
    }))
  },

  moveElement(instanceId, x, y) {
    set((state) => ({
      items: state.items.map((i) =>
        i.instanceId === instanceId ? { ...i, x, y } : i
      ),
    }))
  },

  setOccasion(occasion) {
    set({ occasion })
  },

  clearAll() {
    set({ packaging: null, items: [], occasion: '' })
  },
}))

export default useConstructorStore

// ── Selector hooks ────────────────────────────────────────────────────────────

export const useConstructorItems    = () => useConstructorStore((s) => s.items)
export const useConstructorPackaging = () => useConstructorStore((s) => s.packaging)
export const useConstructorOccasion  = () => useConstructorStore((s) => s.occasion)

/** Computed total price: packaging + all placed items. */
export const useConstructorTotal = () =>
  useConstructorStore((s) => {
    const packPrice  = Number(s.packaging?.price_per_unit ?? 0)
    const itemsPrice = s.items.reduce((sum, i) => sum + Number(i.element.price_per_unit), 0)
    return packPrice + itemsPrice
  })

/** Human-readable list of element names for the AI hint. */
export const useFlowersList = () =>
  useConstructorStore((s) => [
    ...(s.packaging ? [`${s.packaging.emoji ?? '📦'} ${s.packaging.name}`] : []),
    ...s.items.map((i) => `${i.element.emoji ?? '🌸'} ${i.element.name}`),
  ])
