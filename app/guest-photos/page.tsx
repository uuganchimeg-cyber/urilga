"use client";

import Image from "next/image";
import ZoomablePhoto from "../zoomable-photo";
import Link from "next/link";
import GuestPhotoButton from "../guest-photo-button";
import { useEffect, useRef, useState } from "react";

import { maxGuestVideoBytes } from "../lib/guest-media-limits";

type Photo = { id: string; url: string; createdAt: string; kind?: "video" };

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

async function uploadVideo(file: File, onProgress: (percent: number) => void) {
  if (!file.size || file.size > maxGuestVideoBytes || !/\.(mp4|mov|webm)$/i.test(file.name)) {
    throw new Error("2 GB хүртэлх MP4, MOV эсвэл WebM бичлэг сонгоно уу.");
  }

  const ticketResponse = await fetch("/api/guest-photos", { method: "PATCH" });
  const ticket = await ticketResponse.json();
  if (!ticketResponse.ok) throw new Error(ticket.error || "Видео байршуулах эрх авч чадсангүй.");

  const chunkSize = 6_000_000;
  const chunked = file.size > chunkSize;
  for (let start = 0; start < file.size; start += chunkSize) {
    const end = Math.min(start + chunkSize, file.size);
    const form = new FormData();
    for (const [name, value] of Object.entries(ticket.fields)) form.set(name, String(value));
    form.set("file", file.slice(start, end, file.type), file.name);

    const uploaded = await fetch(ticket.endpoint, {
      method: "POST",
      body: form,
      headers: chunked ? {
        "X-Unique-Upload-Id": ticket.key,
        "Content-Range": `bytes ${start}-${end - 1}/${file.size}`,
      } : undefined,
    });
    if (!uploaded.ok) {
      const result = await uploaded.json().catch(() => null);
      throw new Error(result?.error?.message || "Видео байршуулж чадсангүй. Холболтоо шалгаад дахин оролдоно уу.");
    }
    if (chunked && (await uploaded.json()).done !== (end === file.size)) {
      throw new Error("Видеоны хэсгийг баталгаажуулж чадсангүй.");
    }
    onProgress(Math.floor(end / file.size * 99));
  }
  return fetch(`/api/guest-photos?video=${encodeURIComponent(ticket.key)}`, { method: "PUT" });
}
export default function GuestPhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [category, setCategory] = useState<"all" | "image" | "video">("all");
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [videoPercent, setVideoPercent] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Photo | null>(null);

  const [shareFile, setShareFile] = useState<File | null>(null);
  const [manualSave, setManualSave] = useState(false);

  useEffect(() => {
    if (!selected || selected.kind === "video" || !navigator.share || !navigator.canShare) return;
    const controller = new AbortController();
    const id = selected.id;

    async function prepareShare() {
      try {
        const response = await fetch(`/api/guest-photos?download=${encodeURIComponent(id)}`, { signal: controller.signal });
        if (!response.ok) return;
        const blob = await response.blob();
        if (controller.signal.aborted || !blob.type.startsWith("image/")) return;
        const extension = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
        const file = new File([blob], `urilga-${id}.${extension}`, { type: blob.type });
        if (navigator.canShare({ files: [file] })) setShareFile(file);
      } catch {
        // The original image is still available through the manual save link.
      }
    }

    void prepareShare();
    return () => controller.abort();
  }, [selected]);

  async function savePhoto() {
    if (shareFile) {
      try {
        await navigator.share({ files: [shareFile] });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    setManualSave(true);
  }
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
    if (files.length > 20) { setError("Нэг удаад 20 хүртэл файл сонгоно уу."); return; }
    setError("");
    setNotice("");
    setProgress({ done: 0, total: files.length });
    const failed: string[] = [];
    let saved = 0;
    try {
      for (const [index, file] of files.entries()) {
        try {
          let response: Response;
          if (file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name)) {
            setVideoPercent(0);
            response = await uploadVideo(file, setVideoPercent);
          } else {
            const form = new FormData();
            form.set("file", await preparePhoto(file), "photo.jpg");
            response = await fetch("/api/guest-photos", { method: "POST", body: form });
          }
          const result = await response.json().catch(() => null);
          if (!response.ok || !result?.id || !result?.url) throw new Error(result?.error || "Байршуулж чадсангүй.");
          setPhotos(current => current.some(photo => photo.id === result.id) ? current : [result, ...current]);
          saved++;
        } catch (reason) {
          failed.push(`${file.name} (${reason instanceof Error ? reason.message : "байршуулж чадсангүй"})`);
        } finally {
          setVideoPercent(null);
          setProgress({ done: index + 1, total: files.length });
        }
      }
      if (saved) setNotice(`${saved} файл цомогт хадгалагдлаа ♡`);
      if (failed.length) setError(`Оруулж чадсангүй (${failed.length}). ${failed.join(" · ")}`);
    } finally {
      setProgress(null);
    }
  }

  const visibleItems = photos.filter(item => category === "all" || (item.kind ?? "image") === category);
  const categoryLabel = category === "all" ? "файл" : category === "video" ? "видео" : "зураг";

  return <main className="guest-album">
    <header className="album-header">
      <Link href="/">← Буцах</Link>
      <div className="categories" role="group" aria-label="Цомгийн ангилал">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>Бүгд</button>
        <button type="button" aria-pressed={category === "image"} onClick={() => setCategory("image")}>Зураг</button>
        <button type="button" aria-pressed={category === "video"} onClick={() => setCategory("video")}>Видео</button>
      </div>
      <span>{visibleItems.length} {categoryLabel}</span>
    </header>
    <section className="intro">
      <p className="eyebrow">БИДНИЙ ХАМТЫН ЦОМОГ</p>
      <h1>Зочдын <em>цомог</em></h1>
      <p>Өөрийн авсан зураг, бичлэгээ бусад зочидтой хуваалцаарай.</p>
      <input ref={picker} type="file" accept="image/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple hidden disabled={loading || !!progress}
        onChange={event => { const files = Array.from(event.currentTarget.files ?? []); event.currentTarget.value = ""; void upload(files); }} />
      <GuestPhotoButton uploadLabel="Зураг, видео оруулах" disabled={loading || !!progress} onActivate={() => picker.current?.click()} />
      {progress && <p role="status">Байршуулж байна… {progress.done}/{progress.total}{videoPercent !== null && ` · Видео ${videoPercent}%`}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {error && <p role="alert" className="error">{error}</p>}
    </section>
    {loading ? <p className="empty">Цомгийг ачаалж байна…</p> : visibleItems.length ? (
      <div className="photos">
        {visibleItems.map((photo, index) => <button key={photo.id} className="photo" type="button" aria-label={`${index + 1}-р ${photo.kind === "video" ? "видео" : "зураг"} үзэх`} onClick={() => { setShareFile(null); setManualSave(false); setSelected(photo); viewer.current?.showModal(); }}>
          {photo.kind === "video" ? <><Image src={photo.url.replace("/video/upload/", "/video/upload/so_0,c_fill,w_450,h_450,q_auto/").replace(/\.(mp4|mov|webm)$/i, ".jpg")} alt="" fill sizes="(max-width: 500px) 48vw, 220px" unoptimized /><span className="video-card">▶ Видео</span></> : <Image src={thumbnail(photo.url)} alt="" fill sizes="(max-width: 500px) 48vw, 220px" unoptimized />}
        </button>)}
      </div>
    ) : !error && <p className="empty">Одоогоор {categoryLabel} ороогүй байна ♡</p>}
    <dialog ref={viewer} className="viewer" aria-label="Цомгийн файл үзэх" onClose={() => setSelected(null)}>
      <button type="button" onClick={() => viewer.current?.close()} aria-label="Хаах">×</button>
      {selected?.kind === "video" && <video className="video-player" src={selected.url.replace("/video/upload/", "/video/upload/f_mp4,vc_h264/").replace(/\.(mov|webm)$/i, ".mp4")} controls playsInline preload="metadata" />}
      {selected && selected.kind !== "video" && <><ZoomablePhoto key={selected.id}><Image src={selected.url} alt="Зочны оруулсан зураг" fill sizes="100vw" unoptimized loading="eager" draggable={false} /></ZoomablePhoto><div className="download"><button type="button" onClick={() => void savePhoto()}>Галерейд хадгалах</button>{manualSave && <a href={selected.url} target="_blank" rel="noopener noreferrer">Зургийг нээгээд удаан дарж хадгалаарай</a>}</div></>}
    </dialog>
    <style jsx>{`
      .categories{display:flex;gap:3px;justify-content:center}.categories button{min-height:36px;padding:5px clamp(4px,1.4vw,9px);font:inherit;border-radius:4px;border:1px solid #e9acd166;color:inherit;background:transparent}.categories button[aria-pressed=true]{background:#754263}.video-card{position:absolute;left:8px;bottom:8px;padding:5px 8px;border-radius:8px;color:#fce5f1;background:#301b2de6}.video-player{position:absolute;inset:8% 0;width:100%;height:84%;object-fit:contain}
      .guest-album{position:fixed;inset:0;height:100dvh;overflow-y:auto;padding:max(18px,env(safe-area-inset-top)) 20px max(28px,env(safe-area-inset-bottom));background:radial-gradient(ellipse at top,#512c44,#24101f 65%);color:#fce5f1;font-family:Manrope,Arial,sans-serif}
      .album-header,.intro,.photos,.empty{max-width:480px;margin-left:auto;margin-right:auto}.album-header{position:sticky;top:0;z-index:2;background:#311829;border-bottom:1px solid #e9acd139;border-radius:12px;padding:4px 6px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:3px;font-size:11px;color:#dbabc4;white-space:nowrap}.album-header>span{text-align:right}.album-header :global(a){justify-self:start;color:inherit;text-decoration:none;padding:10px 0}
      .intro{text-align:center;padding:25px 0 20px}.intro .eyebrow{font-size:9px;letter-spacing:2px;color:#d1a0bc}.intro h1{font:400 30px/1.4 "Noto Serif",Georgia,serif;margin:11px 0}.intro em{color:#edb8d0}.intro p{font-size:12px;line-height:1.8;color:#d0adc2;margin:10px 0}
      .download button,.download a{color:inherit;font:inherit}
      .download a{display:block;margin-top:8px;white-space:normal}
      .download{position:absolute;z-index:1;bottom:max(22px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);padding:12px 18px;border-radius:12px;background:#5c3450;color:white;text-decoration:none;white-space:nowrap}
      .intro .notice{color:#f1c5dc}.intro .error{color:#ffc3cc;overflow-wrap:anywhere}
      .photos{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.photo{position:relative;aspect-ratio:1;overflow:hidden;border:1px solid #e9acd139;border-radius:15px;background:#4b263c;cursor:pointer}.photo :global(img){object-fit:cover}.empty{text-align:center;color:#cb9fb7;font-size:13px;padding:22px 0}
      .viewer{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;border:0;background:#180b17}.viewer::backdrop{background:#180b17}.viewer :global(img){object-fit:contain}.viewer button{position:absolute;right:16px;top:max(14px,env(safe-area-inset-top));z-index:1;width:44px;height:44px;border-radius:50%;border:1px solid #e9acd166;background:#392035;color:white;font-size:25px;cursor:pointer}
    `}</style>
  </main>;
}

