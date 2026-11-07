"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { saveResponse } from "../guest-comments";
import { useSiteSettings } from "../settings-context";
import { useLayoutEffect, useRef, useState } from "react";

export default function InvitationPage() {
  const router = useRouter();
  const settings = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [continued, setContinued] = useState(false);
  const [secretCode, setSecretCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const canRespond = name.trim().length > 0;
  const [position, setPosition] = useState({ x: -1, y: 0 });
  const page = useRef<HTMLElement>(null);
  const secret = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const fit = () => {
      if (!stage.current || !card.current) return;
      const available = stage.current.clientHeight;
      const content = card.current.offsetHeight;
      setScale(Math.min(1, available / Math.max(content, 1)));
    };
    const observer = new ResizeObserver(fit);
    if (stage.current) observer.observe(stage.current);
    if (card.current) observer.observe(card.current);
    fit();
    return () => observer.disconnect();
  }, []);
  const arena = useRef<HTMLDivElement>(null);
  const decline = useRef<HTMLButtonElement>(null);
  const moves = useRef(0);
  const responseId = useRef<string | null>(null);

  function dodge() {
    if (!canRespond || !arena.current || !decline.current) return;
    const width = Math.max(0, arena.current.clientWidth - decline.current.offsetWidth);
    const height = Math.max(0, arena.current.clientHeight - decline.current.offsetHeight);
    moves.current++;
    // Alternate sides so every attempt moves the button a clear distance.
    setPosition({ x: moves.current % 2 ? width : 0, y: moves.current % 3 === 0 ? 0 : height });
  }

  return <main className="letter-page" ref={page}>
    <button type="button" className="back-link" onClick={() => {
      if (accepted) router.replace("/");
      else if (continued) setContinued(false);
      else router.back();
    }}>← Буцах</button>
    {accepted && <div className="celebration" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => <span key={index} className={`floating-gift ${index % 3 === 0 ? "flying-butterfly" : "flying-heart"}`} style={{ left: `${5 + (index * 17) % 90}%`, animationDelay: `${-(index * .63)}s`, animationDuration: `${6 + (index % 5)}s`, fontSize: `${12 + (index % 4) * 4}px` }}>
        {index % 3 === 0 ? <svg width="27" height="25" viewBox="0 0 64 60" fill="none"><path d="M31 29C25 12 9 2 5 8c-5 8 1 23 11 27C5 33 8 48 15 51c7 3 14-7 17-15 3 8 10 18 17 15 7-3 10-18-1-16 10-4 16-19 11-27-4-6-20 4-26 21" fill="currentColor" fillOpacity=".8"/><path d="M31 28c-2-7-5-9-8-10m10 10c2-7 5-9 8-10M32 26v17" stroke="#ffe5f3" strokeWidth="1.4" strokeLinecap="round"/></svg> : index % 2 ? "♡" : "♥"}
      </span>)}
    </div>}
    <div className="fit-stage" ref={stage}>
    <article className={`letter ${accepted ? "accepted-letter" : ""}`} ref={card} style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
      {!continued && <>      <button type="button" className="ribbon" aria-label="Нууц зурвасыг нээх" aria-haspopup="dialog" onClick={() => { setSecretCode(""); setUnlocked(false); setCodeError(false); secret.current?.showModal(); }}>🎀</button>
      <p className="eyebrow">{settings.invitation.eyebrow}</p>
      <span className="ornament" aria-hidden="true">✧ ── ♡ ── ✧</span>
      <h1>{settings.invitation.title}</h1>
      <p className="letter-body">{settings.invitation.body}</p>
      <p className="closing">{settings.invitation.closing}</p>

      <button type="button" className="accept continue-button" onClick={() => { setContinued(true); page.current?.scrollTo({ top: 0 }); }}>Үргэлжлүүлэх <span aria-hidden="true">→</span></button>
      </>}
      {continued && accepted && <div role="status" aria-label="Урилга хүлээн авлаа" style={{ position: "relative", zIndex: 1 }}>
        <Image src={settings.accepted.image} alt="Урилга хүлээн авлаа" width={500} height={500} unoptimized style={{ display: "block", width: "100%", height: "auto", borderRadius: 18 }} />
        <p className="accepted-message">{settings.accepted.message}<span className="accepted-emojis" role="img" aria-label="Хайртай царай, зүрх, эрвээхэй">{settings.accepted.emojis}</span></p>
      </div>}
      {continued && !accepted && <section className="reply-area" aria-labelledby="reply-heading">
        <div className="reply-heading">
          <span className="reply-heart" aria-hidden="true">♡</span>
          <div><h2 id="reply-heading">Хариугаа үлдээгээрэй</h2><p>Хамтдаа дурсамж бүтээхэд нэг алхам ойрхон.</p></div>
        </div>
        <div className="response-fields">
          <div className="field-group">
            <label htmlFor="guest-name">Таны нэр <span className="required">Заавал</span></label>
            <div className="name-input">
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>
              <input id="guest-name" name="name" type="text" autoComplete="name" required maxLength={100} placeholder="Нэрээ бичээрэй" value={name} onChange={event => setName(event.target.value)} aria-describedby="name-hint" />
            </div>
            <p id="name-hint" className={`field-hint ${canRespond ? "ready" : ""}`}>{canRespond ? "✓ Та урилгад хариулахад бэлэн боллоо." : "Нэрээ бичээд урилгад хариулаарай."}</p>
          </div>
          <div className="field-group">
            <label htmlFor="guest-comment">Сэтгэгдэл <span className="optional">Заавал биш</span></label>
            <textarea id="guest-comment" name="comment" rows={3} maxLength={1000} placeholder="Надад хэлэх үгээ үлдээгээрэй… ♡" value={comment} onChange={event => setComment(event.target.value)} />
          </div>
        </div>        <button type="button" className="accept" disabled={!canRespond || submitting} onClick={async () => {
          if (!canRespond || submitting) return;
          setSubmitting(true); setSubmitError("");
          try {
            responseId.current ??= globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            await saveResponse(responseId.current, name, comment);
            responseId.current = null;
            setAccepted(true); page.current?.scrollTo({ top: 0 });
          } catch (error) { setSubmitError(error instanceof Error ? error.message : "Хариу илгээж чадсангүй."); }
          finally { setSubmitting(false); }
        }}>{submitting ? "Илгээж байна…" : "Урилга хүлээн авлаа"}</button>
        {submitError && <p role="alert" style={{ color: "#f4b2c8", fontSize: 11, lineHeight: 1.7 }}>{submitError}</p>}

        <div className="dodge-arena" ref={arena}>
          <button ref={decline} type="button" className="decline" disabled={!canRespond || submitting} style={{ left: position.x < 0 ? "50%" : position.x, top: position.y, transform: position.x < 0 ? "translateX(-50%)" : "none" }} onPointerEnter={dodge} onPointerDown={event => { event.preventDefault(); dodge(); }} onFocus={dodge} onClick={event => { event.preventDefault(); dodge(); }}>Очиж амжихгүй нь ээ</button>
        </div>
      </section>}
    </article>
    </div>
    <dialog ref={secret} className="secret-dialog" aria-labelledby="secret-title" onClick={event => { if (event.target === event.currentTarget) secret.current?.close(); }}>
      <div className="secret-card">
        <button type="button" className="secret-close" aria-label="Нууц зурвасыг хаах" onClick={() => secret.current?.close()}>×</button>
        {!unlocked ? <form onSubmit={event => { event.preventDefault(); if (secretCode === "1203") { setUnlocked(true); setCodeError(false); } else setCodeError(true); }}>
          <div className="secret-emoji" aria-hidden="true">🔐</div>
          <h2 id="secret-title">Анд минь чи мэдэндээ</h2>
          <label htmlFor="secret-code" className="code-label">4 оронтой нууц кодоо оруулаарай</label>
          <input id="secret-code" className="code-input" type="password" inputMode="numeric" autoComplete="off" maxLength={4} pattern="[0-9]{4}" required value={secretCode} onChange={event => { setSecretCode(event.target.value.replace(/\D/g, "").slice(0,4)); setCodeError(false); }} aria-invalid={codeError} aria-describedby="code-error" placeholder="••••" />
          <p id="code-error" className="code-error" role="status">{codeError ? "Код буруу байна. Дахиад бодоод үзээрэй ♡" : ""}</p>
          <button type="submit" className="accept" disabled={secretCode.length !== 4}>Нууцыг нээх ♡</button>
        </form> : <>
        <div className="secret-emoji" aria-hidden="true">🤫</div>
        <h2 id="secret-title">🤫 Нэг нууц хэлэх үү?</h2>
        <p className="secret-wish">💌 Чамд зориулсан бяцхан хүсэл...</p>
        <div className="secret-divider" aria-hidden="true">✧ ── ♡ ── ✧</div>
        <p className="secret-message">♡ Үнэндээ би чамайг ирээсэй гэж хүсэж байна ♡</p>
        </>}
      </div>
    </dialog>
    <style jsx>{`
      .code-label{display:block;font-size:11px;line-height:1.7;color:#d5adc3;margin:0 0 17px}.code-input{display:block;width:100%;height:60px;padding:10px 14px 10px 24px;border:1px solid #e7b2cd66;border-radius:14px;background:#21102066;color:#ffe5f4;font-family:Arial,sans-serif;font-size:27px;letter-spacing:15px;text-align:center;outline:none}.code-input:focus{border-color:#f4c7df;box-shadow:0 0 0 3px #edb0d118}.code-input[aria-invalid="true"]{border-color:#f4a0b7}.code-error{font-size:10px;line-height:1.6;min-height:18px;margin:10px 0 16px;color:#f3b1c8}
      .secret-dialog{position:fixed;inset:0;margin:auto;width:min(350px,calc(100vw - 40px));max-height:calc(100dvh - 40px);padding:0;border:1px solid #f3bfd955;border-radius:27px;background:linear-gradient(145deg,#533046,#2b1629);color:#ffe6f3;box-shadow:0 25px 100px #13061188;overflow:auto;animation:secret-open .3s ease}
      .secret-dialog::backdrop{background:#180b1bcc;backdrop-filter:blur(7px)}.secret-card{position:relative;text-align:center;padding:33px 23px 30px}.secret-close{position:absolute;right:10px;top:9px;width:32px;height:32px;background:#ffffff08;border:1px solid #e9b1d026;border-radius:50%;color:#ecc8dc;font-size:23px;line-height:1}.secret-emoji{font-family:"Apple Color Emoji","Segoe UI Emoji",sans-serif;font-size:40px;margin-bottom:20px}.secret-card h2{font-family:"Noto Serif",Georgia,serif;font-size:20px;font-weight:500;line-height:1.5;margin:0 0 18px}.secret-wish{font-family:Manrope,Arial,sans-serif;font-size:12px;color:#d5adc3;line-height:1.8;margin:0}.secret-divider{font-size:13px;letter-spacing:3px;color:#b77d9d;margin:23px 0}.secret-message{font-family:"Noto Serif",Georgia,serif;font-size:18px;font-style:italic;line-height:1.9;text-wrap:balance;color:#f7bfdc;margin:0}.ribbon{display:block;margin-left:auto;margin-right:auto;padding:0 7px;background:transparent;border:0;line-height:1.4;transition:transform .2s;cursor:pointer}.ribbon:hover{transform:rotate(-7deg) scale(1.08)}.ribbon:active{transform:scale(.94)}@keyframes secret-open{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}@media(prefers-reduced-motion:reduce){.secret-dialog{animation:none}.ribbon{transition:none}}
      .accepted-emojis{display:block;margin-top:13px;font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif;font-size:30px;font-style:normal;font-weight:400;line-height:1.5;letter-spacing:5px;color:initial;font-variant-emoji:emoji}
      .accepted-message{font-family:"Noto Serif",Georgia,serif;font-size:16px;font-style:italic;line-height:1.9;color:#f5c6dc;margin:22px 8px 6px;text-wrap:balance}
      .celebration{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:2}
      .floating-gift{position:absolute;bottom:-40px;color:#efacca;opacity:0;animation:float-up 8s linear infinite;filter:drop-shadow(0 2px 7px #efb0d333)}
      .flying-butterfly{color:#dfb1e9}.flying-butterfly svg{animation:wing-drift 1.8s ease-in-out infinite alternate;transform-origin:center}
      .accepted-letter{padding:18px;border-color:#f4c3dc44;box-shadow:0 0 55px #d993bd16,0 20px 70px #13091444}
      @keyframes float-up{0%{transform:translate3d(-12px,0,0) rotate(-12deg);opacity:0}12%{opacity:.65}45%{transform:translate3d(20px,-45dvh,0) rotate(12deg)}85%{opacity:.5}100%{transform:translate3d(-15px,-110dvh,0) rotate(-10deg);opacity:0}}
      @keyframes wing-drift{from{transform:scaleX(.65) rotate(-8deg)}to{transform:scaleX(1) rotate(8deg)}}
      @media(prefers-reduced-motion:reduce){.floating-gift{animation:none;opacity:.4;bottom:auto;top:16%}.floating-gift:nth-child(even){top:76%}.flying-butterfly svg{animation:none}}
      .letter-page{position:fixed;inset:0;overflow:hidden;display:flex;flex-direction:column;height:100dvh;padding:max(12px,env(safe-area-inset-top)) 18px max(12px,env(safe-area-inset-bottom));background:radial-gradient(ellipse at 10% 0%,#74375466,transparent 55%),radial-gradient(ellipse at 100% 100%,#873d6266,transparent 60%),#24101f;color:#fff2f8}
      .back-link{display:block;background:transparent;border:0;text-align:left;cursor:pointer;max-width:420px;margin:0 auto 10px;flex-shrink:0;color:#e9bcd2;text-decoration:none;font-size:13px;width:100%;padding:8px 0}
      .fit-stage{position:relative;flex:1;min-height:0;width:100%;max-width:420px;margin:0 auto;overflow:hidden}
      .letter{position:absolute;left:50%;top:50%;width:100%;max-width:420px;margin:0;transform-origin:center;padding:24px 24px 16px;border:1px solid #eebbd43d;border-radius:28px;text-align:center;background:linear-gradient(150deg,#ffffff0c,#ffffff03);box-shadow:0 20px 70px #13091444}
      .ribbon{font-size:38px;margin-bottom:17px}.eyebrow{font-size:9px;letter-spacing:2.4px;color:#dc9fbc;margin:0 0 20px}.ornament{color:#c88ca9;font-size:16px;letter-spacing:3px}
      h1{font-family:"Noto Serif",Georgia,serif;font-size:27px;line-height:1.45;letter-spacing:-.7px;font-weight:500;margin:22px 0;color:#ffe8f2;text-wrap:balance;text-shadow:0 2px 18px #e8a3c220}
      .letter-body{white-space:pre-line;font-family:"Manrope",Arial,sans-serif;font-size:14px;line-height:1.95;font-weight:400;letter-spacing:.1px;color:#e5c8d7;margin:0;text-wrap:pretty}.closing{font-family:"Noto Serif",Georgia,serif;font-size:15px;line-height:1.8;font-style:italic;font-weight:500;margin:23px 0;color:#f3bfd8;text-wrap:balance}
      .continue-button{margin:6px 0 10px;display:flex;align-items:center;justify-content:center;gap:12px}.continue-button span{font-size:19px}
      .reply-area{text-align:left;margin:0 -8px;padding:22px 17px 12px;border:1px solid #e1aac329;border-radius:22px;background:linear-gradient(150deg,#ffffff08,#12091722);box-shadow:inset 0 1px 0 #ffffff07}
      .reply-heading{display:flex;gap:11px;align-items:center;margin-bottom:24px}
      .reply-heart{display:grid;place-items:center;width:36px;height:36px;flex-shrink:0;border:1px solid #dfa8c336;border-radius:12px;background:#d78eaf12;color:#e5a8c5;font-size:25px}
      .reply-heading h2{font-size:15px;font-weight:600;letter-spacing:-.2px;margin:0 0 5px;color:#ffe6f1}
      .reply-heading p{font-size:10px;line-height:1.6;color:#be9aad;margin:0}
      .response-fields{display:grid;gap:20px;margin-bottom:24px}.field-group{display:grid;gap:9px}
      .field-group label{display:flex;align-items:center;justify-content:space-between;font-size:12px;color:#f4d8e7;font-weight:500}
      .required,.optional{font-size:9px;font-weight:400;border-radius:6px;padding:3px 7px;line-height:1.3}
      .required{color:#e9b0ca;background:#e59cbd12}.optional{color:#b798ab;background:#ffffff06}
      .name-input{position:relative}.name-input svg{position:absolute;top:17px;left:14px;color:#c297ae;pointer-events:none}
      .response-fields input,.response-fields textarea{display:block;width:100%;padding:14px;border:1px solid #d7a8c12e;border-radius:12px;background:#1d101c55;color:#fff0f8;font:inherit;font-size:16px;outline:none;transition:border-color .15s,background .15s,box-shadow .15s}
      .response-fields input{height:52px;padding-left:42px}.response-fields textarea{resize:none;height:94px;min-height:94px;max-height:94px;line-height:1.6}
      .response-fields input::placeholder,.response-fields textarea::placeholder{color:#a7839a;font-size:12px}
      .response-fields input:focus,.response-fields textarea:focus{border-color:#e6a0c4;background:#301b2b;box-shadow:0 0 0 3px #d587ae12}
      .field-hint{font-size:9px;line-height:1.7;color:#a8869c;margin:0}.field-hint.ready{color:#e2afc9}      button:disabled{opacity:.38;cursor:not-allowed;box-shadow:none}
      .accept:disabled:active{transform:none}
      button{font:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}button:focus-visible{outline:2px solid #ffdaed;outline-offset:4px}
      .accept{width:100%;min-height:54px;padding:14px 12px;border:1px solid #ffd6eb88;border-radius:16px;color:white;font-size:14px;font-weight:600;background:linear-gradient(135deg,#d587ae,#9f4979);box-shadow:0 6px 20px #0f071c33,inset 0 1px 0 #ffffff33;transition:transform .15s}
      .accept:active{transform:scale(.98)}.confirmation{font-size:12px;line-height:1.8;color:#f1c6dc}.confirmation strong{display:block;margin-top:19px;font-size:16px}.confirmation span{display:block;margin:6px 0 15px}
      .dodge-arena{position:relative;width:100%;height:80px;margin-top:12px}.decline{position:absolute;max-width:100%;white-space:nowrap;padding:11px 15px;min-height:44px;border:1px solid #d2a1bd25;border-radius:12px;background:#ffffff04;color:#cba5bb;font-size:11px;touch-action:none}
      @media(min-width:600px){.letter{padding:28px 30px 18px}}
      @media(max-height:700px){.ribbon{font-size:30px;margin-bottom:10px}.eyebrow{margin-bottom:12px}h1{font-size:23px;line-height:1.4;margin:14px 0}.letter-body{line-height:1.8}.closing{margin:17px 0;font-size:14px}.reply-area{padding-top:18px}.reply-heading{margin-bottom:18px}.response-fields{gap:15px;margin-bottom:18px}}
    `}</style>
  </main>;
}
