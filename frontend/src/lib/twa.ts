import WebApp from "@twa-dev/sdk";

export function initTWA() {
  try {
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor("#0e1a0a");
    WebApp.setBackgroundColor("#faf8f2");
  } catch {
    // running outside Telegram (dev preview)
  }
}

export function tgId(): number {
  return WebApp.initDataUnsafe.user?.id ?? 0;
}

export function tgName(): string {
  const u = WebApp.initDataUnsafe.user;
  return u ? `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() : "";
}

export function haptic(kind: "success" | "warning" | "error" = "success") {
  try {
    WebApp.HapticFeedback.notificationOccurred(kind);
  } catch {
    // ignore
  }
}

export function closeApp() {
  WebApp.close();
}

export const TWA = WebApp;
