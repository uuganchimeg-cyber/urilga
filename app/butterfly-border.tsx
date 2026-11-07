import type { CSSProperties } from "react";
import "./butterfly-border.css";

const ornaments = [
  { top: 2, left: 2, rotate: -27, size: 36 },
  { top: 2, right: 2, rotate: 27, size: 36 },
  { bottom: 2, left: 2, rotate: -150, size: 34 },
  { bottom: 2, right: 2, rotate: 150, size: 34 },
  { top: "26%", left: -3, rotate: -22, size: 21 },
  { top: "26%", right: -3, rotate: 22, size: 21 },
  { top: "59%", left: -3, rotate: 20, size: 23 },
  { top: "59%", right: -3, rotate: -20, size: 23 },
  { top: "79%", left: -2, rotate: -18, size: 18 },
  { top: "79%", right: -2, rotate: 18, size: 18 },
];

export default function ButterflyBorder() {
  return <div className="butterfly-border" aria-hidden="true">
    <div className="butterfly-outline" />
    {ornaments.map(({ rotate, size, ...position }, index) => <svg key={index} className="border-butterfly" viewBox="0 0 64 60" fill="none" style={{ ...position, width: size, height: size, transform: `rotate(${rotate}deg)` } as CSSProperties}>
      <defs><linearGradient id={`butterfly-wing-${index}`} x1="9" y1="4" x2="52" y2="53" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF0F8"/><stop offset=".45" stopColor="#E9ACD3"/><stop offset="1" stopColor="#A86CAA"/></linearGradient></defs>
      <path d="M31 29C25 12 9 2 5 8c-5 8 1 23 11 27C5 33 8 48 15 51c7 3 14-7 17-15 3 8 10 18 17 15 7-3 10-18-1-16 10-4 16-19 11-27-4-6-20 4-26 21" fill={`url(#butterfly-wing-${index})`} fillOpacity=".84" stroke="#FFE7F5" strokeOpacity=".7" strokeWidth=".8"/>
      <path d="M30 29c-7-9-14-14-19-15m19 18c-8-4-14-5-20-5m20 8c-6 3-10 7-12 12m16-18c7-9 14-14 19-15M34 32c8-4 14-5 20-5m-20 8c6 3 10 7 12 12" stroke="#FFF1FA" strokeOpacity=".48" strokeWidth=".8"/>
      <path d="M31 28c-2-7-5-9-8-10m10 10c2-7 5-9 8-10" stroke="#F6D7EC" strokeWidth="1.2" strokeLinecap="round"/>
      <ellipse cx="32" cy="34" rx="1.8" ry="10" fill="#FFE3F4"/><circle cx="32" cy="24" r="2" fill="#FFE3F4"/>
    </svg>)}
    <span className="border-spark spark-left">✧</span><span className="border-spark spark-right">✧</span>
  </div>;
}
