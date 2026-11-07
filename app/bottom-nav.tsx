"use client";

import { useRouter } from "next/navigation";

const items = [
  { id: "memories", label: "Дурсамж", icon: "photos" },
  { id: "invitation", label: "Урилга", icon: "mail" },
  { id: "location", label: "Байршил", icon: "pin" },
];

function Icon({ name }: { name: string }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "photos" ? <><rect x="5" y="3" width="16" height="16" rx="3" /><path d="M16 21H6a3 3 0 0 1-3-3V8m2 7 5-5 4 4 3-3 4 4" /><circle cx="16" cy="8" r="1" /></> : name === "mail" ? <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m3 7 9 6 9-6" /></> : <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>}
  </svg>;
}

export default function BottomNav() {
  const active = "invitation";
  const router = useRouter();
  return <>
    <nav className="bottom-dock" aria-label="Үндсэн цэс">
      {items.map(item => <button type="button" key={item.id} onClick={() => router.push(item.id === "invitation" ? "/invitation" : item.id === "memories" ? "/memories" : "/location")} aria-pressed={active === item.id} className={`dock-button ${item.id === "invitation" ? "dock-primary" : "dock-side"}`}>
        <span className="dock-icon"><Icon name={item.icon} /></span>
        <span className="dock-label">{item.label}</span>
        <span className="dock-indicator" aria-hidden="true" />
      </button>)}
    </nav>
    <style jsx>{`
      .bottom-dock {
        position:fixed;z-index:20;bottom:calc(18px + env(safe-area-inset-bottom, 0px));
        left:50%;transform:translateX(-50%);width:min(390px, calc(100% - 32px));
        display:grid;grid-template-columns:1fr 1.12fr 1fr;align-items:end;gap:10px;padding:9px 12px;
        border:1px solid #ffd2e940;border-radius:28px;
        background:linear-gradient(135deg,#38162de6,#1d0d1ee8);
        box-shadow:0 12px 35px #16061355,inset 0 1px 0 #ffffff12;
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
      }
      .dock-button {
        position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:7px;min-width:0;min-height:58px;padding:8px 3px;
        border:1px solid transparent;border-radius:20px;color:#e9c9dc;font:inherit;cursor:pointer;
        -webkit-tap-highlight-color:transparent;
        transition:transform .18s ease,background .18s ease,color .18s ease,box-shadow .18s ease;
      }
      .dock-side{background:transparent}
      .dock-icon{display:flex;align-items:center;justify-content:center}
      .dock-label{font-size:11px;font-weight:500;letter-spacing:.1px}
      .dock-side[aria-pressed="true"]{color:#fff4fa;background:#ffffff0e;border-color:#ffffff12}
      .dock-indicator{position:absolute;bottom:3px;width:4px;height:4px;border-radius:50%;background:#f4b9d6;opacity:0}
      .dock-side[aria-pressed="true"] .dock-indicator{opacity:1}
      .dock-primary{
        min-height:82px;margin-top:-25px;margin-bottom:1px;border:1px solid #ffdaecaa;border-radius:25px;color:white;
        background:linear-gradient(145deg,#e5a0c0 0%,#bd6a98 48%,#93446f 100%);
        box-shadow:0 6px 20px #15061366,0 0 20px #d582ad30,inset 0 1px 0 #ffe7f488;
      }
      .dock-primary .dock-icon{width:36px;height:32px;border-radius:12px;background:#ffffff18}
      .dock-primary .dock-label{font-size:13px;font-weight:600;letter-spacing:.3px}
      .dock-primary[aria-pressed="false"]{background:linear-gradient(145deg,#c98bab,#91456e)}
      .dock-button:focus-visible{outline:2px solid #ffe0f0;outline-offset:4px}
      .dock-button:active{transform:scale(.95)}
      @media(hover:hover){
        .dock-side:hover{background:#ffffff12;color:white;transform:translateY(-2px)}
        .dock-primary:hover{transform:translateY(-3px);box-shadow:0 9px 25px #15061366,0 0 25px #d582ad55,inset 0 1px 0 #ffe7f488}
      }
      @media(prefers-reduced-motion:reduce){.dock-button{transition:none}}
    `}</style>
  </>;
}



