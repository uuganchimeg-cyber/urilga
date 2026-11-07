import { type NextRequest } from "next/server";
import { readSettings, saveSettings } from "../../lib/store";
import { json, requireAdmin, smallJson } from "../../lib/admin-auth";
import { validateSettings } from "../../lib/validate-settings";
export async function GET(request: NextRequest) { request.headers.get("host"); try {return json(await readSettings());} catch {return json({error:"Тохиргоо ачаалж чадсангүй. Дахин оролдоно уу."},503);} }
export async function PUT(request: NextRequest) {
  try {
    const denied = await requireAdmin(request); if (denied) return denied;
    const payload = await smallJson(request);
    let settings;
    try {settings=validateSettings(payload.settings);} catch(error) {return json({error:(error as Error).message},400);}
    const next=await saveSettings(settings,payload.revision);
    return next?json(next):json({error:"Өөр цонхонд тохиргоо шинэчлэгдсэн байна. Дахин ачаалаад засна уу."},409);
  } catch {return json({error:"Хадгалж чадсангүй. Серверийн холболтоо шалгаад дахин оролдоно уу."},503);}
}
