/**
 * // filepath: frontend/src/api/ai.js
 *
 * AI Florist hint API.
 */
import client from './client'

/**
 * Get a single short florist hint for the current bouquet composition.
 *
 * @param {{ flowers_list: string[], budget: number, occasion: string }} params
 * @returns {Promise<{ hint: string }>}
 */
export async function getBouquetHint({ flowers_list = [], budget = 0, occasion = '' } = {}) {
  const { data } = await client.post('/ai/hint', { flowers_list, budget, occasion })
  return data
}
