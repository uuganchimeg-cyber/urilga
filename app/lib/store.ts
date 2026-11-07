import { createHash } from "node:crypto";
import { defaultSettings, withoutBundledMedia, type GuestResponse, type SettingsDocument, type SiteSettings } from "./site-settings";
import { cloudEnabled, cloudTransaction, readCloud } from "./firebase-server";
import * as local from "./local-store";
export { dataDirectory, uploadDirectory, exclusive } from "./local-store";
export const defaultDocument = (): SettingsDocument => ({settings: defaultSettings, revision: 0, updatedAt: null});
const nodeName = (name: string) => ({"settings.json":"settings","admin.json":"admin","responses.json":"responses"})[name];
export async function readJson<T>(name: string, fallback: T): Promise<T> {
  if (!cloudEnabled()) return local.readJson(name, fallback);
  const key = nodeName(name); if (!key) throw new Error("Хадгалалтын төрөл буруу байна.");
  return await readCloud<T>(key) ?? fallback;
}
// Kept for initial admin setup and explicit local test fixtures. Runtime settings/responses use transactions below.
export async function writeJson(name: string, value: unknown) {
  if (!cloudEnabled()) return local.writeJson(name, value);
  if (name === "admin.json") {
    const created = await cloudTransaction("admin", current => current === null ? value : undefined);
    if (!created.committed) throw new Error("Админ эрх аль хэдийн үүссэн байна.");
    return;
  }
  throw new Error("Transaction ашиглан хадгална уу.");
}
export async function readSettings(): Promise<SettingsDocument> { const document = await readJson("settings.json", defaultDocument()); return { ...document, settings: withoutBundledMedia(document.settings) }; }
export async function saveSettings(settings: SiteSettings, revision: number): Promise<SettingsDocument | null> {
  const update = (current: SettingsDocument | null) => {
    const previous = current ?? defaultDocument();
    if (previous.revision !== revision) return undefined;
    return {settings: withoutBundledMedia(settings), revision: previous.revision + 1, updatedAt: new Date().toISOString()};
  };
  if (cloudEnabled()) { const result = await cloudTransaction<SettingsDocument>("settings", update); return result.committed && result.value ? { ...result.value, settings: withoutBundledMedia(result.value.settings) } : null; }
  return local.exclusive(async () => { const next = update(await local.readSettings()); if (!next) return null; await local.writeJson("settings.json", next); return next; });
}
export async function readResponses(): Promise<GuestResponse[]> {
  if (!cloudEnabled()) return local.readResponses();
  const rows = await readCloud<Record<string, GuestResponse>>("responses");
  return Object.values(rows || {}).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
}
export async function saveGuestResponse(value: { id: string; name: string; message: string }) {
  const name = value.name.trim();
  const message = value.message.trim();
  const collisionId = createHash("sha256").update(JSON.stringify([value.id, name, message])).digest("hex");
  const update = (current: Record<string, GuestResponse> | null) => {
    const rows = current ?? {};
    const original = rows[value.id];
    const id = original && (original.name !== name || original.message !== message) ? collisionId : value.id;
    if (rows[id]) return undefined;
    if (Object.keys(rows).length >= 10000) throw new Error("Одоогоор хариу хүлээн авах боломжгүй байна.");
    const now = new Date().toISOString();
    return { ...rows, [id]: { id, name, message, createdAt: now, updatedAt: now } };
  };
  if (cloudEnabled()) {
    await cloudTransaction<Record<string, GuestResponse>>("responses", update);
    return;
  }
  return local.exclusive(async () => {
    const rows = await local.readResponses();
    const next = update(Object.fromEntries(rows.map(row => [row.id, row])));
    if (next) await local.writeJson("responses.json", Object.values(next));
  });
}



export async function deleteGuestResponse(id: string) {
  if (cloudEnabled()) {
    await cloudTransaction<Record<string, GuestResponse>>("responses", current => {
      if (!current || !Object.hasOwn(current, id)) return undefined;
      const remaining = { ...current };
      delete remaining[id];
      return remaining;
    });
    return;
  }
  await local.exclusive(async () => {
    const rows = await local.readResponses();
    const remaining = rows.filter(row => row.id !== id);
    if (remaining.length !== rows.length) await local.writeJson("responses.json", remaining);
  });
}
