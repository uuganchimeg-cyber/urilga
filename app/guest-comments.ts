export type GuestComment = { id: string; message: string; createdAt: string };
export const commentsChanged = "guest-comments-changed";
export async function readComments(): Promise<GuestComment[]> {
  const response=await fetch("/api/comments",{cache:"no-store"});
  if(!response.ok)throw new Error("Сэтгэгдэл ачаалж чадсангүй.");
  return response.json();
}
export async function saveResponse(id:string,name:string,message:string){
  const response=await fetch("/api/responses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,name,message})});
  const result=await response.json();if(!response.ok)throw new Error(result.error||"Хариу илгээж чадсангүй.");
  window.dispatchEvent(new Event(commentsChanged));
}
