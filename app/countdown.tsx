"use client";

import { useEffect, useState } from "react";
import Fireworks from "./fireworks";
import { useSiteSettings } from "./settings-context";

// Улаанбаатарын цагаар 2026 оны 12-р сарын 3-ны 00:00.

const labels = ["сар", "өдөр", "цаг", "минут", "сек"];

function getRemaining(now: number, birthday: number) {
  if (now >= birthday) return [0, 0, 0, 0, 0];
  const current = new Date(now);
  const target = new Date(birthday);
  let months = (target.getUTCFullYear() - current.getUTCFullYear()) * 12 + target.getUTCMonth() - current.getUTCMonth();
  function monthAnchor(count: number) {
    const date = new Date(now);
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + count);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
    return date.getTime();
  }
  if (monthAnchor(months) > birthday) months--;
  let seconds = Math.floor((birthday - monthAnchor(months)) / 1000);
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  return [months, days, hours, Math.floor(seconds / 60), seconds % 60];
}

export default function Countdown() {
  const settings = useSiteSettings();
  const birthday = new Date(settings.birthday).getTime();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  const remaining = now === null ? null : getRemaining(now, birthday);
  const arrived = now !== null && now >= birthday;
  return (
    <>
    <div className="birthday-countdown" style={{
      top: "calc(80px + env(safe-area-inset-top, 0px))",
      padding: "13px 12px",
      background: "rgba(38, 10, 31, 0.6)",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: 16,
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
    }} role={arrived ? "status" : "timer"} aria-label={arrived ? "Төрсөн өдрийн мэнд" : "Төрсөн өдөр хүртэлх хугацаа"}>
      {arrived ? <h1 style={{ gridColumn: "1 / -1", fontFamily: '"Noto Serif", Georgia, serif', fontSize: "clamp(20px, 5.8vw, 27px)", fontStyle: "italic", fontWeight: 500, lineHeight: 1.5, margin: 0, color: "#ffe3f1", textAlign: "center", textWrap: "balance" }}>Happy Bithday to me</h1> : labels.map((label, index) => (
        <span key={label} aria-label={`${remaining ? remaining[index] : "–"} ${label}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <span className="countdown-number">{remaining ? String(remaining[index]).padStart(2, "0") : "––"}</span>
          <span style={{ fontSize: 10, lineHeight: 1.3, color: "#f6dce9" }}>{label}</span>
        </span>
      ))}
    </div>
    {arrived && <Fireworks />}
    </>
  );
}




