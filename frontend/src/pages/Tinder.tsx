import { useEffect, useState } from "react";
import { theme } from "../theme";
import { api, type Product } from "../lib/api";
import { tgId, haptic } from "../lib/twa";

const AI_AFTER = 10; // TZ §08: invoke Claude after 10+ swipes

export function Tinder({ onComplete, lang = "ua" as const }: { onComplete?: (tasteTags: string[]) => void; lang?: "ua" | "en" }) {
  const [cards, setCards] = useState<Product[]>([]);
  const [idx, setIdx] = useState(0);
  const [liked, setLiked] = useState<Product[]>([]);
  const [disliked, setDisliked] = useState<Product[]>([]);
  const [drag, setDrag] = useState({ x: 0, active: false, startX: 0, startY: 0 });
  const [exitX, setExitX] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.products()
      .then(p => setCards(p.slice(0, 15)))
      .finally(() => setLoading(false));
  }, []);

  const total = cards.length;

  async function maybeFinish(nextLiked: Product[], nextDisliked: Product[]) {
    const swipes = nextLiked.length + nextDisliked.length;
    if (swipes < AI_AFTER && idx + 1 < total) return false;
    // Reached AI threshold or end of deck — call AI taste analysis.
    try {
      const res = await api.swipes(
        tgId(),
        nextLiked.map(p => p.id),
        nextDisliked.map(p => p.id),
        nextLiked.map(p => `${p.name}: ${p.composition ?? ""}`),
        nextDisliked.map(p => `${p.name}: ${p.composition ?? ""}`),
      );
      setSummary(res.ai_summary || (lang === "ua" ? "Ваш профіль смаку зібрано." : "Your taste profile is ready."));
    } catch {
      setSummary(lang === "ua" ? "Ваш профіль смаку зібрано." : "Your taste profile is ready.");
    }
    return true;
  }

  function swipe(dir: number) {
    const card = cards[idx];
    if (!card) return;
    const nextLiked = dir > 0 ? [...liked, card] : liked;
    const nextDisliked = dir < 0 ? [...disliked, card] : disliked;
    setLiked(nextLiked);
    setDisliked(nextDisliked);
    setExitX(dir * 500);
    haptic(dir > 0 ? "success" : "warning");
    setTimeout(async () => {
      setExitX(0);
      setDrag({ x: 0, active: false, startX: 0, startY: 0 });
      const finished = await maybeFinish(nextLiked, nextDisliked);
      if (!finished) setIdx(idx + 1);
    }, 280);
  }

  const onDown = (e: React.PointerEvent) => setDrag({ x: 0, active: true, startX: e.clientX, startY: e.clientY });
  const onMove = (e: React.PointerEvent) => drag.active && setDrag({ ...drag, x: e.clientX - drag.startX });
  const onUp = () => {
    if (Math.abs(drag.x) > 80) swipe(drag.x > 0 ? 1 : -1);
    else setDrag({ x: 0, active: false, startX: 0, startY: 0 });
  };

  if (loading) return <Center>Завантаження…</Center>;

  if (summary) {
    return (
      <div style={{ flex: 1, padding: "24px 22px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", background: theme.cream }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.sage, marginBottom: 14 }}>✦ Claude AI</div>
        <h2 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 30, fontWeight: 300, color: theme.green, marginBottom: 12 }}>
          <em style={{ fontStyle: "italic", color: theme.sage }}>{lang === "ua" ? "Ви маєте смак" : "You have taste"}</em>
        </h2>
        <div style={{ fontSize: 13, color: "#666", maxWidth: 280, marginBottom: 24, lineHeight: 1.55 }}>{summary}</div>
        <button
          onClick={() => {
            const tags = Array.from(new Set(liked.flatMap(p => p.tags ?? [])));
            onComplete?.(tags);
          }}
          style={{ padding: "13px 22px", background: theme.green, color: theme.cream, border: "none", borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: "pointer" }}
        >
          {lang === "ua" ? "Показати добірку" : "Show picks"} →
        </button>
        <div style={{ marginTop: 14, fontSize: 11, color: theme.textl }}>
          ♥ {liked.length} · ✕ {disliked.length}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream }}>
      <div style={{ padding: "14px 22px 6px", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Підбір смаку</div>
          <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>{lang === "ua" ? "Що подобається?" : "Tap what you love"}</div>
        </div>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 11, padding: "5px 11px", borderRadius: 100, border: `1px solid ${theme.border}`, color: theme.green, background: "#fff" }}>
          {idx + 1}/{total}
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, padding: "6px 22px 12px" }}>
        {cards.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < idx ? theme.sage : i === idx ? theme.green : "rgba(45,80,22,0.1)" }} />
        ))}
      </div>

      <div
        style={{ flex: 1, position: "relative", padding: "0 22px", touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {[2, 1, 0].map(off => {
          const cardIdx = idx + off;
          if (cardIdx >= total) return null;
          const c = cards[cardIdx];
          const isTop = off === 0;
          const tx = isTop ? drag.x + exitX : 0;
          const rot = isTop ? (drag.x + exitX) * 0.06 : 0;
          const scale = 1 - off * 0.04;
          const ty = off * 8;
          return (
            <div
              key={c.id}
              style={{
                position: "absolute",
                inset: "0 22px",
                transform: `translateX(${tx}px) translateY(${ty}px) rotate(${rot}deg) scale(${scale})`,
                transition: drag.active && isTop ? "none" : "transform 0.28s ease",
                zIndex: 10 - off,
                cursor: isTop ? "grab" : "default",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: c.image_url ? `url(${c.image_url}) center/cover` : `linear-gradient(160deg, ${theme.pink} 0%, ${theme.pinkl} 50%, ${theme.sage} 100%)`,
                  borderRadius: 22,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  padding: 24,
                  boxShadow: "0 18px 40px rgba(14,26,10,0.18)",
                }}
              >
                <div style={{ background: "rgba(255,255,255,0.85)", padding: "12px 14px", borderRadius: 14 }}>
                  <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>{c.name}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: theme.textl }}>{c.composition ?? ""}</span>
                    <span style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 18, color: theme.green }}>{c.base_price} грн</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "14px 0 18px" }}>
        <button onClick={() => swipe(-1)} aria-label="nope" style={{ width: 54, height: 54, borderRadius: 27, background: "#fff", border: `1.5px solid ${theme.border}`, color: "#c14b50", fontSize: 20, cursor: "pointer" }}>
          ✕
        </button>
        <button onClick={() => swipe(1)} aria-label="love" style={{ width: 54, height: 54, borderRadius: 27, background: theme.pink, border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>
          ♥
        </button>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.textl, fontSize: 13 }}>
      {children}
    </div>
  );
}
