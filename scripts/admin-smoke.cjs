// Run: node scripts/admin-smoke.cjs. Uses an isolated temporary data directory.
const fs=require('node:fs');
const fsp=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const ts=require('typescript');

(async()=>{
  const temporary=await fsp.mkdtemp(path.join(os.tmpdir(),'urilga-admin-test-'));
  process.env.URILGA_DATA_DIR=temporary;
  process.env.URILGA_STORAGE_DRIVER="local";
  const project=path.resolve(__dirname,'..');
  require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
  const {NextRequest}=require('next/server');
  const session=require('../app/api/admin/session/route.ts');
  const settings=require('../app/api/settings/route.ts');
  const responses=require('../app/api/responses/route.ts');
  const privateResponses=require('../app/api/admin/responses/route.ts');
  const comments=require('../app/api/comments/route.ts');
  const upload=require('../app/api/admin/upload/route.ts');
  const media=require('../app/api/media/[filename]/route.ts');
  let cookie='';
  const request=(url,method='GET',body,auth=false,extra={})=>new NextRequest(`http://localhost:3000${url}`,{method,headers:{...(body instanceof FormData?{}:body?{'content-type':'application/json'}:{}),...(auth?{cookie}:{}),...extra},...(body?{body:body instanceof FormData?body:JSON.stringify(body)}:{})});
  try{
    assert.equal((await settings.GET(request('/api/settings'))).status,200);
    assert.equal((await settings.PUT(request('/api/settings','PUT',{}))).status,401);
    assert.equal((await privateResponses.GET(request('/api/admin/responses'))).status,401);
    const password=crypto.randomBytes(18).toString('hex');
    let result=await session.POST(request('/api/admin/session','POST',{action:'setup',password}));
    assert.equal(result.status,200);cookie=result.headers.get('set-cookie').split(';')[0];
    assert.equal((await session.GET(request('/api/admin/session','GET',null,true))).status,200);
    assert.equal((await (await session.GET(request('/api/admin/session','GET',null,true))).json()).authenticated,true);
    assert.equal(fs.readFileSync(path.join(temporary,'admin.json'),'utf8').includes(password),false);
    assert.equal((await session.POST(request('/api/admin/session','POST',{action:'login',password:'incorrect-password'}))).status,401);
    assert.equal((await session.POST(request('/api/admin/session','POST',{action:'login',password}))).status,200);
    const current=await (await settings.GET(request('/api/settings'))).json();
    const changed=structuredClone(current.settings);changed.invitation.title='Шинэ урилгын гарчиг';changed.birthday='2026-12-03T18:30:00+08:00';changed.venue.phone='60108953';
    result=await settings.PUT(request('/api/settings','PUT',{settings:changed,revision:current.revision},true));assert.equal(result.status,200);const saved=await result.json();
    assert.equal(saved.revision,1);assert.equal(saved.settings.invitation.title,'Шинэ урилгын гарчиг');
    assert.equal((await settings.PUT(request('/api/settings','PUT',{settings:changed,revision:0},true))).status,409);
    const unsafe=structuredClone(changed);unsafe.venue.mapEmbedUrl='javascript:alert(1)';
    assert.equal((await settings.PUT(request('/api/settings','PUT',{settings:unsafe,revision:1},true))).status,400);
    assert.equal((await settings.PUT(request('/api/settings','PUT',{settings:changed,revision:1},true,{origin:'https://untrusted.example'}))).status,403);
    const row={id:crypto.randomUUID(),name:'Туршилтын зочин',message:'Төрсөн өдрийн мэнд!'};
    assert.equal((await responses.POST(request('/api/responses','POST',row))).status,200);
    assert.equal((await responses.POST(request('/api/responses','POST',row))).status,200);
    assert.equal((await responses.POST(request('/api/responses','POST',{...row,message:'Шинэчилсэн сэтгэгдэл'}))).status,200);
    assert.equal((await responses.POST(request('/api/responses','POST',{...row,id:crypto.randomUUID(),name:'Нэртэй зочин',message:''}))).status,200);
    assert.equal((await responses.POST(request('/api/responses','POST',{...row,name:'   '}))).status,400);
    const privateRows=await (await privateResponses.GET(request('/api/admin/responses','GET',null,true))).json();
    assert.equal(privateRows.length,3);assert.ok(privateRows.some(item=>item.id===row.id&&item.message===row.message));assert.ok(privateRows.some(item=>item.name===row.name&&item.message==='Шинэчилсэн сэтгэгдэл'));
    const publicRows=await (await comments.GET(request('/api/comments'))).json();assert.equal(publicRows.length,2);assert.equal('name' in publicRows[0],false);
    for(const [file,kind,type] of [['public/memories/sample-1.jpg','image','image/jpeg'],['public/найз.mp3','audio','audio/mpeg'],['public/avla.gif','image','image/gif']]){
      const bytes=await fsp.readFile(path.join(project,file));const form=new FormData();form.set('kind',kind);form.set('file',new File([bytes],path.basename(file),{type}));
      result=await upload.POST(request('/api/admin/upload','POST',form,true));assert.equal(result.status,200);const uploaded=await result.json();const filename=uploaded.url.split('/').pop();
      const params={params:Promise.resolve({filename})};const full=await media.GET(request(uploaded.url),params);assert.equal(full.status,200);assert.equal(full.headers.get('content-type'),type);assert.equal((await full.arrayBuffer()).byteLength,bytes.length);
      const ranged=await media.GET(request(uploaded.url,'GET',null,false,{range:'bytes=0-99'}),params);assert.equal(ranged.status,206);assert.equal((await ranged.arrayBuffer()).byteLength,100);
    }
    const invalid=new FormData();invalid.set('kind','image');invalid.set('file',new File(['<script>bad</script>'],'bad.jpg',{type:'image/jpeg'}));assert.equal((await upload.POST(request('/api/admin/upload','POST',invalid,true))).status,400);
    assert.equal((await session.DELETE(request('/api/admin/session','DELETE',null,true))).headers.get('set-cookie').includes('Max-Age=0'),true);
    console.log('PASS: authentication, validation, settings persistence, revision conflict, responses, public privacy, JPG/GIF/MP3 uploads and audio range requests.');
  }finally{
    const target=path.resolve(temporary),root=path.resolve(os.tmpdir())+path.sep;
    if(!target.startsWith(root)||!path.basename(target).startsWith('urilga-admin-test-'))throw new Error('Unsafe temporary cleanup target');
    await fsp.rm(target,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});


