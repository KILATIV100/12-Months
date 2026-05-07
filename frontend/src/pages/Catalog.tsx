import { useEffect, useState } from "react";
import { theme } from "../theme";
import { api, type Product } from "../lib/api";

export function Catalog({ onSelect }: { onSelect?: (p: Product) => void }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    api.products().then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream, overflow: "auto" }}>
      <div style={{ padding: "14px 22px 8px" }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Готові букети</div>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>Каталог</div>
      </div>
      <div style={{ padding: "0 22px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map(c => (
          <div key={c.id} onClick={() => onSelect?.(c)} style={{ cursor: "pointer" }}>
            <div style={{ aspectRatio: "1", background: c.image_url ? `url(${c.image_url}) center/cover` : `linear-gradient(160deg, ${theme.pink}, ${theme.pinkl})`, borderRadius: 14 }} />
            <div style={{ padding: "6px 2px 0" }}>
              <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 16, fontWeight: 500, color: theme.green }}>{c.name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
                <span style={{ fontSize: 10, color: theme.textl, fontFamily: '"DM Mono",monospace' }}>{c.tags?.[0] ?? ""}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: theme.green }}>{c.base_price} грн</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
