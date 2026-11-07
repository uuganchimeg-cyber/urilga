import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { defaultSettings, type GuestResponse, type SettingsDocument } from "./site-settings";

export const dataDirectory = path.resolve(/* turbopackIgnore: true */ process.env.URILGA_DATA_DIR || path.join(process.cwd(), ".data"));
export const uploadDirectory = path.join(dataDirectory, "uploads");
export async function readJson<T>(name: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ dataDirectory, name), "utf8")) as T; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return fallback; throw error; }
}
export async function writeJson(name: string, value: unknown) {
  await mkdir(dataDirectory, { recursive: true });
  const target = path.join(/* turbopackIgnore: true */ dataDirectory, name);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(temporary, target);
}
const state = globalThis as typeof globalThis & { urilgaWrites?: Promise<unknown> };
export function exclusive<T>(work: () => Promise<T>): Promise<T> {
  const next = (state.urilgaWrites || Promise.resolve()).then(work, work);
  state.urilgaWrites = next.catch(() => undefined);
  return next;
}
export const readSettings = () => readJson<SettingsDocument>("settings.json", { settings: defaultSettings, revision: 0, updatedAt: null });
export const readResponses = () => readJson<GuestResponse[]>("responses.json", []);

