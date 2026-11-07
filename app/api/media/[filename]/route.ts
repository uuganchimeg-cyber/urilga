import { type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDirectory } from "../../../lib/store";
const types:Record<string,string>={jpg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",mp3:"audio/mpeg"};
export async function GET(request:NextRequest,{params}:{params:Promise<{filename:string}>}){
  const {filename}=await params;if(!/^[a-f0-9-]{36}\.(jpg|png|gif|webp|mp3)$/.test(filename))return new Response(null,{status:404});
  try{const data=await readFile(/* turbopackIgnore: true */ path.join(/* turbopackIgnore: true */ uploadDirectory,filename));const headers:Record<string,string>={"Content-Type":types[filename.split(".").pop()!],"Cache-Control":"public, max-age=31536000, immutable","Accept-Ranges":"bytes","X-Content-Type-Options":"nosniff"};const range=request.headers.get("range");
    if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${data.length}`}});let start=match[1]?Number(match[1]):Math.max(0,data.length-Number(match[2]));const end=match[1]&&match[2]?Math.min(Number(match[2]),data.length-1):data.length-1;if(!Number.isSafeInteger(start)||start>end||start>=data.length)return new Response(null,{status:416,headers:{"Content-Range":`bytes */${data.length}`}});headers["Content-Range"]=`bytes ${start}-${end}/${data.length}`;headers["Content-Length"]=String(end-start+1);return new Response(new Uint8Array(data.subarray(start,end+1)),{status:206,headers});}
    headers["Content-Length"]=String(data.length);return new Response(new Uint8Array(data),{headers});
  }catch{return new Response(null,{status:404});}
}

