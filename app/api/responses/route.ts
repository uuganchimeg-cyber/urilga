import { type NextRequest } from "next/server";
import { json, sameOrigin, smallJson } from "../../lib/admin-auth";
import { saveGuestResponse } from "../../lib/store";
export async function POST(request:NextRequest){
  if(!sameOrigin(request))return json({error:"Хүсэлт зөвшөөрөгдөөгүй."},403);
  try{const value=await smallJson(request,8000);if(typeof value.id!=="string"||! /^[a-zA-Z0-9-]{8,100}$/.test(value.id)||typeof value.name!=="string"||!value.name.trim()||value.name.length>100||typeof value.message!=="string"||value.message.length>1000)return json({error:"Нэр, сэтгэгдлээ шалгана уу."},400);
    await saveGuestResponse(value);return json({ok:true});
  }catch{return json({error:"Хариуг хадгалж чадсангүй. Дахин оролдоно уу."},503);}
}
