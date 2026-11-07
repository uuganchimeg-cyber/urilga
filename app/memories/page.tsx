"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSiteSettings } from "../settings-context";

export default function MemoriesPage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const memories = settings.gallery.photos;
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const touchX = useRef<number | null>(null);
  const running = playing && selected === null;
  useEffect(() => { setActive(0); setSelected(null); dialog.current?.close(); }, [memories]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPlaying(!preference.matches);
    const update = () => setPlaying(!preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      if (!document.hidden) setActive(index => (index + 1) % memories.length);
    }, settings.gallery.intervalMs);
    return () => clearInterval(interval);
  }, [running, settings.gallery.intervalMs, memories.length]);
  useEffect(() => {
    if (selected !== null && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [selected]);
  function open(index: number, button: HTMLButtonElement) { trigger.current = button; setSelected(index); }
  function close() { dialog.current?.close(); setSelected(null); trigger.current?.focus(); }
  function change(direction: number) { setSelected(index => index === null ? null : (index + direction + memories.length) % memories.length); }
  const current = selected === null ? null : memories[selected];
  return <main className="album">
    <div className="ambient" aria-hidden="true"><Image src={memories[active].src} alt="" fill sizes="100vw" unoptimized /></div>
    <div className="shell">
      <header><button className="back" onClick={() => router.back()}>← <span>Буцах</span></button><span className="collection">THE MEMORY COLLECTION</span><span className="tiny-star" aria-hidden="true">✧</span></header>
      <div className="heading"><p className="eyebrow"><span /> БИДНИЙ ҮЛДЭЭСЭН МӨЧҮҮД</p><h1>Дурсамжийн<br /><em>бяцхан ертөнц</em><span aria-hidden="true">♡</span></h1><p className="subtitle">Цаг хугацаа өнгөрөвч, дурсамж үлдэнэ.</p></div>
      <section className="gallery" aria-label="Автоматаар солигдох зургийн цомог" aria-roledescription="carousel">
        <div className="frame">
          {memories.map((photo, index) => <button key={photo.src} className={`slide ${active === index ? "visible" : ""}`} tabIndex={active === index ? 0 : -1} aria-hidden={active !== index} aria-label={`${index + 1}-р зургийг томоор харах`} onClick={event => open(index, event.currentTarget)}>
            <Image src={photo.src} alt={photo.alt} fill sizes="(max-width: 600px) 90vw, 430px" unoptimized className="hero-photo" loading={index === 0 ? "eager" : "lazy"} />
          </button>)}
          <div className="frame-shade" aria-hidden="true" />

          <div className="frame-caption"><span className="script">A little moment, a forever memory.</span><div className="caption-row"><span>Дурсамж бүр үнэ цэнтэй</span><span>♡</span></div></div>
        </div>
        <div className="gallery-controls"><div className="counter"><strong>{String(active + 1).padStart(2, "0")}</strong><span> / {String(memories.length).padStart(2, "0")}</span></div><div className="progress" aria-hidden="true">{memories.map((photo,index)=><span key={photo.src} className={active === index ? "current" : ""}/>)}</div><button className="play" aria-label={playing ? "Автомат хөдөлгөөнийг зогсоох" : "Автомат хөдөлгөөнийг эхлүүлэх"} aria-pressed={playing} onClick={() => setPlaying(!playing)}>{playing ? <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 2v8m6-8v8" stroke="currentColor" strokeWidth="2"/></svg> : <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="m3 1 8 5-8 5Z" fill="currentColor"/></svg>}</button></div>
      </section>
      <div className="film-section"><div className="film-heading"><span>БҮХ ДУРСАМЖУУД</span><span>{memories.length} зураг</span></div><div className="film-window"><div className="film-track" style={{animationPlayState:running ? "running" : "paused",animationDuration:`${memories.length * 5}s`}}>
        {[0,1].map(copy=><div className="film-group" key={copy} aria-hidden={copy === 1}>{memories.map((photo,index)=><button className={`film-photo ${active === index ? "chosen" : ""}`} key={photo.src} tabIndex={copy === 1 ? -1 : 0} aria-label={`${index+1}-р дурсамжийг үзэх`} onClick={event=>{setActive(index);open(index,event.currentTarget);}}><Image src={photo.src} alt={copy === 1 ? "" : photo.alt} fill sizes="90px" unoptimized className="thumbnail"/><span>{String(index+1).padStart(2,"0")}</span></button>)}</div>)}
      </div></div></div>
      <footer><span className="footer-line"/>Хамтдаа бүтээсэн дурсамжууд<span className="footer-line"/></footer>
    </div>
    <dialog ref={dialog} aria-label="Зургийг томоор харах" onCancel={event=>{event.preventDefault();close();}} onKeyDown={event=>{if(event.key === "ArrowLeft")change(-1);if(event.key === "ArrowRight")change(1);}}>
      <div className="viewer-header"><span>{selected === null ? 0 : selected+1} / {memories.length}</span><button autoFocus aria-label="Зургийг хаах" onClick={close}>×</button></div>
      <div className="full-photo" onTouchStart={event=>{touchX.current=event.changedTouches[0].clientX;}} onTouchEnd={event=>{if(touchX.current !== null){const distance=event.changedTouches[0].clientX-touchX.current;if(Math.abs(distance)>45)change(distance>0?-1:1);}touchX.current=null;}}>{current && <Image src={current.src} alt={current.alt} fill sizes="100vw" unoptimized className="large-image"/>}</div>
      <div className="viewer-controls"><button aria-label="Өмнөх зураг" onClick={()=>change(-1)}>←</button><span>Дурсамж бүр үнэ цэнтэй ♡</span><button aria-label="Дараагийн зураг" onClick={()=>change(1)}>→</button></div>
    </dialog>
    <style jsx>{`
      .album{position:fixed;inset:0;height:100dvh;overflow:hidden;background:#20111d;color:#fae9f1;font-family:Manrope,Arial,sans-serif}.ambient{position:absolute;inset:-60px;opacity:.16;filter:blur(65px);transform:scale(1.2);pointer-events:none}.ambient :global(img){object-fit:cover}.shell{position:relative;display:flex;flex-direction:column;gap:16px;height:100%;width:100%;max-width:470px;margin:auto;padding:max(16px,env(safe-area-inset-top)) 25px max(14px,env(safe-area-inset-bottom))}
      header{display:flex;align-items:center;justify-content:space-between;flex-shrink:0;height:28px}.back{display:flex;align-items:center;gap:7px;background:none;border:0;color:#e6c4d4;padding:6px 0;font-size:17px}.back span{font-size:10px}.collection{font-size:7px;letter-spacing:1.8px;color:#ae8e9f}.tiny-star{font-size:24px;color:#e5b0c9}.heading{position:relative;flex-shrink:0;padding-top:6px}.eyebrow{display:flex;align-items:center;gap:8px;font-size:7px;letter-spacing:2px;color:#d3a6bc;margin:0 0 12px}.eyebrow>span{width:17px;height:1px;background:#bf829f}h1{font-family:"Noto Serif",Georgia,serif;font-size:32px;font-weight:400;line-height:1.28;letter-spacing:-1px;margin:0}h1 em{color:#edb8cf;font-weight:400}h1>span{position:absolute;right:8px;top:40px;color:#d99db9;font-family:Georgia,serif;font-size:43px;transform:rotate(13deg)}.subtitle{color:#b59aa9;font-size:9px;margin:12px 0 0;letter-spacing:.2px}
      .gallery{display:flex;flex-direction:column;flex:1;min-height:0;gap:13px}.frame{position:relative;flex:1;min-height:0;border-radius:100px 100px 18px 18px;overflow:hidden;border:1px solid #f5d1df55;background:#512b40;box-shadow:0 14px 36px #0c060d44}.slide{position:absolute;inset:0;border:0;padding:0;background:transparent;opacity:0;pointer-events:none;transition:opacity .45s ease;overflow:hidden}.slide.visible{opacity:1;pointer-events:auto}.slide :global(.hero-photo){object-fit:cover;transform:scale(1.025);transition:transform 5s linear}.slide.visible :global(.hero-photo){transform:scale(1.09)}.frame-shade{position:absolute;inset:0;background:linear-gradient(#1e101e22,transparent 40%,#160b16cc);pointer-events:none}.frame-top{position:absolute;top:28px;left:25px;right:25px;display:flex;justify-content:space-between;align-items:center;pointer-events:none}.moment{font-size:7px;letter-spacing:2px;color:#fff5fa;text-shadow:0 1px 6px #000}.expand{background:#ffffff15;border:1px solid #ffffff44;backdrop-filter:blur(8px);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:18px}.frame-caption{position:absolute;bottom:20px;left:22px;right:22px;pointer-events:none}.script{display:block;font-family:"Noto Serif",Georgia,serif;font-style:italic;font-size:12px;color:#ffe6ef}.caption-row{display:flex;justify-content:space-between;align-items:center;margin-top:9px;font-size:8px;letter-spacing:.8px;color:#ecd0de}.caption-row>span:last-child{font-size:22px}.gallery-controls{display:flex;align-items:center;gap:17px;flex-shrink:0;height:28px}.counter{white-space:nowrap;font-size:10px}.counter strong{font-size:17px;font-weight:500}.counter>span{color:#a98498;font-size:9px;margin-left:3px}.progress{display:flex;gap:4px;align-items:center;flex:1;min-width:0;overflow:hidden}.progress>span{height:2px;flex:1;background:#ffffff18;min-width:2px;border-radius:3px;transition:background .5s}.progress>.current{background:#edb2cf;box-shadow:0 0 8px #efacc055}.play{display:grid;place-items:center;width:29px;height:29px;border:1px solid #edbfda3d;border-radius:50%;background:#ffffff05;color:#e4bdd1}
      .film-section{flex-shrink:0;min-width:0}.film-heading{display:flex;justify-content:space-between;align-items:center;font-size:7px;letter-spacing:1.5px;color:#c396ae;margin-bottom:10px}.film-heading>span:last-child{letter-spacing:.2px;color:#947487}.film-window{overflow:hidden;margin:0 -25px;mask-image:linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)}.film-track{display:flex;width:max-content;animation:flow linear infinite;will-change:transform}.film-group{display:flex;gap:9px;padding-right:9px}.film-photo{position:relative;flex-shrink:0;width:76px;height:81px;border:1px solid #e7b5ce33;border-radius:10px;overflow:hidden;padding:0;background:#432438;transform:rotate(-3deg)}.film-photo:nth-child(even){transform:rotate(3deg)}.film-photo.chosen{border-color:#efbad5;box-shadow:0 0 12px #e5a5c333}.film-photo :global(.thumbnail){object-fit:cover}.film-photo>span{position:absolute;bottom:4px;left:6px;font-size:7px;color:white;text-shadow:0 1px 4px black}.film-group{padding-top:5px;padding-bottom:5px}footer{display:flex;gap:12px;align-items:center;justify-content:center;color:#8e6d82;font-size:7px;letter-spacing:1px;flex-shrink:0}.footer-line{height:1px;width:30px;background:#c196b02b}
      button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}button:focus-visible{outline:2px solid #f3c7dc;outline-offset:3px}button:active{filter:brightness(1.1)}
      dialog{position:fixed;inset:0;border:0;padding:16px;margin:auto;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;background:#1a0c18f5;color:#fce5f1;overflow:hidden}dialog::backdrop{background:#130710d9}.viewer-header{height:44px;display:flex;align-items:center;justify-content:space-between;font-size:12px;padding:0 3px}.viewer-header button{width:40px;height:40px;border:1px solid #e5b8ce33;border-radius:50%;background:#ffffff08;color:white;font-size:27px}.full-photo{position:relative;height:calc(100% - 112px);width:100%;touch-action:pan-y}.full-photo :global(.large-image){object-fit:contain}.viewer-controls{height:68px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 5px}.viewer-controls span{font-size:10px;color:#c99bb5}.viewer-controls button{width:38px;height:34px;border:1px solid #deb0c739;border-radius:12px;background:#ffffff08;color:#f9d8e9;font-size:20px}
      @keyframes flow{to{transform:translateX(-50%)}}
      @media(max-height:700px){.shell{gap:10px;padding-top:10px;padding-bottom:10px}.heading{padding-top:0}h1{font-size:27px}.eyebrow{margin-bottom:7px}.subtitle{margin-top:7px}.film-photo{width:63px;height:61px}.film-heading{margin-bottom:5px}.gallery{gap:8px}.frame-top{top:16px}.frame-caption{bottom:12px}.heading h1>span{top:25px;font-size:35px}.script{font-size:10px}}
      @media(prefers-reduced-motion:reduce){.slide,.slide :global(.hero-photo),.progress>span{transition:none}.film-track{animation:none}.slide :global(.hero-photo){transform:none}}
    `}</style>
  </main>;
}



