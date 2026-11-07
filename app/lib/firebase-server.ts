import { cert, getApps, initializeApp } from "firebase-admin/app";

export const cloudEnabled = () => process.env.URILGA_STORAGE_DRIVER !== "local";
export const firebaseNamespace = () => {
  const value = process.env.FIREBASE_DATA_PATH || "urilga_v1";
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) throw new Error("FIREBASE_DATA_PATH нь зөвхөн үсэг, тоо, _ эсвэл - агуулна.");
  return value;
};
function firebaseApp() {
  const existing = getApps().find(app => app.name === "urilga-server");
  if (existing) return existing;
  try {
    const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
    if (!encoded) throw new Error("missing");
    const account = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (!account.project_id || !account.client_email || !account.private_key) throw new Error("invalid");
    account.private_key = account.private_key.replace(/\\n/g, "\n");
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PROJECT_ID !== account.project_id) throw new Error("project mismatch");
    return initializeApp({ credential: cert(account), projectId: account.project_id }, "urilga-server");
  } catch { throw new Error("Firebase серверийн тохиргоо буруу байна. Админтай холбогдоно уу."); }
}
function databaseUrl() {
  const value = process.env.FIREBASE_DATABASE_URL || process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
  if (!value) throw new Error("Firebase database URL тохируулаагүй байна.");
  const url = new URL(value);
  if (url.protocol !== "https:" || !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname)) throw new Error("Firebase database URL буруу байна.");
  return url.origin;
}
async function token() {
  try { return (await firebaseApp().options.credential!.getAccessToken()).access_token; }
  catch { throw new Error("Firebase серверийн эрхийг баталгаажуулж чадсангүй. Service account түлхүүрээ шалгана уу."); }
}
export async function firebaseRequest(path: string, init: RequestInit = {}, root = false) {
  const key = root ? path : `${firebaseNamespace()}/${path}`;
  return fetch(`${databaseUrl()}/${key}.json`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", ...init.headers },
    signal: init.signal || AbortSignal.timeout(20000),
    cache: "no-store",
  });
}
export async function readCloud<T>(path: string): Promise<T | null> {
  const response = await firebaseRequest(path);
  if (!response.ok) throw new Error(`Firebase мэдээлэл уншиж чадсангүй (${response.status}).`);
  return response.json();
}
export async function cloudTransaction<T>(path: string, update: (current: T | null) => T | undefined): Promise<{committed: boolean; value: T | null}> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const read = await firebaseRequest(path, { headers: { "X-Firebase-ETag": "true" } });
    if (!read.ok) throw new Error(`Firebase мэдээлэл уншиж чадсангүй (${read.status}).`);
    const current = await read.json() as T | null;
    const next = update(current);
    if (next === undefined) return { committed: false, value: current };
    const etag = read.headers.get("etag");
    if (!etag) throw new Error("Firebase transaction баталгаажуулалт ирсэнгүй.");
    const write = await firebaseRequest(path, { method: "PUT", headers: { "If-Match": etag }, body: JSON.stringify(next) });
    if (write.status === 412) continue;
    if (!write.ok) throw new Error(`Firebase хадгалж чадсангүй (${write.status}).`);
    return { committed: true, value: await write.json() as T };
  }
  throw new Error("Мэдээлэл зэрэг шинэчлэгдэж байна. Дахин оролдоно уу.");
}
