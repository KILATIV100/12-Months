import { useEffect, useState } from "react";
import { theme } from "../theme";
import { api, type Product } from "../lib/api";

export function Catalog({ onSelect, filterTags = [] }: { onSelect?: (p: Product) => void; filterTags?: string[] }) {
  const [items, setItems] = useState<Product[]>([]);
  const [detail, setDetail] = useState<Product | null>(null);

  useEffect(() => {
    api.products().then(setItems).catch(() => setItems([]));
  }, []);

  const matched = filterTags.length
    ? items.filter(p => (p.tags ?? []).some(t => filterTags.includes(t)))
    : items;
  // Even if filter matches nothing show the full catalog so the user is never stuck.
  const shown = matched.length ? matched : items;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream, overflow: "auto" }}>
      <div style={{ padding: "14px 22px 8px" }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Готові букети</div>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>Каталог</div>
        {filterTags.length > 0 && (
          <div style={{ fontSize: 11, color: theme.textl, marginTop: 4 }}>
            Підбірка під ваш смак: {filterTags.slice(0, 3).join(", ")}
          </div>
        )}
      </div>

      <div style={{ padding: "0 22px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {shown.map(c => (
          <div key={c.id} onClick={() => setDetail(c)} style={{ cursor: "pointer" }}>
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

      {detail && (
        <ProductDetail
          product={detail}
          onClose={() => setDetail(null)}
          onOrder={() => {
            onSelect?.(detail);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

function ProductDetail({ product, onClose, onOrder }: { product: Product; onClose: () => void; onOrder: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(14,26,10,0.55)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: theme.cream,
          width: "100%",
          maxWidth: 480,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          maxHeight: "85vh",
          overflow: "auto",
          animation: "slideUp 0.25s ease",
        }}
      >
        <div
          style={{
            width: 38,
            height: 4,
            borderRadius: 2,
            background: theme.border,
            margin: "0 auto 18px",
          }}
        />
        <div
          style={{
            aspectRatio: "1.2",
            background: product.image_url ? `url(${product.image_url}) center/cover` : `linear-gradient(160deg, ${theme.pink}, ${theme.pinkl})`,
            borderRadius: 18,
            marginBottom: 18,
          }}
        />
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase", marginBottom: 4 }}>
          Букет
        </div>
        <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 28, color: theme.green, marginBottom: 8 }}>
          {product.name}
        </div>
        {product.composition && (
          <div style={{ fontSize: 13, color: theme.textm, lineHeight: 1.55, marginBottom: 12 }}>{product.composition}</div>
        )}
        {product.tags && product.tags.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
            {product.tags.map(t => (
              <span key={t} style={{ padding: "4px 10px", borderRadius: 100, background: "#fff", border: `1px solid ${theme.border}`, fontSize: 11, color: theme.textl, fontFamily: '"DM Mono",monospace' }}>
                {t}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: theme.textl }}>Вартість</span>
          <span style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 30, fontWeight: 500, color: theme.green }}>
            {product.base_price} грн
          </span>
        </div>
        <button
          onClick={onOrder}
          style={{ width: "100%", padding: 14, background: theme.green, color: theme.cream, border: "none", borderRadius: 14, fontSize: 14, fontWeight: 500, cursor: "pointer" }}
        >
          Замовити →
        </button>
        <button
          onClick={onClose}
          style={{ width: "100%", padding: 12, background: "transparent", color: theme.textl, border: "none", marginTop: 8, cursor: "pointer", fontSize: 12 }}
        >
          Скасувати
        </button>
      </div>
    </div>
  );
}
