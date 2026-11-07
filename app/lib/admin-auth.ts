import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { readJson } from "./store";
export type AdminCredentials = { salt: string; hash: string; secret: string };
export const cookieName = "urilga_admin_session";
export const readAdmin = () => readJson<AdminCredentials | null>("admin.json", null);
export function credentials(password: string): AdminCredentials {
  const salt = randomBytes(16).toString("hex");
  return { salt, hash: scryptSync(password, salt, 64).toString("hex"), secret: randomBytes(32).toString("hex") };
}
export function matches(password: string, admin: AdminCredentials) {
  const hash = scryptSync(password, admin.salt, 64);
  return timingSafeEqual(hash, Buffer.from(admin.hash, "hex"));
}
export function signSession(admin: AdminCredentials) {
  const expires = String(Date.now() + 7 * 86400000);
  return `${expires}.${createHmac("sha256", admin.secret).update(expires).digest("hex")}`;
}
export async function authenticated(request: NextRequest) {
  const admin = await readAdmin();
  const token = request.cookies.get(cookieName)?.value;
  if (!admin || !token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  const expected = createHmac("sha256", admin.secret).update(expires).digest();
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } }); }
export async function requireAdmin(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: "Хүсэлтийн эх сурвалж зөвшөөрөгдөөгүй." }, 403);
  if (!await authenticated(request)) return json({ error: "Админ эрхээр нэвтэрнэ үү." }, 401);
  return null;
}
export async function smallJson(request: NextRequest, limit = 256000) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new Error("Илгээсэн мэдээлэл хэт том байна.");
  const text = await request.text();
  if (Buffer.byteLength(text) > limit) throw new Error("Илгээсэн мэдээлэл хэт том байна.");
  return JSON.parse(text);
}
