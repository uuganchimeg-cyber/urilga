import { allowedCloudinaryUrl } from "./cloudinary-server";
import { defaultSettings, type SiteSettings } from "./site-settings";
function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Тохиргооны бүтэц буруу байна."); return value as Record<string,unknown>; }
function text(value: unknown, name: string, max = 1000, required = false) { if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error(`${name}: утгаа шалгана уу.`); return value.trim(); }
function media(value: unknown) { const url = text(value,"Файл",500,true); if (!(url.startsWith("/") && !url.startsWith("//") && !url.includes("..")) && !allowedCloudinaryUrl(url)) throw new Error("Файлыг админ хэсгээс байршуулна уу."); return url; }
function https(value: unknown, domains: string[]) { const result=text(value,"Холбоос",2000); if(!result)return ""; let url;try{url=new URL(result);}catch{throw new Error("Холбоос https:// гэж эхэлнэ.");} if(url.protocol!=="https:" || !domains.some(domain=>url.hostname===domain || url.hostname.endsWith(`.${domain}`)))throw new Error("Холбоосын домэйн зөвшөөрөгдөөгүй.");return result; }
export function validateSettings(value: unknown): SiteSettings {
  const root=object(value), invitation=object(root.invitation), accepted=object(root.accepted), gallery=object(root.gallery), venue=object(root.venue);
  const birthday=text(root.birthday,"Огноо",50,true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\+08:00|Z)$/.test(birthday) || !Number.isFinite(Date.parse(birthday))) throw new Error("Төрсөн өдрийн огноо, цаг буруу байна.");
  if(!Array.isArray(gallery.photos)||gallery.photos.length>200)throw new Error("Цомогт 200 хүртэл зураг оруулж болно.");
  const intervalMs=Number(gallery.intervalMs); if(!Number.isInteger(intervalMs)||intervalMs<1000||intervalMs>30000)throw new Error("Зураг солигдох хугацаа 1–30 секунд байна.");
  const social=(value:unknown,site:string)=>{const result=text(value,"Сошиал холбоос",500);return result.startsWith("https://")?https(result,[`${site}.com`]):result && !/^@?[a-zA-Z0-9._-]+$/.test(result)?(()=>{throw new Error("Сошиал нэр эсвэл зөв холбоос оруулна уу.");})():result;};
  return {
    ...defaultSettings,heroImage:media(root.heroImage),birthday,music:root.music === "" ? "" : media(root.music),
    invitation:{eyebrow:text(invitation.eyebrow,"Жижиг гарчиг",200),title:text(invitation.title,"Урилгын гарчиг",500,true),body:text(invitation.body,"Урилгын үгс",10000,true),closing:text(invitation.closing,"Төгсгөлийн үгс",2000)},
    accepted:{image:media(accepted.image),message:text(accepted.message,"Талархлын үг",2000),emojis:text(accepted.emojis,"Emoji",100)},
    gallery:{photos:gallery.photos.map(value=>{const photo=object(value);return{src:media(photo.src),alt:text(photo.alt,"Зургийн тайлбар",500)};}),intervalMs},
    venue:{name:text(venue.name,"Газрын нэр",300),address:text(venue.address,"Хаяг",1000),description:text(venue.description,"Газрын тайлбар",2000),phone:text(venue.phone,"Утас",50),contactName:text(venue.contactName,"Холбогдох нэр",200),facebook:social(venue.facebook,"facebook"),instagram:social(venue.instagram,"instagram"),mapQuery:text(venue.mapQuery,"Maps хайлт",1000),exactLocation:venue.exactLocation===true,mapEmbedUrl:https(venue.mapEmbedUrl,["google.com","google.mn"]),mapLink:https(venue.mapLink,["google.com","google.mn","goo.gl"])},
  };
}


