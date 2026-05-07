import { useEffect, useState } from "react";
import { theme } from "../theme";
import { api, type DateItem } from "../lib/api";
import { tgId } from "../lib/twa";

export function CalendarPage({ lang = "ua" as const }: { lang?: "ua" | "en" }) {
  const [items, setItems] = useState<DateItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ label: string; person_name: string; date: string; repeat_yearly: boolean; reminder_days: number[] }>({
    label: "",
    person_name: "",
    date: "",
    repeat_yearly: true,
    reminder_days: [3, 1],
  });

  function load() {
    const id = tgId();
    if (!id) return;
    api.listDates(id).then(setItems).catch(() => setItems([]));
  }

  useEffect(load, []);

  function daysLeft(d: string, repeatYearly: boolean): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    if (repeatYearly) {
      target.setFullYear(today.getFullYear());
      if (target < today) target.setFullYear(today.getFullYear() + 1);
    }
    return Math.round((target.getTime() - today.getTime()) / 86400000);
  }

  function deltaLabel(n: number): string {
    if (n === 0) return lang === "ua" ? "сьогодні" : "today";
    if (n === 1) return lang === "ua" ? "завтра" : "tomorrow";
    return lang === "ua" ? `через ${n} дн.` : `in ${n}d`;
  }

  function reminderHint(daysLeft: number, days: number[]) {
    if (!days.includes(daysLeft) && daysLeft !== 0) return null;
    if (daysLeft === 0) return lang === "ua" ? "🎉 Сьогодні!" : "🎉 Today!";
    if (daysLeft === 1) return lang === "ua" ? "⚡ Завтра!" : "⚡ Tomorrow!";
    return lang === "ua" ? `🔔 За ${daysLeft} дні` : `🔔 In ${daysLeft}d`;
  }

  async function save() {
    if (!draft.label || !draft.date) return;
    await api.addDate(tgId(), {
      label: draft.label,
      person_name: draft.person_name || null,
      date: draft.date,
      repeat_yearly: draft.repeat_yearly,
      reminder_days: draft.reminder_days,
    });
    setAdding(false);
    setDraft({ label: "", person_name: "", date: "", repeat_yearly: true, reminder_days: [3, 1] });
    load();
  }

  async function remove(id: string) {
    await api.deleteDate(id);
    load();
  }

  function toggleDay(day: number) {
    const has = draft.reminder_days.includes(day);
    setDraft({ ...draft, reminder_days: has ? draft.reminder_days.filter(d => d !== day) : [...draft.reminder_days, day].sort((a, b) => b - a) });
  }

  const sorted = [...items]
    .map(d => ({ ...d, _delta: daysLeft(d.date, d.repeat_yearly) }))
    .sort((a, b) => a._delta - b._delta);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", background: theme.cream, overflow: "auto" }}>
      <div style={{ padding: "14px 22px 8px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, letterSpacing: "0.16em", textTransform: "uppercase" }}>Календар</div>
          <div style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 24, color: theme.green }}>{lang === "ua" ? "Мої дати" : "My dates"}</div>
        </div>
        <button onClick={() => setAdding(true)} style={{ padding: "6px 12px", borderRadius: 100, background: theme.green, color: theme.cream, border: "none", fontSize: 11, cursor: "pointer" }}>
          {lang === "ua" ? "+ Додати" : "+ Add"}
        </button>
      </div>

      {adding && (
        <div style={{ margin: "0 22px 12px", padding: 14, background: "#fff", borderRadius: 14, border: `1px solid ${theme.border}` }}>
          <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.sage, textTransform: "uppercase", marginBottom: 10 }}>Нова дата</div>
          <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} placeholder="Подія (ДН, річниця…)" style={inputStyle} />
          <input value={draft.person_name} onChange={e => setDraft({ ...draft, person_name: e.target.value })} placeholder="Кого вітаємо" style={inputStyle} />
          <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} style={inputStyle} />

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: theme.green }}>
            <input type="checkbox" checked={draft.repeat_yearly} onChange={e => setDraft({ ...draft, repeat_yearly: e.target.checked })} />
            Повторювати щороку
          </label>

          <div style={{ fontSize: 10, color: theme.textl, marginBottom: 6, fontFamily: '"DM Mono",monospace', textTransform: "uppercase" }}>Нагадати за:</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[7, 3, 1, 0].map(day => (
              <button key={day} type="button" onClick={() => toggleDay(day)} style={{ flex: 1, padding: 8, fontSize: 11, background: draft.reminder_days.includes(day) ? theme.sage : "#faf8f2", color: draft.reminder_days.includes(day) ? "#fff" : theme.green, border: `1px solid ${theme.border}`, borderRadius: 8, cursor: "pointer" }}>
                {day === 0 ? "у день" : `${day} дн`}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setAdding(false)} style={{ flex: 1, padding: 9, fontSize: 11, border: `1px solid ${theme.border}`, borderRadius: 8, background: "transparent", color: theme.textm, cursor: "pointer" }}>
              Скасувати
            </button>
            <button onClick={save} style={{ flex: 2, padding: 9, fontSize: 11, fontWeight: 500, background: theme.green, color: theme.cream, border: "none", borderRadius: 8, cursor: "pointer" }}>
              Додати
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: "0 22px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 9, color: theme.textl, textTransform: "uppercase", letterSpacing: "0.14em" }}>{lang === "ua" ? "Найближчі" : "Upcoming"}</div>
        {sorted.length === 0 && <div style={{ fontSize: 12, color: theme.textl, padding: 20, textAlign: "center" }}>Ще немає дат. Додайте першу.</div>}
        {sorted.map(d => {
          const hint = reminderHint(d._delta, d.reminder_days);
          return (
            <div key={d.id} style={{ padding: "12px 14px", background: "#fff", border: `1px solid ${theme.border}`, borderRadius: 14, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: theme.pinkl, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.green }}>
                  {d.label} {d.person_name && <span style={{ color: theme.textl, fontWeight: 400 }}>· {d.person_name}</span>}
                </div>
                <div style={{ fontSize: 11, color: theme.textl, marginTop: 1 }}>
                  {deltaLabel(d._delta)} · нагадаємо за {d.reminder_days.join(", ")} дн
                </div>
                {hint && <div style={{ fontSize: 11, color: theme.green, marginTop: 4, fontWeight: 500 }}>{hint}</div>}
              </div>
              <button onClick={() => remove(d.id)} style={{ background: "transparent", border: "none", color: theme.textl, fontSize: 16, cursor: "pointer" }}>
                🗑
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: `1px solid ${theme.border}`,
  borderRadius: 8,
  fontSize: 12,
  marginBottom: 6,
  fontFamily: "inherit",
  background: theme.cream,
  boxSizing: "border-box",
};
