import { memories } from "../memories/photos";
import { venue } from "../location/venue";

export type Photo = { src: string; alt: string };
export type SiteSettings = {
  heroImage: string;
  birthday: string;
  music: string;
  invitation: { eyebrow: string; title: string; body: string; closing: string };
  accepted: { image: string; message: string; emojis: string };
  gallery: { photos: Photo[]; intervalMs: number };
  venue: typeof venue & { mapEmbedUrl: string; mapLink: string };
};
export type SettingsDocument = { settings: SiteSettings; revision: number; updatedAt: string | null };
export type GuestResponse = { id: string; name: string; message: string; createdAt: string; updatedAt: string };
export const defaultSettings: SiteSettings = {
  heroImage: "/uugna.jpg",
  birthday: "2026-12-03T00:00:00+08:00",
  music: "/найз.mp3",
  invitation: {
    eyebrow: "ЧАМД ЗОРИУЛСАН УРИЛГА",
    title: "Эрхэм хүндэт найз нөхөд та бүхнийг",
    body: "Миний бие Ууганчимэгийн төрсөн өдрийн баярт хүрэлцэн ирж, баяр хөөр, инээд хөөрөөр дүүрэн нэгэн үдшийг хамтдаа өнгөрүүлэн, мартагдашгүй сайхан дурсамж бүтээхийг чин сэтгэлээсээ урьж байна. ♡",
    closing: "Хүрэлцэн ирж, миний онцгой өдрийг улам үнэ цэнтэй болгоорой! 🎀",
  },
  accepted: { image: "/avla.gif", message: "Урилгийг минь хүлээн авсан найздаа хайртай шүү псдаа минь", emojis: "🥰 💖 🦋" },
  gallery: { photos: memories, intervalMs: 1000 },
  venue: { ...venue, mapEmbedUrl: "", mapLink: "" },
};

export function socialUrl(value: string, site: "facebook" | "instagram") {
  if (!value) return "";
  if (value.startsWith("https://")) return value;
  return `https://www.${site}.com/${encodeURIComponent(value.replace(/^@/, ""))}/`;
}
