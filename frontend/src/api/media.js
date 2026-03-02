/**
 * // filepath: frontend/src/api/media.js
 *
 * Media / greeting-card API.
 */
import client from './client'

/**
 * Upload a text or video greeting for an order.
 *
 * @param {object} opts
 * @param {string}    opts.orderId        — UUID of the order
 * @param {'text'|'video'} opts.greetingType
 * @param {string}    [opts.greetingText] — required for type="text"
 * @param {File}      [opts.videoFile]    — required for type="video"
 * @returns {{ qr_token, greeting_url, greeting_text, greeting_type, qr_public_url, qr_png_base64 }}
 */
export async function uploadGreeting({ orderId, greetingType, greetingText, videoFile }) {
  const form = new FormData()
  form.append('order_id', orderId)
  form.append('greeting_type', greetingType)

  if (greetingText) {
    form.append('greeting_text', greetingText)
  }

  if (videoFile) {
    form.append('video', videoFile)
  }

  const { data } = await client.post('/api/media/greeting', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

/**
 * Fetch a greeting by QR token (public — no auth needed).
 *
 * @param {string} qrToken
 * @returns {{ qr_token, greeting_type, greeting_text, greeting_url, recipient_name, order_id }}
 */
export async function getGreeting(qrToken) {
  const { data } = await client.get(`/api/media/greeting/${qrToken}`)
  return data
}
