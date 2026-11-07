import { type NextRequest } from "next/server";
import { readResponses } from "../../../lib/store";
import { json, requireAdmin } from "../../../lib/admin-auth";
export async function GET(request:NextRequest){const denied=await requireAdmin(request);if(denied)return denied;return json((await readResponses()).reverse());}
