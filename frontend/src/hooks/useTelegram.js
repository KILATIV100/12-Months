/**
 * useTelegram — React hook wrapping window.Telegram.WebApp.
 *
 * Provides:
 *   - tg        : raw WebApp object (or null in non-Telegram env)
 *   - user      : Telegram user object from initDataUnsafe
 *   - themeParams : current Telegram colour theme
 *   - initData  : raw initData string for API authentication
 *   - isReady   : true once tg.ready() has been called
 *   - Helpers   : expand, close, showMainButton, hideMainButton,
 *                 showBackButton, hideBackButton, showAlert, showConfirm,
 *                 haptic (impact / notification / selection)
 */
import { useCallback, useEffect, useState } from 'react'

const tg = window.Telegram?.WebApp ?? null

export function useTelegram() {
  const [isReady, setIsReady] = useState(false)
  const [themeParams, setThemeParams] = useState(tg?.themeParams ?? {})

  useEffect(() => {
    if (!tg) return

    tg.ready()
    tg.expand()
    setIsReady(true)

    // Re-sync theme whenever Telegram sends themeChanged event
    const onThemeChange = () => setThemeParams({ ...tg.themeParams })
    tg.onEvent('themeChanged', onThemeChange)
    return () => tg.offEvent('themeChanged', onThemeChange)
  }, [])

  // ── MainButton helpers ───────────────────────────────────────
  const showMainButton = useCallback((text, onClick, options = {}) => {
    if (!tg) return
    const { color, textColor } = options
    tg.MainButton.setText(text)
    if (color) tg.MainButton.color = color
    if (textColor) tg.MainButton.textColor = textColor
    tg.MainButton.onClick(onClick)
    tg.MainButton.show()
  }, [])

  const hideMainButton = useCallback((onClick) => {
    if (!tg) return
    if (onClick) tg.MainButton.offClick(onClick)
    tg.MainButton.hide()
  }, [])

  const setMainButtonLoading = useCallback((loading) => {
    if (!tg) return
    loading ? tg.MainButton.showProgress() : tg.MainButton.hideProgress()
  }, [])

  // ── BackButton helpers ────────────────────────────────────────
  const showBackButton = useCallback((onClick) => {
    if (!tg) return
    tg.BackButton.onClick(onClick)
    tg.BackButton.show()
  }, [])

  const hideBackButton = useCallback((onClick) => {
    if (!tg) return
    if (onClick) tg.BackButton.offClick(onClick)
    tg.BackButton.hide()
  }, [])

  // ── Popups ────────────────────────────────────────────────────
  const showAlert = useCallback((message) => {
    return new Promise((resolve) => {
      if (!tg) { alert(message); resolve(); return }
      tg.showAlert(message, resolve)
    })
  }, [])

  const showConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      if (!tg) { resolve(window.confirm(message)); return }
      tg.showConfirm(message, resolve)
    })
  }, [])

  // ── Haptic feedback ───────────────────────────────────────────
  const haptic = {
    impact: (style = 'medium') => tg?.HapticFeedback?.impactOccurred(style),
    notification: (type = 'success') => tg?.HapticFeedback?.notificationOccurred(type),
    selection: () => tg?.HapticFeedback?.selectionChanged(),
  }

  return {
    tg,
    user: tg?.initDataUnsafe?.user ?? null,
    initData: tg?.initData ?? '',
    themeParams,
    isReady,
    colorScheme: tg?.colorScheme ?? 'light',
    viewportHeight: tg?.viewportHeight ?? window.innerHeight,
    // Helpers
    expand: () => tg?.expand(),
    close: () => tg?.close(),
    showMainButton,
    hideMainButton,
    setMainButtonLoading,
    showBackButton,
    hideBackButton,
    showAlert,
    showConfirm,
    haptic,
  }
}
