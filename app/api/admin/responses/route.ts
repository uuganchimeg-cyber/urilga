import { type NextRequest } from "next/server";
import { deleteGuestResponse, readResponses } from "../../../lib/store";
import { json, requireAdmin } from "../../../lib/admin-auth";
export async function GET(request:NextRequest){const denied=await requireAdmin(request);if(denied)return denied;return json((await readResponses()).reverse());}


export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    const id = request.nextUrl.searchParams.get("id");
    if (!id || !/^[a-zA-Z0-9-]{8,100}$/.test(id)) return json({ error: "Хариуны дугаар буруу байна." }, 400);
    await deleteGuestResponse(id);
    return json({ ok: true });
  } catch {
    return json({ error: "Хариуг устгаж чадсангүй. Дахин оролдоно уу." }, 503);
  }
}
