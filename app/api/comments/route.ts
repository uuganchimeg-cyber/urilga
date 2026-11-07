import { createHash } from "node:crypto";
import { type NextRequest } from "next/server";
import { readResponses } from "../../lib/store";
import { json } from "../../lib/admin-auth";
export async function GET(request:NextRequest){request.headers.get("host");return json((await readResponses()).filter(item=>item.message).map(({id,message,createdAt})=>({id:createHash("sha256").update(id).digest("hex"),message,createdAt})).reverse());}

