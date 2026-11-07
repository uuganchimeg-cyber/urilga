import { type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { json, requireAdmin, sameOrigin } from "../../lib/admin-auth";
import { cloudEnabled, cloudTransaction, firebaseNamespace, readCloud } from "../../lib/firebase-server";
import { allowedCloudinaryUrl, cloudinaryAccount, getCloudinary, mediaExtension, uploadCloudMedia } from "../../lib/cloudinary-server";
import { exclusive, readJson, uploadDirectory, writeJson } from "../../lib/local-store";

import { maxGuestVideoBytes } from "../../lib/guest-media-limits";

type Photo = { id: string; url: string; createdAt: string; kind?: "video" };
type Album = Record<string, Photo>;
const albumPath = "guestPhotos";
const maxBytes = 4_000_000;
const maxPhotos = 200;
const readAlbum = async () => cloudEnabled()
  ? (await readCloud<Album>(albumPath)) ?? {}
  : readJson<Album>("guest-photos.json", {});

export async function GET(request: NextRequest) {
  const downloadId = request.nextUrl.searchParams.get("download");
  try {
    const album = await readAlbum();
    if (downloadId !== null) {
      if (!/^[a-f0-9]{64}$/.test(downloadId) || !album[downloadId]) return json({ error: "Зураг олдсонгүй." }, 404);
      return await downloadPhoto(album[downloadId], request.signal);
    }
    const photos = Object.values(album);
    return json(photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch {
    return json({ error: "Зочдын зургийг ачаалж чадсангүй." }, 503);
  }
}



const videoFormats = ["mp4", "mov", "webm"];
const videoPublicId = (key: string) => `urilga/${firebaseNamespace()}/guest-video-${key}`;

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Хүсэлт зөвшөөрөгдөөгүй." }, 403);
  if (!cloudEnabled()) return json({ error: "Видео оруулахад Cloudinary болон Firebase холболт шаардлагатай." }, 503);
  try {
    if (Object.keys(await readAlbum()).length >= maxPhotos) return json({ error: "Цомог дүүрсэн байна." }, 409);
    const account = cloudinaryAccount();
    const key = randomUUID();
    const fields = {
      public_id: videoPublicId(key),
      timestamp: Math.floor(Date.now() / 1000),
      allowed_formats: videoFormats.join(","),
      overwrite: false,
    };
    return json({
      key,
      endpoint: `https://api.cloudinary.com/v1_1/${encodeURIComponent(account.cloud_name)}/video/upload`,
      fields: { ...fields, api_key: account.api_key, signature: getCloudinary().utils.api_sign_request(fields, account.api_secret) },
    });
  } catch {
    return json({ error: "Видео байршуулах эрх бэлдэж чадсангүй." }, 503);
  }
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Хүсэлт зөвшөөрөгдөөгүй." }, 403);
  if (!cloudEnabled()) return json({ error: "Видео хадгалах холболт идэвхгүй байна." }, 503);
  const key = request.nextUrl.searchParams.get("video");
  if (!key || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(key)) {
    return json({ error: "Видеоны дугаар буруу байна." }, 400);
  }

  try {
    const publicId = videoPublicId(key);
    const id = createHash("sha256").update(publicId).digest("hex");
    const existing = (await readAlbum())[id];
    if (existing) return json(existing);
    const cloud = getCloudinary();
    const video = await cloud.api.resource(publicId, { resource_type: "video", type: "upload" });
    if (!videoFormats.includes(video.format) || !video.width || !video.height ||
        !Number.isFinite(video.bytes) || video.bytes <= 0 || video.bytes > maxGuestVideoBytes ||
        !allowedCloudinaryUrl(video.secure_url)) {
      await cloud.uploader.destroy(publicId, { resource_type: "video" });
      return json({ error: "2 GB хүртэлх MP4, MOV эсвэл WebM бичлэг сонгоно уу." }, 400);
    }
    const item: Photo = { id, url: video.secure_url, createdAt: new Date().toISOString(), kind: "video" };
    const result = await cloudTransaction<Album>(albumPath, current => {
      const items = current ?? {};
      if (items[id] || Object.keys(items).length >= maxPhotos) return undefined;
      return { ...items, [id]: item };
    });
    if (result.value?.[id]) return json(result.value[id]);
    await cloud.uploader.destroy(publicId, { resource_type: "video" });
    return json({ error: "Цомог дүүрсэн байна." }, 409);
  } catch {
    return json({ error: "Видеог цомогт хадгалж чадсангүй." }, 503);
  }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Хүсэлт зөвшөөрөгдөөгүй." }, 403);
  if (Number(request.headers.get("content-length") || 0) > maxBytes + 100_000) {
    return json({ error: "Нэг зураг 4 MB хүртэл байна." }, 413);
  }
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > maxBytes) {
      return json({ error: "4 MB хүртэлх зураг сонгоно уу." }, 400);
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = mediaExtension(bytes);
    if (!extension || !["jpg", "png", "webp"].includes(extension)) {
      return json({ error: "JPG, PNG эсвэл WebP зураг сонгоно уу." }, 400);
    }
    const id = createHash("sha256").update(bytes).digest("hex");
    const album = await readAlbum();
    if (album[id]) return json(album[id]);
    if (Object.keys(album).length >= maxPhotos) return json({ error: "Цомог дүүрсэн байна." }, 409);
    const createdAt = new Date().toISOString();
    if (cloudEnabled()) {
      const uploaded = await uploadCloudMedia(bytes, "image");
      const photo = { id, url: uploaded.secure_url, createdAt };
      const result = await cloudTransaction<Album>(albumPath, current => {
        const photos = current ?? {};
        if (photos[id] || Object.keys(photos).length >= maxPhotos) return undefined;
        return { ...photos, [id]: photo };
      });
      return result.value?.[id] ? json(result.value[id]) : json({ error: "Цомог дүүрсэн байна." }, 409);
    }
    return await exclusive(async () => {
      const current = await readAlbum();
      if (current[id]) return json(current[id]);
      if (Object.keys(current).length >= maxPhotos) return json({ error: "Цомог дүүрсэн байна." }, 409);
      const filename = `${randomUUID()}.${extension}`;
      await mkdir(uploadDirectory, { recursive: true });
      await writeFile(path.join(/* turbopackIgnore: true */ uploadDirectory, filename), bytes, { flag: "wx" });
      const photo = { id, url: `/api/media/${filename}`, createdAt };
      await writeJson("guest-photos.json", { ...current, [id]: photo });
      return json(photo);
    });
  } catch {
    return json({ error: "Зургийг хадгалж чадсангүй. Дахин оролдоно уу." }, 503);
  }
}


async function downloadPhoto(photo: Photo, signal: AbortSignal) {
  const extension = /\.(jpg|jpeg|png|webp|mp4|mov|webm)$/i.exec(photo.url)?.[1]?.toLowerCase();
  if (!extension) return json({ error: "Зургийн формат тохирохгүй байна." }, 404);
  const headers = {
    "Content-Disposition": `attachment; filename="guest-${photo.id.slice(0, 12)}.${extension}"`,
    "Content-Type": photo.kind === "video" ? (extension === "mov" ? "video/quicktime" : `video/${extension}`) : `image/${extension === "jpg" ? "jpeg" : extension}`,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };
  const localFile = /^\/api\/media\/([a-f0-9-]{36}\.(?:jpg|png|webp))$/.exec(photo.url);
  if (localFile) {
    const bytes = await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ uploadDirectory, localFile[1]));
    return new Response(new Uint8Array(bytes), { headers });
  }
  if (!allowedCloudinaryUrl(photo.url)) return json({ error: "Зургийн холбоос буруу байна." }, 404);
  const upstream = await fetch(photo.url, { redirect: "error", signal: photo.kind === "video" ? signal : AbortSignal.timeout(20000) });
  if (!upstream.ok || !upstream.body) return json({ error: "Зургийг татаж чадсангүй." }, 502);
  return new Response(upstream.body, { headers });
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !/^[a-f0-9]{64}$/.test(id)) return json({ error: "Зургийн дугаар буруу байна." }, 400);
    function remove(current: Album | null) {
      if (!current || !Object.hasOwn(current, id!)) return undefined;
      const remaining = { ...current };
      delete remaining[id!];
      return remaining;
    }
    if (cloudEnabled()) await cloudTransaction<Album>(albumPath, remove);
    else await exclusive(async () => {
      const remaining = remove(await readAlbum());
      if (remaining) await writeJson("guest-photos.json", remaining);
    });
    return json({ ok: true });
  } catch {
    return json({ error: "Зургийг цомгоос хасаж чадсангүй." }, 503);
  }
}
