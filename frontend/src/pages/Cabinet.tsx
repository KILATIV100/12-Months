import { theme } from "../theme";
import { tgName } from "../lib/twa";

export function Cabinet({ lang = "ua" as const }: { lang?: "ua" | "en" }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream, overflow: "auto" }}>
      <div style={{ padding: "14px 22px 8px" }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Особистий кабінет</div>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>{lang === "ua" ? "Профіль" : "Profile"}</div>
      </div>
      <div style={{ margin: "8px 22px", padding: "18px 16px", background: theme.green, borderRadius: 14, color: theme.cream }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: theme.cream, color: theme.green, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: '"Cormorant Garamond",serif', fontSize: 20 }}>
            {(tgName() || "А")[0]}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{tgName() || "Гість"}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 1 }}>{lang === "ua" ? "12 місяців з нами" : "12 months with us"}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "0 22px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.textl, textTransform: "uppercase", marginBottom: 4 }}>{lang === "ua" ? "Налаштування" : "Settings"}</div>
        {[
          lang === "ua" ? "Сповіщення" : "Notifications",
          lang === "ua" ? "Способи оплати" : "Payment methods",
          lang === "ua" ? "Адреси" : "Addresses",
          lang === "ua" ? "Підтримка" : "Support",
        ].map(s => (
          <div key={s} style={{ padding: "10px 12px", background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 12, color: theme.green, display: "flex", justifyContent: "space-between" }}>
            <span>{s}</span>
            <span style={{ color: theme.textl }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}
