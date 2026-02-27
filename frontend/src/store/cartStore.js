/**
 * Cart store — powered by Zustand with localStorage persistence.
 *
 * State shape:
 *   items: Array<{ product: ProductOut | CustomProduct, quantity: number }>
 *
 * Regular product items have the standard ProductOut shape.
 * Custom bouquet items (from the 2D constructor) have:
 *   product.isCustom = true
 *   product.id       = 'custom-<uuid>'
 *   product.name     = 'Власний букет'
 *   product.base_price = <server-side computed total>
 *   product.customData = { packagingId, packagingEmoji, elements, elementDetails, totalPrice }
 *
 * All mutations are synchronous; the store is persisted to
 * localStorage under the key 'twelve-months-cart' so the cart
 * survives page reloads inside Telegram Mini App.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      /** @type {Array<{ product: object, quantity: number }>} */
      items: [],

      // ── Mutations ──────────────────────────────────────────────

      /** Add one unit of a product (or increment if already in cart). */
      addItem(product) {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id)
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...state.items, { product, quantity: 1 }] }
        })
      },

      /** Remove one unit (removes the row when quantity reaches 0). */
      decrementItem(productId) {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === productId)
          if (!existing) return state
          if (existing.quantity === 1) {
            return { items: state.items.filter((i) => i.product.id !== productId) }
          }
          return {
            items: state.items.map((i) =>
              i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
            ),
          }
        })
      },

      /** Remove the product row completely regardless of quantity. */
      removeItem(productId) {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }))
      },

      /** Empty the entire cart. */
      clearCart() {
        set({ items: [] })
      },

      /**
       * Add a custom bouquet (from the 2D constructor) as a single cart item.
       *
       * @param {{ packagingId, packagingEmoji, elements, elementDetails, totalPrice }} bouquetData
       */
      addCustomBouquet(bouquetData) {
        const product = {
          id:         `custom-${crypto.randomUUID()}`,
          name:       'Власний букет',
          base_price: bouquetData.totalPrice,
          image_url:  null,
          isCustom:   true,
          customData: bouquetData,
        }
        set((state) => ({ items: [...state.items, { product, quantity: 1 }] }))
      },

      // ── Selectors (call get() at usage time for fresh values) ──

      /** Total price in UAH. */
      get totalPrice() {
        return get().items.reduce(
          (sum, i) => sum + Number(i.product.base_price) * i.quantity,
          0
        )
      },

      /** Total number of individual items. */
      get totalCount() {
        return get().items.reduce((sum, i) => sum + i.quantity, 0)
      },

      /** Returns true if the product is in the cart. */
      isInCart(productId) {
        return get().items.some((i) => i.product.id === productId)
      },

      /** Returns quantity for a given product (0 if not in cart). */
      getQuantity(productId) {
        return get().items.find((i) => i.product.id === productId)?.quantity ?? 0
      },
    }),
    {
      name: 'twelve-months-cart',
      // Only persist the items array, not the methods
      partialize: (state) => ({ items: state.items }),
    }
  )
)

export default useCartStore

// ── Convenience selector hooks (stable references) ────────────────────────────

export const useCartItems = () => useCartStore((s) => s.items)
export const useCartTotal = () =>
  useCartStore((s) =>
    s.items.reduce((sum, i) => sum + Number(i.product.base_price) * i.quantity, 0)
  )
export const useCartCount = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0))
export const useItemQuantity = (productId) =>
  useCartStore((s) => s.items.find((i) => i.product.id === productId)?.quantity ?? 0)
