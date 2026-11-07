"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const size = 48;
function clamp(x: number, y: number) {
  return { x: Math.max(12, Math.min(innerWidth - size - 12, x)), y: Math.max(12, Math.min(innerHeight - size - 12, y)) };
}

export default function GuestPhotoButton({ hidden = false, onActivate, disabled = false, uploadLabel = "Зураг оруулах" }: { hidden?: boolean; onActivate?: () => void; disabled?: boolean; uploadLabel?: string }) {
  const router = useRouter();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    const resize = () => setPosition(old => old ? clamp(old.x, old.y) : null);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  if (hidden) return null;
  const label = onActivate ? uploadLabel : "Зочдын цомог";
  return <button type="button" aria-label={label} aria-disabled={disabled} title={`${label} · Чирж зөөнө`}
    style={{ position: "fixed", zIndex: 110, ...(position ? { left: position.x, top: position.y } : { right: 16, bottom: "calc(172px + env(safe-area-inset-bottom, 0px))" }), width: size, height: size, borderRadius: "50%", border: "1px solid #f7cce1a1", background: "linear-gradient(145deg,#b96d99,#532d50)", color: "#ffe8f4", boxShadow: "0 5px 18px #170a2155", display: "grid", placeItems: "center", touchAction: "none", userSelect: "none", cursor: "grab" }}
    onClick={event => { if (disabled || (moved.current && event.detail !== 0)) return; if (onActivate) onActivate(); else router.push("/guest-photos"); }}
    onPointerDown={event => {
      if (drag.current || event.button !== 0) return;
      const rect = event.currentTarget.getBoundingClientRect();
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      moved.current = false;
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
      const start = drag.current;
      if (!start || start.id !== event.pointerId) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > 5) start.moved = true;
      if (start.moved) { moved.current = true; setPosition(clamp(start.left + dx, start.top + dy)); }
    }}
    onPointerUp={event => { if (drag.current?.id === event.pointerId) drag.current = null; }}
    onPointerCancel={event => { if (drag.current?.id === event.pointerId) drag.current = null; }}
    onLostPointerCapture={event => { if (drag.current?.id === event.pointerId) drag.current = null; }}
    onKeyDown={event => {
      const offsets: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
      const offset = offsets[event.key];
      if (!offset) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setPosition(clamp(rect.left + offset[0], rect.top + offset[1]));
    }}>
    {onActivate ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5h16v-5"/></svg> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m3 17 5-5 4 4 4-5 5 6"/></svg>}
  </button>;
}


