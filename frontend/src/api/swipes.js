/**
 * // filepath: frontend/src/api/swipes.js
 *
 * Swipe / Tinder-mode session API.
 */
import client from './client'

/**
 * Submit the result of a Tinder swipe session.
 *
 * @param {{ liked_ids: string[], disliked_ids: string[] }} payload
 * @returns {{ session_id: string, ai_summary: string, recommendations: Product[] }}
 */
export async function createSwipeSession(payload) {
  const { data } = await client.post('/api/swipes/session', payload)
  return data
}
