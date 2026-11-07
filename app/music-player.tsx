"use client";

import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "./settings-context";

const size = 48;
const margin = 12;

export default function MusicPlayer() {
  const { music } = useSiteSettings();
  return music ? <AudioPlayer src={music} /> : null;
}

function AudioPlayer({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const userPaused = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  function clamp(x: number, y: number) {
    return { x: Math.max(margin, Math.min(window.innerWidth - size - margin, x)), y: Math.max(margin, Math.min(window.innerHeight - size - margin, y)) };
  }
  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    const play = () => { if (!userPaused.current) void player.play().then(() => setBlocked(false)).catch(() => setBlocked(true)); };
    play();
    const firstGesture = (event: Event) => {
      if (button.current?.contains(event.target as Node) || userPaused.current || !player.paused) return;
      play();
    };
    const resize = () => setPosition(old => old ? clamp(old.x, old.y) : null);
    window.addEventListener("pointerdown", firstGesture);
    window.addEventListener("keydown", firstGesture);
    window.addEventListener("resize", resize);
    return () => { window.removeEventListener("pointerdown", firstGesture); window.removeEventListener("keydown", firstGesture); window.removeEventListener("resize", resize); };
  }, [src]);
  function toggle() {
    if (suppressClick.current) { suppressClick.current = false; return; }
    const player = audio.current;
    if (!player) return;
    if (!player.paused) { userPaused.current = true; player.pause(); }
    else { userPaused.current = false; setError(false); void player.play().then(() => setBlocked(false)).catch(() => setBlocked(true)); }
  }
  const label = error ? "Дуу ачаалж чадсангүй. Дахин оролдох" : playing ? "Дууг зогсоох" : "Дууг тоглуулах";
  return <>
    <audio ref={audio} src={src} autoPlay loop preload="auto" onPlay={() => { setPlaying(true); setBlocked(false); setError(false); }} onPause={() => setPlaying(false)} onError={() => { setError(true); setPlaying(false); }} />
    <button ref={button} type="button" className={`music-button ${playing ? "is-playing" : ""}`} aria-label={label} aria-pressed={playing} title={`${label} · Чирж зөөнө`} style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
      onClick={toggle}
      onPointerDown={event => {
        if (event.button !== 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        drag.current = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
        suppressClick.current = false;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.hypot(dx, dy) > 5) start.moved = true;
        if (start.moved) setPosition(clamp(start.left + dx, start.top + dy));
      }}
      onPointerUp={event => {
        suppressClick.current = drag.current?.moved ?? false;
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; suppressClick.current = true; }}
      onKeyDown={event => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-16, 0], ArrowRight: [16, 0], ArrowUp: [0, -16], ArrowDown: [0, 16] };
        if (!directions[event.key]) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        const [dx,dy] = directions[event.key];
        setPosition(clamp(rect.left + dx, rect.top + dy));
      }}>
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><ellipse cx="6" cy="18" rx="3" ry="2.5" fill="currentColor"/><ellipse cx="17" cy="16" rx="3" ry="2.5" fill="currentColor"/></svg>
      <span className="music-status" aria-hidden="true">{playing ? <span className="equalizer"><i/><i/><i/></span> : <svg width="8" height="8" viewBox="0 0 10 10"><path d="m3 1 6 4-6 4Z" fill="currentColor"/></svg>}</span>
      {blocked && !playing && <span className="music-hint">Дууг асаах ♪</span>}
    </button>
    <style jsx>{`
      .music-button{position:fixed;z-index:110;right:16px;bottom:calc(112px + env(safe-area-inset-bottom,0px));width:48px;height:48px;border:1px solid #f7cce1a1;border-radius:50%;background:linear-gradient(145deg,#b96d99e8,#532d50ef);color:#ffe8f4;box-shadow:0 5px 18px #170a2144,inset 0 1px 0 #ffffff33;backdrop-filter:blur(12px);display:grid;place-items:center;cursor:grab;touch-action:none;user-select:none;-webkit-tap-highlight-color:transparent}
      .music-button:active{cursor:grabbing}.music-button:focus-visible{outline:2px solid #ffe1ef;outline-offset:4px}.music-status{position:absolute;right:-2px;bottom:-1px;width:18px;height:18px;border-radius:50%;background:#3f243e;border:1px solid #e7afcf88;display:grid;place-items:center;color:#f7cbdf}.equalizer{height:8px;display:flex;gap:2px;align-items:center}.equalizer i{width:2px;height:7px;background:#f3c3dc;border-radius:2px;animation:music-wave .8s ease-in-out infinite alternate}.equalizer i:nth-child(2){animation-delay:-.3s}.equalizer i:nth-child(3){animation-delay:-.5s}.music-hint{position:absolute;right:55px;top:12px;white-space:nowrap;font-family:Arial,sans-serif;font-size:10px;border:1px solid #dba0be44;background:#36192fe8;color:#f6d6e7;padding:6px 9px;border-radius:9px;pointer-events:none}@keyframes music-wave{from{transform:scaleY(.35)}to{transform:scaleY(1)}}@media(prefers-reduced-motion:reduce){.equalizer i{animation:none}}
    `}</style>
  </>;
}


