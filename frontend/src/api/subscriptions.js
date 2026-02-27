/**
 * // filepath: frontend/src/api/subscriptions.js
 *
 * Subscriptions API client.
 */
import client from './client'

/**
 * Fetch all subscriptions for the current user (active + inactive).
 *
 * @returns {Promise<SubscriptionItem[]>}
 */
export async function getSubscriptions() {
  const { data } = await client.get('/subscriptions')
  return data
}

/**
 * Create a new subscription.
 *
 * @param {object} payload
 * @param {'weekly'|'biweekly'} payload.frequency
 * @param {string|null}        [payload.product_id]    - UUID of catalog product
 * @param {'S'|'M'|'L'|null}   [payload.bouquet_size]  - size if no product_id
 * @param {string}              payload.next_delivery   - ISO date "YYYY-MM-DD"
 * @param {string|null}        [payload.address]
 * @returns {Promise<SubscriptionItem>}
 */
export async function createSubscription(payload) {
  const { data } = await client.post('/subscriptions', payload)
  return data
}

/**
 * Update subscription status (pause / resume / cancel).
 *
 * @param {string} subId  - UUID string
 * @param {object} body
 * @param {'pause'|'resume'|'cancel'} body.action
 * @param {string|null} [body.paused_until]  - ISO date, required for pause
 * @returns {Promise<SubscriptionItem>}
 */
export async function updateSubscriptionStatus(subId, body) {
  const { data } = await client.patch(`/subscriptions/${subId}/status`, body)
  return data
}

/**
 * @typedef {object} SubscriptionItem
 * @property {string}      id
 * @property {'weekly'|'biweekly'} frequency
 * @property {string|null} product_id
 * @property {'S'|'M'|'L'|null} bouquet_size
 * @property {number}      price
 * @property {string}      next_delivery   — ISO date "YYYY-MM-DD"
 * @property {string|null} address
 * @property {boolean}     is_active
 * @property {string|null} paused_until   — ISO date or null
 */
