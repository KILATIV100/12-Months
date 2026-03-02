/**
 * // filepath: frontend/src/api/users.js
 *
 * Users API client — Sprint 10.
 */
import client from './client'

/**
 * GET /api/users/me
 * Returns: { tg_id, name, bonus_balance, referral_link }
 */
export async function getUserMe() {
  const { data } = await client.get('/api/users/me')
  return data
}
