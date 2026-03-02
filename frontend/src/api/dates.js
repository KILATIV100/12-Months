/**
 * // filepath: frontend/src/api/dates.js
 *
 * Important-dates (calendar events) API client.
 */
import client from './client'

/**
 * Fetch all active important dates for the current user,
 * sorted by next occurrence (backend-sorted).
 *
 * @returns {Promise<DateItem[]>}
 */
export async function getDates() {
  const { data } = await client.get('/api/dates')
  return data
}

/**
 * Create a new important date.
 *
 * @param {object} payload
 * @param {string}   payload.label           - e.g. "День народження"
 * @param {string}   [payload.person_name]   - e.g. "Мама"
 * @param {string}   payload.date            - ISO date string "YYYY-MM-DD"
 * @param {boolean}  payload.repeat_yearly   - true by default
 * @param {number[]} [payload.reminder_days] - [3, 1] by default
 * @returns {Promise<DateItem>}
 */
export async function createDate(payload) {
  const { data } = await client.post('/api/dates', payload)
  return data
}

/**
 * Delete an important date by ID.
 *
 * @param {string} dateId - UUID string
 * @returns {Promise<void>}
 */
export async function deleteDate(dateId) {
  await client.delete(`/api/dates/${dateId}`)
}

/**
 * @typedef {object} DateItem
 * @property {string}   id
 * @property {string}   label
 * @property {string|null} person_name
 * @property {string}   date           — ISO date "YYYY-MM-DD"
 * @property {boolean}  repeat_yearly
 * @property {number[]} reminder_days
 * @property {boolean}  is_active
 * @property {string}   dot_color      — "pink" | "gold" | "green"
 * @property {number}   days_until
 * @property {string|null} next_date   — ISO date of next occurrence
 */
