import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { createHash } from "node:crypto";

export function cloudinaryAccount() {
  try {
    const url = new URL(process.env.CLOUDINARY_URL || "");
    if (url.protocol !== "cloudinary:" || !url.hostname || !url.username || !url.password) throw new Error();
    return { cloud_name: url.hostname, api_key: decodeURIComponent(url.username), api_secret: decodeURIComponent(url.password) };
  } catch { throw new Error("Cloudinary серверийн тохиргоог шалгана уу."); }
}
export function getCloudinary() { cloudinary.config({ ...cloudinaryAccount(), secure: true }); return cloudinary; }
export function allowedCloudinaryUrl(value: string) {
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "res.cloudinary.com" && !url.username && !url.password && url.pathname.startsWith(`/${cloudinaryAccount().cloud_name}/`); }
  catch { return false; }
}
export type MediaKind = "image" | "audio";
export function mediaExtension(data: Buffer) {
  if (data.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return "jpg";
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (["GIF87a", "GIF89a"].includes(data.subarray(0, 6).toString())) return "gif";
  if (data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP") return "webp";
  if (data.subarray(0, 3).toString() === "ID3" || (data[0] === 255 && (data[1] & 224) === 224)) return "mp3";
  return null;
}
export async function uploadCloudMedia(data: Buffer, kind: MediaKind) {
  const extension = mediaExtension(data);
  if (!extension || (kind === "audio") !== (extension === "mp3")) throw new Error("JPG, PNG, WEBP, GIF эсвэл MP3 файлын төрөл тохирохгүй байна.");
  const namespace = process.env.FIREBASE_DATA_PATH || "urilga_v1";
  const publicId = `urilga/${namespace}/${createHash("sha256").update(data).digest("hex")}`;
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream({ public_id: publicId, resource_type: kind === "audio" ? "video" : "image", overwrite: false, unique_filename: false, timeout: 60000 }, (error, result) => {
      if (error || !result) reject(new Error("Cloudinary файл байршуулж чадсангүй. Дахин оролдоно уу."));
      else resolve(result);
    });
    stream.on("error", () => reject(new Error("Cloudinary холболт тасарлаа. Дахин оролдоно уу.")));
    stream.end(data);
  });
}
