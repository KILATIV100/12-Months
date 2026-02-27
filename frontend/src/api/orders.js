/**
 * Orders API — client-side functions.
 *
 * createOrder(data)            → POST /api/orders
 * createCustomOrder(data)      → POST /api/orders/custom  (2D constructor)
 * createPaymentLink(orderId)   → POST /api/payments/create/{orderId}
 * getMyOrders(params)          → GET  /api/orders/my
 * getOrder(orderId)            → GET  /api/orders/{orderId}
 */
import client from './client'

/**
 * @typedef {Object} OrderItemIn
 * @property {string} product_id - UUID
 * @property {number} quantity
 */

/**
 * @typedef {Object} OrderIn
 * @property {OrderItemIn[]} items
 * @property {'pickup'|'delivery'} delivery_type
 * @property {string|null} address
 * @property {string|null} delivery_date      - YYYY-MM-DD
 * @property {string|null} delivery_time_slot - "14:00–16:00"
 * @property {string} recipient_name
 * @property {string} recipient_phone
 * @property {string|null} comment
 */

/**
 * Create a new order.
 * Server recalculates total_price — client price is NOT trusted.
 *
 * @param {OrderIn} orderData
 * @returns {Promise<{id: string, status: string, total_price: number, qr_token: string, items: object[]}>}
 */
export async function createOrder(orderData) {
  const { data } = await client.post('/orders', orderData)
  return data
}

/**
 * Create a custom bouquet order from the 2D constructor.
 * Server recalculates total from element prices — client total is NOT trusted.
 *
 * @param {object} data
 * @returns {Promise<object>}
 */
export async function createCustomOrder(data) {
  const { data: result } = await client.post('/orders/custom', data)
  return result
}

/**
 * Generate a LiqPay checkout URL for an existing order.
 *
 * @param {string} orderId - UUID of the order
 * @returns {Promise<{checkout_url: string, data: string, signature: string}>}
 */
export async function createPaymentLink(orderId) {
  const { data } = await client.post(`/payments/create/${orderId}`)
  return data
}

/**
 * Get the current user's order history.
 *
 * @param {{ limit?: number, offset?: number }} params
 * @returns {Promise<object[]>}
 */
export async function getMyOrders(params = {}) {
  const { data } = await client.get('/orders/my', { params })
  return data
}

/**
 * Get a single order by ID.
 *
 * @param {string} orderId - UUID
 * @returns {Promise<object>}
 */
export async function getOrder(orderId) {
  const { data } = await client.get(`/orders/${orderId}`)
  return data
}
