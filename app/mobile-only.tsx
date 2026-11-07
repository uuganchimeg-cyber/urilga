"use client";

import { useEffect, useState, type ReactNode } from "react";

export function isPhone(userAgent: string, mobileHint?: boolean) {
  if (/iPad|Tablet|Silk|PlayBook/i.test(userAgent)) return false;
  if (mobileHint === true) return true;
  return /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini/i.test(userAgent);
}

export default function MobileOnly({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const browser = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
    setAllowed(isPhone(browser.userAgent, browser.userAgentData?.mobile));
  }, []);
  if (allowed) return <>{children}</>;
  return <main style={{ position: "fixed", inset: 0, minHeight: "100dvh", display: "grid", placeItems: "center", padding: 28, background: "radial-gradient(ellipse at 50% 20%, #63344f66, transparent 65%), #24101f", color: "#ffe8f3", textAlign: "center", fontFamily: "Manrope, Arial, sans-serif" }}>
    <div style={{ width: "100%", maxWidth: 430, padding: "44px 28px", border: "1px solid #edb9d333", borderRadius: 30, background: "linear-gradient(145deg,#ffffff08,#ffffff02)", boxShadow: "0 20px 80px #16091933" }}>
      <div style={{ margin: "0 auto 27px", width: 76, height: 76, display: "grid", placeItems: "center", borderRadius: 24, border: "1px solid #e5a9c644", background: "#e5a9c60c", color: "#eab6d0" }}><svg width="33" height="43" viewBox="0 0 28 40" fill="none" aria-hidden="true"><rect x="3" y="1" width="22" height="38" rx="5" stroke="currentColor" strokeWidth="1.7"/><path d="M10 5h8M11 34h6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><path d="M14 17c-5-6-11 1 0 8 11-7 5-14 0-8Z" fill="currentColor" fillOpacity=".8"/></svg></div>
      <h1 style={{ fontFamily: '"Noto Serif", Georgia, serif', fontSize: 26, fontWeight: 500, lineHeight: 1.5, margin: "0 0 16px", textWrap: "balance" }}>Гар утсаараа нээнэ үү ♡</h1>
      <p style={{ fontSize: 13, lineHeight: 1.9, color: "#c9a5b9", margin: 0 }}>Энэ урилга зөвхөн гар утсанд зориулагдсан.<br />Холбоосоо утасныхаа хөтөч дээр нээгээрэй.</p>
    </div>
  </main>;
}
