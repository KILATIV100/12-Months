/** TZ §04 Flow 2: receiver scans QR → opens TWA at /greeting/<token>. */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { theme } from "../theme";
import { api } from "../lib/api";

export function Greeting() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<{ type: string; text: string | null; media_url: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.greeting(token)
      .then(setData)
      .catch(() => setError("Листівка не знайдена або вже неактивна."));
  }, [token]);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(180deg, ${theme.green}, ${theme.deep})`, color: theme.cream, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontFamily: '"DM Mono",monospace', fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: theme.sage, marginBottom: 14 }}>12 Months · Особиста листівка</div>

      {error ? (
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", maxWidth: 280 }}>{error}</div>
      ) : !data ? (
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>Завантаження…</div>
      ) : (
        <>
          {data.type === "video" && data.media_url ? (
            <video src={data.media_url} controls autoPlay style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 16, marginBottom: 18 }} />
          ) : (
            <h1 style={{ fontFamily: '"Cormorant Garamond",serif', fontSize: 38, fontWeight: 300, fontStyle: "italic", lineHeight: 1.15, maxWidth: 320, marginBottom: 18 }}>
              {data.text || "Зі святом!"}
            </h1>
          )}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", maxWidth: 280, lineHeight: 1.5 }}>
            Цю листівку залишили вам разом із букетом. Можна переглядати скільки завгодно разів.
          </div>
        </>
      )}
    </div>
  );
}
