/**
 * Axios client pre-configured for the 12 Months API.
 *
 * Automatically attaches the Telegram TWA initData as the
 * X-Init-Data header so every request is authenticated.
 */
import axios from 'axios'

const tg = window.Telegram?.WebApp

const client = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10_000,
})

// ── Request interceptor — attach initData ──────────────────────────────────
client.interceptors.request.use((config) => {
  const initData = tg?.initData
  if (initData) {
    config.headers['X-Init-Data'] = initData
  }
  return config
})

// ── Response interceptor — normalise errors ───────────────────────────────
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      'Невідома помилка'
    return Promise.reject(new Error(message))
  }
)

export default client
