/**
 * // filepath: frontend/src/api/users.js
 *
 * Users API client — Sprint 10.
 */
import { apiGet } from './client'

/**
 * GET /api/users/me
 * Returns: { tg_id, name, bonus_balance, referral_link }
 */
export function getUserMe() {
  return apiGet('/api/users/me')
}
