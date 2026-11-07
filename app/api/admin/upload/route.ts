import { type NextRequest } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { json, requireAdmin } from "../../../lib/admin-auth";
import { uploadDirectory } from "../../../lib/store";
import { cloudEnabled, firebaseNamespace } from "../../../lib/firebase-server";
import { cloudinaryAccount, getCloudinary, mediaExtension, uploadCloudMedia } from "../../../lib/cloudinary-server";
export async function POST(request:NextRequest){
  try {
    const denied=await requireAdmin(request);if(denied)return denied;
    if(Number(request.headers.get("content-length")||0)>26*1024*1024)return json({error:"Файл 25MB-аас бага байна."},413);
    const form=await request.formData();const file=form.get("file");if(!(file instanceof File)||file.size===0||file.size>25*1024*1024)return json({error:"1–25MB хэмжээтэй файл сонгоно уу."},400);
    const data=Buffer.from(await file.arrayBuffer());const extension=mediaExtension(data);const kind=form.get("kind");
    if(!extension || (kind!=="audio" && kind!=="image") || (kind==="audio")!==(extension==="mp3"))return json({error:"JPG, PNG, WEBP, GIF эсвэл MP3 файлын төрөл тохирохгүй байна."},400);
    if(cloudEnabled()){const result=await uploadCloudMedia(data,kind);return json({url:result.secure_url,name:file.name});}
    await mkdir(uploadDirectory,{recursive:true});const filename=`${randomUUID()}.${extension}`;await writeFile(path.join(/* turbopackIgnore: true */ uploadDirectory,filename),data,{flag:"wx"});return json({url:`/api/media/${filename}`,name:file.name});
  }catch{return json({error:"Файлыг байршуулж чадсангүй. Серверийн холболтоо шалгана уу."},503);}
}


export async function GET(request: NextRequest) {
  try {
    const denied = await requireAdmin(request);
    if (denied) return denied;
    if (!cloudEnabled()) return json({ direct: false });
    const account = cloudinaryAccount();
    const fields = {
      timestamp: Math.floor(Date.now() / 1000),
      public_id: `urilga/${firebaseNamespace()}/audio-${randomUUID()}`,
      allowed_formats: "mp3",
      overwrite: false,
    };
    return json({
      direct: true,
      endpoint: `https://api.cloudinary.com/v1_1/${encodeURIComponent(account.cloud_name)}/video/upload`,
      fields: {
        ...fields,
        api_key: account.api_key,
        signature: getCloudinary().utils.api_sign_request(fields, account.api_secret),
      },
    });
  } catch {
    return json({ error: "Дуу байршуулах эрх бэлдэж чадсангүй. Серверийн тохиргоог шалгана уу." }, 503);
  }
}
