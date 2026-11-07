"use client";

import Image from "next/image";
import Link from "next/link";
import GuestPhotoButton from "../guest-photo-button";
import { useEffect, useRef, useState } from "react";

type Photo = { id: string; url: string; createdAt: string };

function thumbnail(url: string) {
  return url.startsWith("https://res.cloudinary.com/")
    ? url.replace("/image/upload/", "/image/upload/c_limit,w_450,q_auto,f_auto/")
    : url;
}

async function preparePhoto(file: File): Promise<Blob> {
  const source = URL.createObjectURL(file);
  try {
    const image = new window.Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Зураг бэлдэж чадсангүй.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob || blob.size > 4_000_000) throw new Error("Зургийн хэмжээ хэт том байна.");
    return blob;
  } finally {
    URL.revokeObjectURL(source);
  }
}

export default function GuestPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Photo | null>(null);
  const viewer = useRef<HTMLDialogElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/guest-photos", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error();
        setPhotos(await response.json());
      } catch {
        if (!controller.signal.aborted) setError("Цомгийг ачаалж чадсангүй. Хуудсаа шинэчлээд үзээрэй.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  async function upload(files: File[]) {
    if (!files.length || progress) return;
    if (files.length > 20) { setError("Нэг удаад 20 хүртэл зураг сонгоно уу."); return; }
    setError("");
    setNotice("");
    setProgress({ done: 0, total: files.length });
    const failed: string[] = [];
    let saved = 0;
    try {
      for (const [index, file] of files.entries()) {
        try {
          const blob = await preparePhoto(file);
          const form = new FormData();
          form.set("file", blob, "photo.jpg");
          const response = await fetch("/api/guest-photos", { method: "POST", body: form });
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.id || !result?.url) throw new Error(result?.error || "Байршуулж чадсангүй.");
          setPhotos(current => current.some(photo => photo.id === result.id) ? current : [result, ...current]);
          saved++;
        } catch (reason) {
          failed.push(`${file.name} (${reason instanceof Error ? reason.message : "байршуулж чадсангүй"})`);
        } finally {
          setProgress({ done: index + 1, total: files.length });
        }
      }
      if (saved) setNotice(`${saved} зураг цомогт хадгалагдлаа ♡`);
      if (failed.length) setError(`Оруулж чадсангүй (${failed.length}). ${failed.join(" · ")}`);
    } finally {
      setProgress(null);
    }
  }

  return <main className="guest-album">
    <header className="album-header"><Link href="/">← Буцах</Link><span>{photos.length} зураг</span></header>
    <section className="intro">
      <p className="eyebrow">БИДНИЙ ХАМТЫН ЦОМОГ</p>
      <h1>Зочдын <em>зургууд</em></h1>
      <p>Өөрийн авсан зургаа хуваалцаарай. Нэмсэн зургууд энэ цомогт бусад зочдод харагдана.</p>
      <input ref={picker} type="file" accept="image/*" multiple hidden disabled={loading || !!progress}
        onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void upload(files); }} />
      <GuestPhotoButton disabled={loading || !!progress} onActivate={() => picker.current?.click()} />
      {progress && <p role="status">Байршуулж байна… {progress.done}/{progress.total}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    {loading ? <p className="empty">Зургуудаа ачаалж байна…</p> : photos.length ? (
      <div className="photos">
        {photos.map((photo, index) => <button key={photo.id} className="photo" type="button" aria-label={`${index + 1}-р зургийг томоор үзэх`} onClick={() => { setSelected(photo); viewer.current?.showModal(); }}>
          <Image src={thumbnail(photo.url)} alt="" fill sizes="(max-width: 500px) 48vw, 220px" unoptimized />
        </button>)}
      </div>
    ) : !error && <p className="empty">Одоогоор зураг ороогүй байна ♡</p>}
    <dialog ref={viewer} className="viewer" aria-label="Зургийг томоор харах" onClose={() => setSelected(null)}>
      <button type="button" onClick={() => viewer.current?.close()} aria-label="Зургийг хаах">×</button>
      {selected && <><Image src={selected.url} alt="Зочны оруулсан зураг" fill sizes="100vw" unoptimized loading="eager" /><a className="download" href={`/api/guest-photos?download=${encodeURIComponent(selected.id)}`} download>↓ Зураг татах</a></>}
    </dialog>
    <style jsx>{`
      .guest-album{position:fixed;inset:0;height:100dvh;overflow-y:auto;padding:max(18px,env(safe-area-inset-top)) 20px max(28px,env(safe-area-inset-bottom));background:radial-gradient(ellipse at top,#512c44,#24101f 65%);color:#fce5f1;font-family:Manrope,Arial,sans-serif}
      .album-header,.intro,.photos,.empty{max-width:480px;margin-left:auto;margin-right:auto}.album-header{position:sticky;top:0;z-index:2;background:#311829;border-bottom:1px solid #e9acd139;border-radius:12px;padding:0 12px;display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;color:#dbabc4}.album-header :global(a){color:inherit;text-decoration:none;padding:10px 0}
      .intro{text-align:center;padding:25px 0 20px}.intro .eyebrow{font-size:9px;letter-spacing:2px;color:#d1a0bc}.intro h1{font:400 30px/1.4 "Noto Serif",Georgia,serif;margin:11px 0}.intro em{color:#edb8d0}.intro p{font-size:12px;line-height:1.8;color:#d0adc2;margin:10px 0}
      .download{position:absolute;z-index:1;bottom:max(22px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:12px 18px;border-radius:12px;background:#5c3450;color:white;text-decoration:none;white-space:nowrap}
      .intro .notice{color:#f1c5dc}.intro .error{color:#ffc3cc;overflow-wrap:anywhere}
      .photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.photo{position:relative;aspect-ratio:1;overflow:hidden;border:1px solid #e9acd139;border-radius:15px;background:#4b263c;cursor:pointer}.photo :global(img){object-fit:cover}.empty{text-align:center;color:#cb9fb7;font-size:13px;padding:22px 0}
      .viewer{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;border:0;background:#180b17}.viewer::backdrop{background:#180b17}.viewer :global(img){object-fit:contain}.viewer button{position:absolute;right:16px;top:max(14px,env(safe-area-inset-top));z-index:1;width:44px;height:44px;border-radius:50%;border:1px solid #e9acd166;background:#392035;color:white;font-size:25px;cursor:pointer}
    `}</style>
  </main>;
}

