"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Photo = { id: string; url: string; createdAt: string };
const albumUrl = "/api/guest-photos";
const downloadUrl = (id: string) => `${albumUrl}?download=${encodeURIComponent(id)}`;

export default function AdminGuestPhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [packed, setPacked] = useState<number | null>(null);

  async function refresh(signal?: AbortSignal) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(albumUrl, { cache: "no-store", signal });
      if (!response.ok) throw new Error();
      setPhotos(await response.json());
    } catch {
      if (!signal?.aborted) setError("Зочдын зургийг ачаалж чадсангүй.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, []);

  async function remove(photo: Photo) {
    if (!window.confirm("Энэ зургийг зочдын цомгоос хасах уу?")) return;
    setDeleting(photo.id);
    setError("");
    try {
      const response = await fetch(`${albumUrl}?id=${encodeURIComponent(photo.id)}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Зургийг хасаж чадсангүй.");
      setPhotos(current => current.filter(item => item.id !== photo.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Зургийг хасаж чадсангүй.");
    } finally {
      setDeleting(null);
    }
  }

  async function downloadAll() {
    setPacked(0);
    setError("");
    try {
      const { Zip, ZipPassThrough } = await import("fflate");
      const chunks: ArrayBuffer[] = [];
      const archive = new Zip((error, data) => {
        if (error) throw error;
        chunks.push(data.slice().buffer as ArrayBuffer);
      });
      for (const [index, photo] of photos.entries()) {
        const response = await fetch(downloadUrl(photo.id), { cache: "no-store" });
        if (!response.ok || !response.body) throw new Error(`${index + 1}-р зургийг татаж чадсангүй. Дахин оролдоно уу.`);
        const extension = /\.(jpg|jpeg|png|webp)$/i.exec(photo.url)?.[1] ?? "jpg";
        const entry = new ZipPassThrough(`photo-${String(index + 1).padStart(3, "0")}.${extension}`);
        archive.add(entry);
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          entry.push(value);
        }
        entry.push(new Uint8Array(), true);
        setPacked(index + 1);
      }
      archive.end();
      const url = URL.createObjectURL(new Blob(chunks, { type: "application/zip" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "guest-photos.zip";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ZIP файл бэлдэж чадсангүй.");
    } finally {
      setPacked(null);
    }
  }

  const busy = loading || packed !== null || deleting !== null;
  return <section className="guest-admin">
    <div className="toolbar">
      <span>{photos.length} зураг</span>
      <button type="button" onClick={() => void refresh()} disabled={busy}>Шинэчлэх</button>
      <button type="button" className="primary" onClick={() => void downloadAll()} disabled={busy || !photos.length}>
        {packed !== null ? `ZIP бэлдэж байна… ${packed}/${photos.length}` : "Бүгдийг ZIP-ээр татах ↓"}
      </button>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    {loading ? <p role="status">Зургуудаа ачаалж байна…</p> : !photos.length ? <p>Одоогоор зураг алга.</p> : (
      <div className="grid">
        {photos.map((photo, index) => <article key={photo.id}>
          <div className="preview"><Image src={photo.url} alt={`${index + 1}-р зураг`} fill sizes="(max-width: 800px) 45vw, 240px" unoptimized /></div>
          <div className="actions">
            <a href={downloadUrl(photo.id)} download>Татах ↓</a>
            <button type="button" onClick={() => void remove(photo)} disabled={busy}>{deleting === photo.id ? "Хасаж байна…" : "Устгах"}</button>
          </div>
        </article>)}
      </div>
    )}
    <style jsx>{`
      .guest-admin{padding:16px;border:1px solid #eadde6;border-radius:16px;background:#fffdfd;color:#5c4254}.toolbar,.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.toolbar{margin-bottom:16px}.toolbar span{margin-right:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(145px,1fr));gap:12px}.grid article{overflow:hidden;border:1px solid #eadde6;border-radius:12px}.preview{position:relative;aspect-ratio:1;background:#f1e7ee}.preview :global(img){object-fit:cover}.actions{padding:8px;justify-content:space-between}.guest-admin button,.actions a{min-height:38px;padding:8px 10px;border:1px solid #dfccda;border-radius:8px;background:#faf2f7;color:#69495f;font:inherit;text-decoration:none;cursor:pointer}.guest-admin .primary{background:#82516f;color:#fff}.guest-admin button:disabled{opacity:.55;cursor:default}.error{color:#9a3655;overflow-wrap:anywhere}
    `}</style>
  </section>;
}
