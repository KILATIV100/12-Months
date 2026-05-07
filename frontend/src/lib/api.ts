const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export type Product = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image_url: string | null;
  composition: string | null;
  tags: string[];
  is_available: boolean;
};

export type Element = {
  id: string;
  name: string;
  type: "flower" | "base" | "decor" | "green";
  price_per_unit: number;
  image_url: string | null;
  color_tags: string[];
  emoji: string | null;
  is_available: boolean;
};

export type DateItem = {
  id: string;
  label: string;
  person_name: string | null;
  date: string;
  repeat_yearly: boolean;
  reminder_days: number[];
  is_active: boolean;
};

export const api = {
  products: (category?: string) =>
    request<Product[]>(`/api/products${category ? `?category=${encodeURIComponent(category)}` : ""}`),
  elements: (type?: string) =>
    request<Element[]>(`/api/elements${type ? `?type=${type}` : ""}`),
  hint: (flowers_list: string, budget: number, occasion: string) =>
    request<{ text: string }>(`/api/ai/hint`, {
      method: "POST",
      body: JSON.stringify({ flowers_list, budget, occasion }),
    }),
  taste: (liked: string[], disliked: string[]) =>
    request<{ text: string }>(`/api/ai/taste`, {
      method: "POST",
      body: JSON.stringify({ liked, disliked }),
    }),
  picks: (event_label: string, order_history: any[], catalog: any[]) =>
    request<{ items: { id: string; reason: string }[] }>(`/api/ai/picks`, {
      method: "POST",
      body: JSON.stringify({ event_label, order_history, catalog }),
    }),
  swipes: (tg_id: number, liked_ids: string[], disliked_ids: string[], liked_descriptions: string[], disliked_descriptions: string[]) =>
    request<{ id: string; ai_summary: string | null; result_tags: string[] }>(`/api/swipes`, {
      method: "POST",
      body: JSON.stringify({ tg_id, liked_ids, disliked_ids, liked_descriptions, disliked_descriptions }),
    }),
  listDates: (tg_id: number) => request<DateItem[]>(`/api/dates?tg_id=${tg_id}`),
  addDate: (tg_id: number, payload: Omit<DateItem, "id" | "is_active">) =>
    request<DateItem>(`/api/dates`, {
      method: "POST",
      body: JSON.stringify({ tg_id, ...payload }),
    }),
  deleteDate: (id: string) => request<{ ok: boolean }>(`/api/dates/${id}`, { method: "DELETE" }),
  createOrder: (payload: any) => request<any>(`/api/orders`, { method: "POST", body: JSON.stringify(payload) }),
  greeting: (token: string) => request<{ order_id: string; type: string; text: string | null; media_url: string | null }>(`/api/greetings/${token}`),
};
