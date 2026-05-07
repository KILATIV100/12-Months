import { useState } from "react";
import { theme } from "./theme";
import { Tinder } from "./pages/Tinder";
import { Constructor } from "./pages/Constructor";
import { CalendarPage } from "./pages/Calendar";
import { Catalog } from "./pages/Catalog";
import { Cabinet } from "./pages/Cabinet";
import { Checkout } from "./pages/Checkout";

type Tab = "tinder" | "catalog" | "construct" | "calendar" | "cabinet";
type Cart = { type: "ready" | "custom"; total: number; items: { product_id?: string; quantity: number }[]; name?: string };

function App() {
  const initialTab: Tab = (new URLSearchParams(location.search).get("tab") as Tab) || "tinder";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [cart, setCart] = useState<Cart | null>(null);
  const [done, setDone] = useState<{ qr: string | null } | null>(null);

  if (done) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: `linear-gradient(180deg, ${theme.green}, ${theme.deep})`, color: theme.cream, padding: 30 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: theme.sage, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, marginBottom: 16 }}>✓</div>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 30, fontStyle: "italic", marginBottom: 8 }}>Дякуємо!</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", maxWidth: 280, textAlign: "center" }}>
          Замовлення прийнято. Слідкуйте за статусом у боті.
        </div>
        {done.qr && (
          <div style={{ marginTop: 16, fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            QR-листівку флорист вкладе в букет.
          </div>
        )}
        <button onClick={() => { setDone(null); setCart(null); setTab("cabinet"); }} style={{ marginTop: 24, padding: "10px 22px", background: theme.cream, color: theme.green, border: "none", borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          До профілю
        </button>
      </div>
    );
  }

  if (cart) {
    return <Checkout cart={cart} onComplete={qr => setDone({ qr })} onCancel={() => setCart(null)} />;
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "tinder", label: "Підбір", icon: "♥" },
    { id: "catalog", label: "Каталог", icon: "❀" },
    { id: "construct", label: "Зібрати", icon: "✦" },
    { id: "calendar", label: "Дати", icon: "◷" },
    { id: "cabinet", label: "Я", icon: "◉" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "tinder" && <Tinder onComplete={() => setTab("catalog")} />}
        {tab === "catalog" && <Catalog onSelect={p => setCart({ type: "ready", total: Number(p.base_price), items: [{ product_id: p.id, quantity: 1 }], name: p.name })} />}
        {tab === "construct" && <Constructor onAddToCart={c => setCart({ type: "custom", total: c.total, items: [], name: "Букет з конструктора" })} />}
        {tab === "calendar" && <CalendarPage />}
        {tab === "cabinet" && <Cabinet />}
      </div>

      <nav style={{ flexShrink: 0, padding: "8px 12px 14px", borderTop: `1px solid ${theme.border}`, background: theme.cream, display: "flex" }}>
        {tabs.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "4px 2px", textAlign: "center", cursor: "pointer" }}>
            <div style={{ fontSize: 18, color: tab === t.id ? theme.green : theme.textl, height: 22, display: "flex", justifyContent: "center", alignItems: "center" }}>{t.icon}</div>
            <div style={{ fontSize: 9, fontFamily: '"DM Mono",monospace', color: tab === t.id ? theme.green : theme.textl, fontWeight: tab === t.id ? 600 : 400, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 2 }}>
              {t.label}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}

export default App;
