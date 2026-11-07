"use client";

import { useEffect, useRef, useState } from "react";
import { commentsChanged, readComments, type GuestComment } from "./guest-comments";

export default function GuestWishes() {
  const [comments, setComments] = useState<GuestComment[]>([]);
  const [flow, setFlow] = useState<{ key: number; message: string; startedAt: number }[]>([]);
  const cursor = useRef(0);
  const latest = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    let alive = true;
    const refresh = async () => { try { const next = await readComments(); if (alive) setComments(old => JSON.stringify(old) === JSON.stringify(next) ? old : next); } catch {} };
    void refresh();
    const polling = setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    window.addEventListener("storage", refresh);
    window.addEventListener(commentsChanged, refresh);
    return () => { alive = false; clearInterval(polling); window.removeEventListener("storage", refresh); window.removeEventListener(commentsChanged, refresh); };
  }, []);
  useEffect(() => {
    if (!comments.length) return;
    let timer: ReturnType<typeof setTimeout>;
    function launch() {
      const key = cursor.current++;
      const startedAt = Date.now();
      const message = comments[key % comments.length].message;
      setFlow(items => [...items.filter(item => startedAt - item.startedAt < 12000), { key, message, startedAt }]);
      timer = setTimeout(() => {
        const height = latest.current?.offsetHeight ?? 25;
        timer = setTimeout(launch, Math.max(0, 2300 - 100, (height + 24) * 12000 / window.innerHeight - 100));
      }, 100);
    }
    launch();
    return () => clearTimeout(timer);
  }, [comments]);
  if (!flow.length) return null;
  return <aside className="guest-wishes" aria-label="Зочдын сэтгэгдэл">
    {flow.map((item, index) => <p className="flowing-comment" key={item.key}
      ref={index === flow.length - 1 ? latest : undefined}
      onAnimationEnd={() => setFlow(items => items.filter(entry => entry.key !== item.key))}>
      {item.message}
    </p>)}
    <style jsx>{`
      .guest-wishes{position:fixed;z-index:15;left:max(22px,calc((100vw - 440px)/2));bottom:0;width:min(310px,calc(100% - 100px));height:100dvh;overflow:hidden;pointer-events:none;mask-image:linear-gradient(to top,transparent,#000 4%,#000 96%,transparent);font-family:Manrope,Arial,sans-serif}
      .flowing-comment{position:absolute;top:100%;left:0;width:100%;margin:0;color:#fff1f8;font-size:13px;font-weight:500;line-height:1.9;text-shadow:0 1px 5px #2e1024dd,0 2px 14px #160817bb;overflow-wrap:anywhere;white-space:pre-wrap;animation:comment-rise 12s linear both;will-change:transform,opacity}
      @keyframes comment-rise{0%{transform:translateY(0);opacity:0}4%{opacity:1}96%{opacity:1}100%{transform:translateY(calc(-100% - 100dvh));opacity:0}}
      @media(prefers-reduced-motion:reduce){.guest-wishes{bottom:110px;mask-image:none;height:auto;max-height:180px}.flowing-comment{position:relative;top:auto;animation:none;will-change:auto}.flowing-comment:not(:last-child){display:none}}
    `}</style>
  </aside>;
}



