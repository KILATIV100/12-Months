/**
 * initData utilities — helpers for working with Telegram TWA initData.
 *
 * These run in the browser and do NOT validate the HMAC signature
 * (that is done server-side in backend/api/security.py).
 * The functions here are for reading the data on the client side.
 */

/**
 * Parse the raw initData query string into a plain object.
 * JSON-encoded fields (user, receiver, chat) are automatically parsed.
 *
 * @param {string} raw - window.Telegram.WebApp.initData
 * @returns {Record<string, unknown>}
 */
export function parseInitData(raw) {
  if (!raw) return {}

  const params = new URLSearchParams(raw)
  const result = {}

  for (const [key, value] of params.entries()) {
    try {
      result[key] = JSON.parse(value)
    } catch {
      result[key] = value
    }
  }

  return result
}

/**
 * Extract the Telegram user from initData.
 *
 * @param {string} raw - window.Telegram.WebApp.initData
 * @returns {{ id: number, first_name: string, username?: string } | null}
 */
export function getUserFromInitData(raw) {
  const data = parseInitData(raw)
  return data.user ?? null
}

/**
 * Build the auth header object to attach to every API request.
 * Returns an empty object when initData is not available (non-Telegram env).
 *
 * @returns {Record<string, string>}
 */
export function getAuthHeaders() {
  const initData = window.Telegram?.WebApp?.initData
  if (!initData) return {}
  return { 'X-Init-Data': initData }
}

/**
 * Returns true when the app is running inside an actual Telegram client.
 */
export function isInsideTelegram() {
  return Boolean(window.Telegram?.WebApp?.initData)
}
