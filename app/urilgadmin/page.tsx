"use client";
import Image from "next/image";
import { useCallback,useEffect,useRef,useState,type ReactNode } from "react";
import { defaultSettings,type GuestResponse,type SettingsDocument,type SiteSettings } from "../lib/site-settings";
import "./admin.css";
const styles = {
  mobileLogout: "ua-mobileLogout",
  acceptedBadge: "ua-acceptedBadge",
  activeTab: "ua-activeTab",
  admin: "ua-admin",
  audio: "ua-audio",
  brand: "ua-brand",
  card: "ua-card",
  cardHeading: "ua-cardHeading",
  check: "ua-check",
  commentCell: "ua-commentCell",
  content: "ua-content",
  contentFooter: "ua-contentFooter",
  dateCell: "ua-dateCell",
  editorColumn: "ua-editorColumn",
  empty: "ua-empty",
  error: "ua-error",
  field: "ua-field",
  fieldRow: "ua-fieldRow",
  fields: "ua-fields",
  galleryTop: "ua-galleryTop",
  imagePreview: "ua-imagePreview",
  loginCard: "ua-loginCard",
  loginDescription: "ua-loginDescription",
  loginFoot: "ua-loginFoot",
  loginLogo: "ua-loginLogo",
  loginPage: "ua-loginPage",
  messagePreview: "ua-messagePreview",
  muted: "ua-muted",
  navIcon: "ua-navIcon",
  navLabel: "ua-navLabel",
  overline: "ua-overline",
  pageHeading: "ua-pageHeading",
  photoActions: "ua-photoActions",
  photoBody: "ua-photoBody",
  photoCard: "ua-photoCard",
  photoGrid: "ua-photoGrid",
  photoImage: "ua-photoImage",
  portrait: "ua-portrait",
  primary: "ua-primary",
  remove: "ua-remove",
  responseToolbar: "ua-responseToolbar",
  saveState: "ua-saveState",
  secondary: "ua-secondary",
  sidebar: "ua-sidebar",
  sidebarBottom: "ua-sidebarBottom",
  stack: "ua-stack",
  stats: "ua-stats",
  statSmall: "ua-statSmall",
  success: "ua-success",
  tableWrap: "ua-tableWrap",
  topbar: "ua-topbar",
  twoColumn: "ua-twoColumn",
  unsaved: "ua-unsaved",
  upload: "ua-upload",
  uploadIcon: "ua-uploadIcon",
  uploading: "ua-uploading",
  workspace: "ua-workspace",
};
type Tab="home"|"invitation"|"accepted"|"gallery"|"location"|"responses";
const tabs:{id:Tab;label:string;icon:string;subtitle:string}[]=[
{id:"home",label:"Нүүр хуудас",icon:"◈",subtitle:"Анхны сэтгэгдлийг онцгой болгоорой."},
{id:"invitation",label:"Урилгын үгс",icon:"✉",subtitle:"Найзууддаа хүргэх үгээ өөрийнхөөрөө."},
{id:"accepted",label:"Хүлээн авсан үе",icon:"♡",subtitle:"Хариу илгээсний дараах бяцхан баяр."},
{id:"gallery",label:"Дурсамжийн цомог",icon:"▧",subtitle:"Хамтдаа бүтээсэн мөчүүдээ хадгалаарай."},
{id:"location",label:"Байршил, холбоос",icon:"⌖",subtitle:"Хаана уулзах, хэрхэн холбогдох мэдээлэл."},
{id:"responses",label:"Ирц, сэтгэгдэл",icon:"☷",subtitle:"Найзуудын тань илгээсэн хариунууд."}];
async function api<T>(url:string,init?:RequestInit):Promise<T>{const response=await fetch(url,{...init,cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Хүсэлт амжилтгүй боллоо.");return data;}
function Field({label,value,onChange,hint,multiline=false,type="text",required=false}:{label:string;value:string;onChange:(value:string)=>void;hint?:string;multiline?:boolean;type?:string;required?:boolean}){return <label className={styles.field}><span>{label}{required&&<b> *</b>}</span>{multiline?<textarea rows={4} value={value} onChange={e=>onChange(e.target.value)} maxLength={10000} required={required}/>:<input type={type} value={value} onChange={e=>onChange(e.target.value)} required={required}/>}{hint&&<small>{hint}</small>}</label>;}
function Card({title,description,children}:{title:string;description?:string;children:ReactNode}){return <section className={styles.card}><div className={styles.cardHeading}><h2>{title}</h2>{description&&<p>{description}</p>}</div>{children}</section>;}
function FilePicker({ label, kind, onFiles, setBusy, onError, multiple = false, capacity }: {
  label: string;
  kind: "image" | "audio";
  onFiles: (files: { url: string; name: string }[]) => void;
  setBusy: (change: number) => void;
  onError: (message: string) => void;
  multiple?: boolean;
  capacity?: number;
}) {
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const uploading = progress !== null;
  return <label className={`${styles.upload} ${uploading ? styles.uploading : ""}`}>
    <span className={styles.uploadIcon}>↑</span>
    <span>
      <strong aria-live="polite">{progress ? `Байршуулж байна… ${progress.completed}/${progress.total}` : label}</strong>
      <small>{kind === "audio" ? "MP3" : "JPG, PNG, WEBP, GIF"} · Файл бүр 25MB хүртэл</small>
    </span>
    <input type="file" accept={kind === "audio" ? "audio/mpeg,.mp3" : "image/jpeg,image/png,image/webp,image/gif"}
      multiple={multiple} disabled={uploading || capacity === 0} onChange={async event => {
        const files = Array.from(event.currentTarget.files ?? []);
        event.currentTarget.value = "";
        if (!files.length) return;
        onError("");
        if (capacity !== undefined && files.length > capacity) {
          onError(`Цомогт нэмж ${capacity} хүртэл зураг оруулж болно. Сонголтоо багасгана уу.`);
          return;
        }
        setProgress({ completed: 0, total: files.length });
        setBusy(1);
        const uploaded: ({ url: string; name: string } | undefined)[] = [];
        const failures: string[] = [];
        let nextIndex = 0;
        async function uploadNext() {
          while (nextIndex < files.length) {
            const index = nextIndex++;
            const file = files[index];
            try {
              if (file.size > 25 * 1024 * 1024) throw new Error("25MB-аас их хэмжээтэй");
              const form = new FormData();
              form.set("file", file);
              form.set("kind", kind);
              uploaded[index] = await api<{ url: string; name: string }>("/api/admin/upload", { method: "POST", body: form });
            } catch (error) {
              failures.push(`${file.name} (${error instanceof Error ? error.message : "байршуулж чадсангүй"})`);
            } finally {
              setProgress(previous => previous && { ...previous, completed: previous.completed + 1 });
            }
          }
        }
        try {
          await Promise.all(Array.from({ length: Math.min(files.length, 3) }, uploadNext));
          const successful = uploaded.filter(file => file !== undefined);
          if (successful.length) onFiles(successful);
          if (failures.length) onError(`Оруулж чадсангүй (${failures.length}). ${failures.join(" · ")}`);
        } finally {
          setProgress(null);
          setBusy(-1);
        }
      }} />
  </label>;
}
function ImagePreview({src,label,portrait=false}:{src:string;label:string;portrait?:boolean}){return <div className={`${styles.imagePreview} ${portrait?styles.portrait:""}`}><Image src={src} alt={label} fill sizes="400px" unoptimized/></div>;}
export default function AdminPage(){
const [session,setSession]=useState<{configured:boolean;authenticated:boolean}|null>(null);
const [authBusy,setAuthBusy]=useState(false),[password,setPassword]=useState(""),[confirmation,setConfirmation]=useState("");
const [tab,setTab]=useState<Tab>("home"),[document,setDocument]=useState<SettingsDocument|null>(null),[draft,setDraft]=useState<SiteSettings>(defaultSettings);
const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[uploads,setUploads]=useState(0),[error,setError]=useState(""),[notice,setNotice]=useState("");
const [saveProgress, setSaveProgress] = useState<number | null>(null);
const [responses,setResponses]=useState<GuestResponse[]>([]),[responsesLoading,setResponsesLoading]=useState(false),[search,setSearch]=useState("");
const contentRef=useRef<HTMLDivElement>(null);
const dirty=!!document&&JSON.stringify(document.settings)!==JSON.stringify(draft);
const busy=(change:number)=>setUploads(v=>v+change);
const loadSession=useCallback(async()=>{try{setSession(await api("/api/admin/session"));}catch(e){setError((e as Error).message);}},[]);
const loadSettings=useCallback(async()=>{setLoading(true);try{const next=await api<SettingsDocument>("/api/settings");setDocument(next);setDraft(next.settings);}catch(e){setError((e as Error).message);}finally{setLoading(false);}},[]);
const loadResponses=useCallback(async()=>{setResponsesLoading(true);try{setResponses(await api<GuestResponse[]>("/api/admin/responses"));}catch(e){setError((e as Error).message);}finally{setResponsesLoading(false);}},[]);
useEffect(()=>{void loadSession();},[loadSession]);
useEffect(()=>{if(session?.authenticated){void loadSettings();void loadResponses();}},[session?.authenticated,loadSettings,loadResponses]);
useEffect(()=>{if(!session?.authenticated)return;const timer=setInterval(()=>{if(!window.document.hidden)void loadResponses();},15000);return()=>clearInterval(timer);},[session?.authenticated,loadResponses]);
useEffect(()=>{if(!dirty)return;const before=(e:BeforeUnloadEvent)=>e.preventDefault();window.addEventListener("beforeunload",before);return()=>window.removeEventListener("beforeunload",before);},[dirty]);
const update=<K extends keyof SiteSettings>(key:K,value:SiteSettings[K])=>{setDraft(old=>({...old,[key]:value}));setNotice("");};
const updateInvitation=(key:keyof SiteSettings["invitation"],value:string)=>setDraft(old=>({...old,invitation:{...old.invitation,[key]:value}}));
const updateAccepted=(key:keyof SiteSettings["accepted"],value:string)=>setDraft(old=>({...old,accepted:{...old.accepted,[key]:value}}));
const updateVenue=(key:keyof SiteSettings["venue"],value:string|boolean)=>setDraft(old=>({...old,venue:{...old.venue,[key]:value}}));
async function logout(){try{await api("/api/admin/session",{method:"DELETE"});setSession({configured:true,authenticated:false});setResponses([]);setDocument(null);setError("");}catch(e){setError((e as Error).message);}}
async function save() {
  if (!document || saving || uploads || !dirty) return;
  setSaving(true);
  setError("");
  setNotice("");
  setSaveProgress(0);
  // The progress estimate stops below completion until the database confirms the write.
  const timer = window.setInterval(() => {
    setSaveProgress(value => Math.min(90, (value ?? 0) + Math.max(1, Math.ceil((90 - (value ?? 0)) / 10))));
  }, 80);
  try {
    const next = await api<SettingsDocument>("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: draft, revision: document.revision }),
    });
    setDocument(next);
    setDraft(current => current === draft ? next.settings : current);
    setSaveProgress(100);
    setNotice("Өөрчлөлтүүд хадгалагдлаа. Зочдын хуудсанд шинэчлэгдэнэ.");
    window.dispatchEvent(new Event("site-settings-changed"));
  } catch (error) {
    setSaveProgress(null);
    setError((error as Error).message);
  } finally {
    window.clearInterval(timer);
    setSaving(false);
  }
}
function exportResponses(){const quote=(v:string)=>`"${(/^[=+@\-\t\r]/.test(v)?"'":"")+v.replaceAll('"','""')}"`;const csv="\uFEFF"+[["Нэр","Сэтгэгдэл","Илгээсэн огноо"],...responses.map(r=>[r.name,r.message,new Date(r.createdAt).toLocaleString("mn-MN",{timeZone:"Asia/Ulaanbaatar"})])].map(r=>r.map(quote).join(",")).join("\r\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=window.document.createElement("a");a.href=url;a.download="urilga-hariu.csv";a.click();URL.revokeObjectURL(url);}
const page=tabs.find(item=>item.id===tab)!;const uploadProps={setBusy:busy,onError:setError};
const dateValue=Number.isFinite(Date.parse(draft.birthday))?new Date(Date.parse(draft.birthday)+8*3600000).toISOString().slice(0,16):"";
const filtered=responses.filter(r=>`${r.name} ${r.message}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
if(!session?.authenticated)return <main className={styles.loginPage}><div className={styles.loginCard}><span className={styles.loginLogo}>✳</span><p className={styles.overline}>УРИЛГЫН УДИРДЛАГА</p><h1>{session?.configured?"Тавтай морил ♡":"Админ эрхээ үүсгэе"}</h1><p className={styles.loginDescription}>{session===null?"Сервертэй холбогдож байна…":session.configured?"Нууц үгээ оруулаад урилгаа удирдаарай.":"Эхний удаа өөрийн нууц үгийг үүсгэнэ. Дараагийн удаа энэ нууц үгээрээ нэвтэрнэ."}</p><form onSubmit={async e=>{e.preventDefault();if(!session)return;if(!session.configured&&password!==confirmation){setError("Хоёр нууц үг ижил байна.");return;}setAuthBusy(true);setError("");try{setSession(await api("/api/admin/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:session.configured?"login":"setup",password})}));setPassword("");setConfirmation("");}catch(e){setError((e as Error).message);}finally{setAuthBusy(false);}}}>{session&&<><Field label="Нууц үг" value={password} onChange={setPassword} type="password" required hint="Хамгийн багадаа 8 тэмдэгт"/>{!session.configured&&<Field label="Нууц үг давтах" value={confirmation} onChange={setConfirmation} type="password" required/>}<button className={styles.primary} disabled={authBusy||password.length<8}>{authBusy?"Түр хүлээнэ үү…":session.configured?"Нэвтрэх →":"Нууц үг үүсгэж нэвтрэх →"}</button></>}</form>{error&&<p className={styles.error} role="alert">{error}</p>}{!session&&error&&<button onClick={()=>void loadSession()}>Дахин оролдох</button>}<span className={styles.loginFoot}>Зөвхөн урилгын эзэнд зориулав</span></div></main>;
return <main className={styles.admin}><aside className={styles.sidebar}><div className={styles.brand}><span>✳</span><div>урилга<small>УДИРДЛАГЫН ХЭСЭГ</small></div></div><p className={styles.navLabel}>ТАНЫ УРИЛГА</p><nav aria-label="Админ цэс">{tabs.map(item=><button key={item.id} aria-current={tab===item.id ? "page" : undefined} className={tab===item.id?styles.activeTab:""} onClick={()=>{setTab(item.id);setError("");setNotice("");contentRef.current?.scrollTo({top:0});}}><span className={styles.navIcon}>{item.icon}</span>{item.label}{item.id==="responses"&&<b>{responses.length}</b>}</button>)}</nav><div className={styles.sidebarBottom}><p>Жижиг өөрчлөлт.<br/><em>Онцгой дурсамж.</em></p><a href="/" target="_blank" rel="noopener noreferrer">Сайтыг харах ↗</a><button onClick={()=>void logout()}>Гарах</button></div></aside>
<div className={styles.workspace}><header className={styles.topbar}><span>Миний төрсөн өдрийн урилга</span><div><span className={`${styles.saveState} ${dirty?styles.unsaved:""}`}>{uploads?"Файл байршуулж байна…":dirty?"Хадгалаагүй өөрчлөлттэй":"Бүх зүйл шинэчлэгдсэн"}</span>{tab!=="responses"&&<button type="button" className={styles.primary} onClick={()=>void save()} disabled={!document||!dirty||saving||uploads>0}>{saving?"Хадгалж байна…":"Өөрчлөлт хадгалах"}</button>}<button type="button" className={styles.mobileLogout} onClick={()=>void logout()}>Гарах</button></div></header>
{saveProgress !== null && (!dirty || saving) && <div className="ua-saveProgress" role="status">
  <div className="ua-progressLabel"><span>{saveProgress === 100 ? "Хадгалсан" : "Хадгалж байна…"}</span><strong>{saveProgress}%</strong></div>
  <progress aria-label="Хадгалалтын явц" max={100} value={saveProgress} />
</div>}
<div className={styles.content} ref={contentRef}>{tab !== "home" && <div className={styles.pageHeading}><h1>{page.label}</h1><p>{page.subtitle}</p></div>}{error&&<div className={styles.error} role="alert">{error}</div>}{notice&&<div className={styles.success} role="status">✓ {notice}</div>}
{loading?<div className={styles.empty}>Тохиргоог ачаалж байна…</div>:!document?<div className={styles.empty}><p>Тохиргоог ачаалж чадсангүй.</p><button onClick={()=>void loadSettings()}>Дахин ачаалах</button></div>:<>
{tab==="home"&&<><div className={styles.stats}><div><span>ТӨРСӨН ӨДӨР</span><strong>{dateValue.slice(0,10).replaceAll("-",".")}</strong><small>Улаанбаатарын цагаар</small></div><div><span>ИРЭХ ЗОЧИД</span><strong>{responses.length}<em> хүн</em></strong><small>Урилга хүлээн авсан</small></div><div><span>ДУРСАМЖУУД</span><strong>{draft.gallery.photos.length}<em> зураг</em></strong><small>Зургийн цомогт</small></div></div><div className={styles.twoColumn}><Card title="Нүүр хуудасны зураг" description="Сайтад ороход бүтэн дэлгэцээр харагдах зураг."><ImagePreview src={draft.heroImage} label="Нүүр зураг" portrait/><FilePicker label="Зургийг солих" kind="image" onFiles={f=>update("heroImage",f[0].url)} {...uploadProps}/></Card><div className={styles.stack}><Card title="Төрсөн өдрийн огноо" description="Тоолуур энд оруулсан огноо, цаг хүртэл тоолно."><Field label="Огноо, цаг" type="datetime-local" value={dateValue} onChange={v=>update("birthday",v?`${v}:00+08:00`:"")} required hint="Улаанбаатарын цаг · UTC+08:00"/></Card><Card title="Сайтын дуу" description="Бүх хуудсанд үргэлжлэн тоглоно."><audio className={styles.audio} src={draft.music} controls preload="none"/><FilePicker label="Дуу оруулах" kind="audio" onFiles={f=>update("music",f[0].url)} {...uploadProps}/></Card></div></div></>}
{tab==="invitation"&&<div className={styles.editorColumn}><Card title="Найзууддаа хүргэх үгс" description="Текстийн дараалал, урилгын одоогийн загвар хэвээр хадгалагдана."><div className={styles.fields}><Field label="Жижиг гарчиг" value={draft.invitation.eyebrow} onChange={v=>updateInvitation("eyebrow",v)}/><Field label="Үндсэн гарчиг" value={draft.invitation.title} onChange={v=>updateInvitation("title",v)} required/><Field label="Урилгын үгс" multiline value={draft.invitation.body} onChange={v=>updateInvitation("body",v)} required/><Field label="Төгсгөлийн үгс" multiline value={draft.invitation.closing} onChange={v=>updateInvitation("closing",v)}/></div></Card></div>}
{tab==="accepted"&&<div className={styles.twoColumn}><Card title="Хүлээн авсны дараах зураг" description="GIF оруулбал хөдөлгөөнтэй харагдана."><ImagePreview src={draft.accepted.image} label="Талархлын GIF"/><FilePicker label="GIF эсвэл зураг солих" kind="image" onFiles={f=>updateAccepted("image",f[0].url)} {...uploadProps}/></Card><Card title="Талархлын зурвас" description="Зочин хариугаа илгээсний дараа GIF-ийн доор гарна."><div className={styles.fields}><Field label="Талархлын текст" multiline value={draft.accepted.message} onChange={v=>updateAccepted("message",v)}/><Field label="Emoji" value={draft.accepted.emojis} onChange={v=>updateAccepted("emojis",v)}/><div className={styles.messagePreview}><p>{draft.accepted.message}</p><span>{draft.accepted.emojis}</span></div></div></Card></div>}
{tab==="gallery"&&<><Card title="Дурсамжийн зургийн цомог" description="Олон зураг зэрэг сонгож болно. Нэмсэн зургууд цомогт автоматаар солигдоно."><div className={styles.galleryTop}><FilePicker label="Олон зураг сонгох" kind="image" multiple capacity={Math.max(0, 200 - draft.gallery.photos.length)} onFiles={files=>setDraft(old=>({...old,gallery:{...old.gallery,photos:[...old.gallery.photos,...files.map(f=>({src:f.url,alt:f.name.replace(/\.[^.]+$/,"")}))]}}))} {...uploadProps}/><Field label="Солигдох хугацаа (секунд)" type="number" value={String(draft.gallery.intervalMs/1000)} onChange={v=>setDraft(old=>({...old,gallery:{...old.gallery,intervalMs:Number(v)*1000}}))} hint="1–30 секунд"/></div><p className={styles.muted}>{draft.gallery.photos.length} / 200 зураг · Сумнуудаар дарааллыг солино.</p></Card><div className={styles.photoGrid}>{draft.gallery.photos.map((photo,index)=><section key={photo.src+index} className={styles.photoCard}><div className={styles.photoImage}><Image src={photo.src} alt={photo.alt} fill sizes="240px" unoptimized/><span>{String(index+1).padStart(2,"0")}</span></div><div className={styles.photoBody}><Field label="Зургийн тайлбар" value={photo.alt} onChange={v=>setDraft(old=>({...old,gallery:{...old.gallery,photos:old.gallery.photos.map((item,i)=>i===index?{...item,alt:v}:item)}}))}/><div className={styles.photoActions}><button aria-label={`${index+1}-р зургийг урагшлуулах`} disabled={index===0} onClick={()=>setDraft(old=>{const photos=[...old.gallery.photos];[photos[index-1],photos[index]]=[photos[index],photos[index-1]];return{...old,gallery:{...old.gallery,photos}};})}>←</button><button aria-label={`${index+1}-р зургийг хойшлуулах`} disabled={index===draft.gallery.photos.length-1} onClick={()=>setDraft(old=>{const photos=[...old.gallery.photos];[photos[index+1],photos[index]]=[photos[index],photos[index+1]];return{...old,gallery:{...old.gallery,photos}};})}>→</button><button className={styles.remove} disabled={draft.gallery.photos.length===1} onClick={()=>setDraft(old=>({...old,gallery:{...old.gallery,photos:old.gallery.photos.filter((_,i)=>i!==index)}}))}>Хасах</button></div></div></section>)}</div></>}
{tab==="location"&&<div className={styles.stack}><Card title="Газрын мэдээлэл" description="Баяр болох газар болон дэлгэрэнгүй хаяг."><div className={styles.fields}><div className={styles.fieldRow}><Field label="Газрын нэр" value={draft.venue.name} onChange={v=>updateVenue("name",v)}/><Field label="Дэлгэрэнгүй хаяг" value={draft.venue.address} onChange={v=>updateVenue("address",v)}/></div><Field label="Нэмэлт тайлбар" multiline value={draft.venue.description} onChange={v=>updateVenue("description",v)}/></div></Card><Card title="Google Maps" description="Хайх хаяг эсвэл координат оруулна. Яг байршлын embed холбоос байвал нэмэлтээр оруулж болно."><div className={styles.fields}><Field label="Maps дээр хайх хаяг / координат" value={draft.venue.mapQuery} onChange={v=>updateVenue("mapQuery",v)} hint="Жишээ: амралтын газрын нэр эсвэл 47.1234, 106.1234"/><Field label="Газрын зураг суулгах холбоос (заавал биш)" value={draft.venue.mapEmbedUrl} onChange={v=>updateVenue("mapEmbedUrl",v.match(/src=["']([^"']+)["']/)?.[1]||v)} hint="Google Maps → Share → Embed a map → iframe-ийн src холбоос"/><Field label="Google Maps нээх холбоос (заавал биш)" value={draft.venue.mapLink} onChange={v=>updateVenue("mapLink",v)} hint="Google Maps-ийн хуваалцах холбоос"/><label className={styles.check}><input type="checkbox" checked={draft.venue.exactLocation} onChange={e=>updateVenue("exactLocation",e.target.checked)}/> Газрын зурагт яг байршлыг оруулсан</label></div></Card><Card title="Холбогдох мэдээлэл"><div className={styles.fields}><div className={styles.fieldRow}><Field label="Холбогдох хүний нэр" value={draft.venue.contactName} onChange={v=>updateVenue("contactName",v)}/><Field label="Утасны дугаар" type="tel" value={draft.venue.phone} onChange={v=>updateVenue("phone",v)}/></div><div className={styles.fieldRow}><Field label="Facebook" value={draft.venue.facebook} onChange={v=>updateVenue("facebook",v)} hint="Хэрэглэгчийн нэр эсвэл https://facebook.com/…"/><Field label="Instagram" value={draft.venue.instagram} onChange={v=>updateVenue("instagram",v)} hint="Хэрэглэгчийн нэр эсвэл https://instagram.com/…"/></div></div></Card></div>}
{tab==="responses"&&<><div className={styles.stats}><div><span>УРИЛГА ХҮЛЭЭН АВСАН</span><strong>{responses.length}<em> хүн</em></strong></div><div><span>СЭТГЭГДЭЛ ҮЛДЭЭСЭН</span><strong>{responses.filter(r=>r.message).length}<em> хүн</em></strong></div><div><span>ШИНЭЧЛЭЛТ</span><strong className={styles.statSmall}>15 секунд</strong><small>Автоматаар шинэчлэгдэнэ</small></div></div><Card title="Зочдын хариу" description="Нэр болон сэтгэгдэл серверт хадгалагдана. Сэтгэгдэлгүй хариу ч энд харагдана."><div className={styles.responseToolbar}><input aria-label="Нэр, сэтгэгдлээр хайх" placeholder="Нэр, сэтгэгдлээр хайх…" value={search} onChange={e=>setSearch(e.target.value)}/><button className={styles.secondary} onClick={()=>void loadResponses()} disabled={responsesLoading}>{responsesLoading?"Ачаалж байна…":"Шинэчлэх"}</button><button className={styles.secondary} onClick={exportResponses} disabled={!responses.length}>CSV татах ↓</button></div>{filtered.length?<div className={styles.tableWrap}><table><thead><tr><th>Зочин</th><th>Сэтгэгдэл</th><th>Илгээсэн огноо</th></tr></thead><tbody>{filtered.map(r=><tr key={r.id}><td><strong>{r.name}</strong><span className={styles.acceptedBadge}>✓ Хүлээн авсан</span></td><td className={styles.commentCell}>{r.message||<span className={styles.muted}>Сэтгэгдэл бичээгүй</span>}</td><td className={styles.dateCell}>{new Date(r.createdAt).toLocaleString("mn-MN",{timeZone:"Asia/Ulaanbaatar"})}</td></tr>)}</tbody></table></div>:<div className={styles.empty}><span>♡</span><h3>{search?"Илэрц олдсонгүй":"Хариунууд энд цугларна"}</h3><p>{search?"Хайлтын үгээ өөрчилж үзээрэй.":"Зочин урилгаа хүлээн авахад нэр, сэтгэгдэл нь энд гарна."}</p></div>}</Card></>}
</>}
<p className={styles.contentFooter}>{document?.updatedAt?`Сүүлд хадгалсан: ${new Date(document.updatedAt).toLocaleString("mn-MN",{timeZone:"Asia/Ulaanbaatar"})}`:"Өөрчлөлтөө хадгалж урилгаа шинэчлээрэй."}</p></div></div></main>;
}






