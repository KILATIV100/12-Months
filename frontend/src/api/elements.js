/**
 * // filepath: frontend/src/api/elements.js
 *
 * Bouquet elements API — used by the 2D constructor.
 */
import client from './client'

/**
 * Fetch all available bouquet elements grouped by type.
 *
 * @returns {Promise<{ flower: Element[], green: Element[], base: Element[], decor: Element[] }>}
 */
export async function getElements() {
  const { data } = await client.get('/elements')
  return data
}

/**
 * @typedef {object} Element
 * @property {string}        id
 * @property {string}        name
 * @property {'flower'|'green'|'base'|'decor'} type
 * @property {number}        price_per_unit
 * @property {string|null}   emoji
 * @property {string|null}   image_url
 * @property {string[]|null} color_tags
 */
