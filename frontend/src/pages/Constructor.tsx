import { useEffect, useMemo, useRef, useState } from "react";
import { theme } from "../theme";
import { api, type Element } from "../lib/api";

const TABS: { id: "base" | "flower" | "green" | "decor"; label: string }[] = [
  { id: "base", label: "Основа" },
  { id: "flower", label: "Квіти" },
  { id: "green", label: "Зелень" },
  { id: "decor", label: "Декор" },
];

export function Constructor({ onAddToCart, occasion = "просто так" }: { onAddToCart?: (cart: any) => void; occasion?: string }) {
  const [base, setBase] = useState<Element | null>(null);
  const [items, setItems] = useState<{ el: Element; qty: number }[]>([]);
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("base");
  const [hint, setHint] = useState("");
  const [thinking, setThinking] = useState(false);
  const [elements, setElements] = useState<Record<string, Element[]>>({});

  useEffect(() => {
    Promise.all(["base", "flower", "green", "decor"].map(t => api.elements(t).then(els => [t, els] as const)))
      .then(pairs => {
        const map: Record<string, Element[]> = {};
        pairs.forEach(([k, v]) => (map[k] = v));
        setElements(map);
        if (map.base?.length) setBase(map.base[0]);
      })
      .catch(() => {});
  }, []);

  const total = useMemo(
    () => (base?.price_per_unit ?? 0) + items.reduce((s, i) => s + i.el.price_per_unit * i.qty, 0),
    [base, items],
  );

  // TZ §08: AI hint with 1.5s debounce
  const sigRef = useRef("");
  useEffect(() => {
    const sig = items.map(i => `${i.el.id}:${i.qty}`).join(",");
    if (sig === sigRef.current) return;
    sigRef.current = sig;
    if (items.length === 0) {
      setHint("");
      return;
    }
    setThinking(true);
    const timer = setTimeout(async () => {
      try {
        const flowers_list = items.map(i => `${i.qty}× ${i.el.name}`).join(", ");
        const res = await api.hint(flowers_list, total, occasion);
        setHint(res.text || "");
      } catch {
        setHint("");
      } finally {
        setThinking(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [items, total, occasion]);

  function add(el: Element) {
    const ex = items.find(i => i.el.id === el.id);
    if (ex) setItems(items.map(i => (i.el.id === el.id ? { ...i, qty: i.qty + 1 } : i)));
    else setItems([...items, { el, qty: 1 }]);
  }
  function remove(id: string) {
    const ex = items.find(i => i.el.id === id);
    if (!ex) return;
    if (ex.qty <= 1) setItems(items.filter(i => i.el.id !== id));
    else setItems(items.map(i => (i.el.id === id ? { ...i, qty: i.qty - 1 } : i)));
  }

  const list = elements[tab] ?? [];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream, overflow: "hidden" }}>
      <div style={{ padding: "14px 22px 8px" }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Конструктор</div>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>Ваш букет</div>
      </div>

      <div style={{ margin: "4px 22px 10px", height: 200, background: "linear-gradient(160deg, #f5f0e8, #ece5d4)", borderRadius: 16, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {items.length === 0 ? (
          <div style={{ color: theme.textl, fontSize: 12 }}>Почніть з основи →</div>
        ) : (
          <div style={{ fontSize: 60 }}>💐</div>
        )}
        <div style={{ position: "absolute", top: 10, right: 10, background: theme.deep, color: theme.cream, padding: "5px 12px", borderRadius: 100, display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: '"DM Mono",monospace', fontSize: 8, color: theme.sage, textTransform: "uppercase" }}>Поточна вартість</span>
          <span style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 18 }}>{total}</span>
          <span style={{ fontSize: 9, color: theme.textl }}>грн</span>
        </div>
      </div>

      <div style={{ padding: "0 22px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {base && (
          <span style={{ padding: "4px 9px", background: theme.green, color: theme.cream, borderRadius: 6, fontSize: 11 }}>{base.name}</span>
        )}
        {items.map(i => (
          <span key={i.el.id} onClick={() => remove(i.el.id)} style={{ padding: "4px 9px", background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 6, fontSize: 11, color: theme.green, cursor: "pointer" }}>
            {i.qty}× {i.el.name} <span style={{ color: theme.textl, marginLeft: 2 }}>✕</span>
          </span>
        ))}
      </div>

      <div style={{ margin: "0 22px 10px", minHeight: 48, padding: "10px 12px", background: "rgba(45,80,22,0.06)", border: `1px solid ${theme.border}`, borderRadius: 12, display: "flex", gap: 8 }}>
        <div style={{ animation: thinking ? "spin 2s linear infinite" : "none" }}>{thinking ? "◐" : "✦"}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 8, color: theme.light, textTransform: "uppercase" }}>Порада флориста · Claude</div>
          <div style={{ fontSize: 11.5, color: theme.textm, marginTop: 2 }}>
            {thinking ? "...думаю" : hint || "Додайте першу квітку — і я підкажу."}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 22px 10px" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "7px 0", fontSize: 11, fontWeight: tab === t.id ? 600 : 400, color: tab === t.id ? theme.cream : theme.green, background: tab === t.id ? theme.green : "#fff", border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 22px 10px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {list.map(el => {
          const isSelected = tab === "base" ? base?.id === el.id : items.some(i => i.el.id === el.id);
          const qty = items.find(i => i.el.id === el.id)?.qty ?? 0;
          return (
            <div key={el.id} onClick={() => (tab === "base" ? setBase(el) : add(el))} style={{ background: "#fff", border: `1px solid ${isSelected ? theme.sage : theme.border}`, borderRadius: 10, padding: 8, cursor: "pointer", position: "relative" }}>
              <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{el.emoji ?? "🌸"}</div>
              <div style={{ fontSize: 9, color: theme.green, textAlign: "center", lineHeight: 1.2 }}>{el.name}</div>
              <div style={{ fontSize: 9, color: theme.textl, textAlign: "center", fontFamily: '"DM Mono",monospace' }}>{el.price_per_unit} грн</div>
              {qty > 0 && <div style={{ position: "absolute", top: 4, right: 4, background: theme.green, color: "#fff", width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{qty}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ padding: "10px 22px 14px", borderTop: `1px solid ${theme.border}` }}>
        <button
          onClick={() => items.length && onAddToCart?.({ type: "custom", base, items, total })}
          disabled={!items.length}
          style={{ width: "100%", padding: 12, borderRadius: 14, background: items.length ? theme.green : "rgba(45,80,22,0.2)", color: theme.cream, fontSize: 13, fontWeight: 500, border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: items.length ? "pointer" : "default" }}
        >
          <span>У кошик</span>
          <span style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 18 }}>{total} грн</span>
        </button>
      </div>
    </div>
  );
}
