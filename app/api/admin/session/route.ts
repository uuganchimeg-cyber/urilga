import { type NextRequest } from "next/server";
import { authenticated, cookieName, credentials, json, matches, readAdmin, sameOrigin, signSession, smallJson } from "../../../lib/admin-auth";
import { exclusive, writeJson } from "../../../lib/store";
const attempts = new Map<string,{count:number;until:number}>();
export async function GET(request: NextRequest) { return json({ configured: !!await readAdmin(), authenticated: await authenticated(request) }); }
export async function POST(request: NextRequest) {
  if(!sameOrigin(request))return json({error:"Хүсэлт зөвшөөрөгдөөгүй."},403);
  const host=new URL(request.url).hostname;
  const key=request.headers.get("x-forwarded-for") || host;
  const attempt=attempts.get(key);if(attempt && attempt.count>=10 && attempt.until>Date.now())return json({error:"Олон удаа буруу оролдлоо. 15 минутын дараа дахин оролдоно уу."},429);
  try {
    const {password,action}=await smallJson(request,2000);
    if(typeof password!=="string"||password.length<8||password.length>128)return json({error:"Нууц үг 8–128 тэмдэгт байна."},400);
    return await exclusive(async()=>{
      let admin=await readAdmin();
      if(!admin){
        if(action!=="setup")return json({error:"Эхлээд админы нууц үгээ үүсгэнэ үү."},400);
        if(!["localhost","127.0.0.1","[::1]"].includes(host))return json({error:"Анхны нууц үгийг сервер дээр localhost:3000/urilgadmin хаягаар үүсгэнэ үү."},403);
        admin=credentials(password);await writeJson("admin.json",admin);
      }else if(action==="setup")return json({error:"Админы нууц үг аль хэдийн үүссэн байна."},409);
      else if(!matches(password,admin)){attempts.set(key,{count:(attempt?.until && attempt.until>Date.now()?attempt.count:0)+1,until:Date.now()+900000});return json({error:"Нууц үг буруу байна."},401);}
      attempts.delete(key);
      const response=json({authenticated:true,configured:true});
      response.cookies.set(cookieName,signSession(admin),{httpOnly:true,sameSite:"strict",secure:new URL(request.url).protocol==="https:",path:"/",maxAge:7*86400});return response;
    });
  }catch{return json({error:"Нэвтэрч чадсангүй. Дахин оролдоно уу."},400);}
}
export async function DELETE(request:NextRequest){if(!sameOrigin(request))return json({error:"Хүсэлт зөвшөөрөгдөөгүй."},403);const response=json({authenticated:false});response.cookies.set(cookieName,"",{path:"/",maxAge:0});return response;}
