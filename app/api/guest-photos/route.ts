import { type NextRequest } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { json, sameOrigin } from "../../lib/admin-auth";
import { cloudEnabled, cloudTransaction, readCloud } from "../../lib/firebase-server";
import { mediaExtension, uploadCloudMedia } from "../../lib/cloudinary-server";
import { exclusive, readJson, uploadDirectory, writeJson } from "../../lib/local-store";

type Photo = { id: string; url: string; createdAt: string };
type Album = Record<string, Photo>;
const albumPath = "guestPhotos";
const maxBytes = 4_000_000;
const maxPhotos = 200;
const readAlbum = async () => cloudEnabled()
  ? (await readCloud<Album>(albumPath)) ?? {}
  : readJson<Album>("guest-photos.json", {});

export async function GET(request: NextRequest) {
  request.headers.get("host");
  try {
    const photos = Object.values(await readAlbum());
    return json(photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  } catch {
    return json({ error: "Зочдын зургийг ачаалж чадсангүй." }, 503);
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
