import { useState } from "react";
import { theme } from "../theme";
import { api } from "../lib/api";
import { tgId, haptic } from "../lib/twa";

type Cart = {
  type: "ready" | "custom";
  total: number;
  items: { product_id?: string; quantity: number }[];
  name?: string;
  customDescription?: string;
};

export function Checkout({ cart, onComplete, onCancel }: { cart: Cart; onComplete: (qrToken: string | null) => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const [delivery, setDelivery] = useState<"pickup" | "delivery">("delivery");
  const [addr, setAddr] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [greeting, setGreeting] = useState<"video" | "text" | null>(null);
  const [paying, setPaying] = useState(false);
  const [slot, setSlot] = useState("14:00");

  const fee = delivery === "delivery" ? 80 : 0;
  const grand = cart.total + fee;
  const steps = ["Склад", "Доставка", "Отримувач", "Оплата"];

  async function next() {
    if (step < 3) return setStep(step + 1);
    setPaying(true);
    try {
      const today = new Date();
      const [hh, mm] = slot.split(":").map(Number);
      today.setHours(hh, mm, 0, 0);
      const order = await api.createOrder({
        tg_id: tgId(),
        type: cart.type,
        items: cart.items.filter(i => i.product_id).map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        custom_total: cart.type === "custom" ? cart.total : null,
        custom_description: cart.type === "custom" ? cart.customDescription : null,
        delivery_type: delivery,
        delivery_at: today.toISOString(),
        address: delivery === "delivery" ? addr : null,
        recipient_name: name,
        recipient_phone: phone,
        comment,
        add_greeting: greeting !== null,
      });
      haptic("success");
      onComplete(order.qr_token ?? null);
    } catch {
      haptic("error");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream, overflow: "hidden" }}>
      <div style={{ padding: "14px 22px 8px", display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => (step === 0 ? onCancel() : setStep(step - 1))} style={{ background: "transparent", border: "none", fontSize: 20, color: theme.green, cursor: "pointer" }}>
          ‹
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Крок {step + 1} з 4</div>
          <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22, color: theme.green }}>{steps[step]}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "4px 22px 14px" }}>
        {steps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? theme.green : "rgba(45,80,22,0.1)" }} />
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "0 22px 14px" }}>
        {step === 0 && (
          <div style={{ padding: 14, background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 14 }}>
            <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 18, color: theme.green }}>{cart.name ?? "Букет"}</div>
            <div style={{ fontSize: 11, color: theme.textl, marginTop: 6 }}>Кількість позицій: {cart.items.length}</div>
            <div style={{ fontSize: 13, fontWeight: 500, color: theme.green, marginTop: 6 }}>{cart.total} грн</div>
          </div>
        )}

        {step === 1 && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { id: "pickup", label: "Самовивіз", sub: "0 грн" },
                { id: "delivery", label: "Кур'єр", sub: "80 грн · 60 хв" },
              ].map(o => (
                <button key={o.id} onClick={() => setDelivery(o.id as any)} style={{ flex: 1, padding: 14, background: delivery === o.id ? "rgba(138,171,110,0.1)" : "#fff", border: `1.5px solid ${delivery === o.id ? theme.sage : theme.border}`, borderRadius: 14, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.green }}>{o.label}</div>
                  <div style={{ fontSize: 10, color: theme.textl, fontFamily: '"DM Mono",monospace' }}>{o.sub}</div>
                </button>
              ))}
            </div>
            {delivery === "delivery" && (
              <div>
                <Label>Адреса</Label>
                <input value={addr} onChange={e => setAddr(e.target.value)} placeholder="вул., буд., квартира" style={inputStyle} />
                <Label>Час</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {["10:00", "12:00", "14:00", "16:00", "18:00", "20:00"].map(t => (
                    <button key={t} onClick={() => setSlot(t)} style={{ padding: 8, fontSize: 12, fontFamily: '"DM Mono",monospace', background: slot === t ? theme.green : "#fff", color: slot === t ? theme.cream : theme.green, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <Label>Ім'я</Label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Олена" style={inputStyle} />
            <Label>Телефон</Label>
            <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+380 67 ___ __ __" style={inputStyle} />
            <Label>Коментар (опц.)</Label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="напр., домофон 234, поверх 5" style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
            <div style={{ padding: 14, background: "linear-gradient(135deg, rgba(221,168,173,0.15), rgba(245,221,224,0.3))", border: "1px solid rgba(221,168,173,0.4)", borderRadius: 14 }}>
              <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: "#7a3040", textTransform: "uppercase" }}>💌 QR-листівка</div>
              <div style={{ fontSize: 12.5, color: theme.green, marginTop: 4, marginBottom: 8, fontWeight: 500 }}>Додати листівку?</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { id: "video", l: "📹 Відео" },
                  { id: "text", l: "✏️ Текст" },
                ].map(o => (
                  <button key={o.id} onClick={() => setGreeting(greeting === o.id ? null : (o.id as any))} style={{ flex: 1, padding: 9, fontSize: 11, fontWeight: 500, background: greeting === o.id ? theme.green : "#fff", color: greeting === o.id ? theme.cream : theme.green, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>
                    {o.l}
                  </button>
                ))}
                <button onClick={() => setGreeting(null)} style={{ flex: 1, padding: 9, fontSize: 11, color: theme.textl, background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>
                  Пропустити
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ padding: 14, background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 14, marginBottom: 12 }}>
              <Row label="Букет" value={`${cart.total} грн`} />
              <Row label="Доставка" value={`${fee} грн`} />
              <div style={{ height: 1, background: theme.border, margin: "8px 0" }} />
              <Row label="Разом" value={<span style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 22 }}>{grand} грн</span>} bold />
            </div>
            <Label>Спосіб оплати</Label>
            <div style={{ padding: "12px 14px", background: "rgba(138,171,110,0.08)", border: `1.5px solid ${theme.sage}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 22, borderRadius: 4, background: theme.green, color: "#fff", fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" }}>L</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.green }}>LiqPay</div>
                <div style={{ fontSize: 10, color: theme.textl, fontFamily: '"DM Mono",monospace' }}>Visa · Apple Pay · Mastercard</div>
              </div>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: theme.sage, color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: "10px 22px 14px", borderTop: `1px solid ${theme.border}` }}>
        <button onClick={next} style={{ width: "100%", padding: 13, background: theme.green, color: theme.cream, border: "none", borderRadius: 14, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
          {paying ? "Обробка…" : step === 3 ? `Сплатити ${grand} грн` : "Далі"}
        </button>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.textl, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 6, marginTop: 12 }}>{children}</div>;
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: bold ? theme.green : theme.textm, fontWeight: bold ? 600 : 400, padding: "3px 0" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: "inherit",
  background: "#fff",
  marginBottom: 6,
  boxSizing: "border-box",
};
