const encoder=new TextEncoder();
export async function hash(s){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
const random=()=>[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('');
const equal=(a,b)=>{let d=a.length^b.length;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^(b.charCodeAt(i)||0);return d===0};
const validProject=p=>typeof p==='string'&&/^[a-z0-9_-]{1,80}$/.test(p);
const format=row=>row?{...row,resolved:!!row.resolved,completed:!!row.completed}:null;
async function input(request){const reader=request.body?.getReader();let chunks=[],size=0;if(reader)for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>80000){await reader.cancel();throw Error('too-large')}chunks.push(r.value)}const bytes=new Uint8Array(size);let n=0;for(const b of chunks){bytes.set(b,n);n+=b.length}return size?JSON.parse(new TextDecoder().decode(bytes)):{};}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGIN||'https://noraelf-creator.github.io';
 const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff',...(origin===allowed?{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization'}:{})};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&origin!==allowed)return reply({error:'許可されたサイトから操作してください。'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(!env.DB)return reply({error:'D1に接続できません。'},503);
 try{
  const path=url.pathname,method=request.method,now=Date.now();
  if(path==='/api/health'&&method==='GET'){await env.DB.prepare('SELECT 1 AS ok').first();return reply({api:'ok',d1:'ok',time:new Date(now).toISOString()})}
  let body={};if(['POST','PUT','DELETE'].includes(method)){if(origin!==allowed)return reply({error:'書込み元を確認できません。'},403);try{body=await input(request)}catch{return reply({error:'入力形式またはサイズを確認してください。'},400)}}
  const project=url.searchParams.get('projectId')||body.projectId||body.project_id;
  if(!validProject(project))return reply({error:'projectIdを指定してください。'},400);
  if(path==='/api/auth/unlock'&&method==='POST'){
   let key=project===(env.PROJECT_ID||'mother_president')?env.AUTHOR_EDIT_KEY:null;
   if(env.ADDITIONAL_PROJECT_KEYS){const keys=JSON.parse(env.ADDITIONAL_PROJECT_KEYS);key=keys[project]||key}
   if(!key)return reply({error:'この作品の編集キーは設定されていません。'},403);
   const bucket=await hash(project+':'+(request.headers.get('CF-Connecting-IP')||'unknown')),window=Math.floor(now/600000);
   const counter=await env.DB.prepare('INSERT INTO auth_attempts(id,window,count) VALUES(?,?,1) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count').bind(bucket,window).first();
   if(counter.count>20)return reply({error:'試行回数が多いため10分後に再試行してください。'},429);
   if(typeof body.key!=='string'||body.key.length>512||!equal(await hash(body.key),await hash(key)))return reply({error:'編集キーが正しくありません。'},403);
   const token=random(),expiresAt=now+Math.min(90,Math.max(1,Number(env.SESSION_DAYS)||30))*86400000;
   await env.DB.prepare('INSERT INTO edit_sessions(token_hash,project_id,expires_at) VALUES(?,?,?)').bind(await hash(token),project,expiresAt).run();
   await env.DB.prepare('DELETE FROM edit_sessions WHERE expires_at < ?').bind(now).run();
   await env.DB.prepare('DELETE FROM auth_attempts WHERE window < ?').bind(window-2).run();
   return reply({projectId:project,token,expiresAt});
  }
  const match=path.match(/^\/api\/(memos|todos)(?:\/([^/]+))?$/),table=match?.[1],id=match?.[2]?decodeURIComponent(match[2]):null;
  if(method==='GET'&&match){let sql='SELECT * FROM '+table+' WHERE project_id=? AND deleted_at IS NULL',args=[project];if(id&&table==='memos'){sql+=' AND page_id=?';args.push(id)}else if(id)return reply({error:'不明なURLです。'},404);sql+=' ORDER BY '+(table==='todos'?'sort_order,updated_at DESC':'updated_at DESC');const rows=await env.DB.prepare(sql).bind(...args).all();return reply({projectId:project,[table]:rows.results.map(format),syncedAt:new Date(now).toISOString()})}
  const token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
  const session=/^[a-f0-9]{64}$/.test(token)?await env.DB.prepare('SELECT * FROM edit_sessions WHERE token_hash=? AND project_id=?').bind(await hash(token),project).first():null;
  if(!session||session.expires_at<=now)return reply({error:'編集キーで解除してください。',code:'AUTH_REQUIRED'},403);
  if(path==='/api/auth/session'&&method==='GET')return reply({authenticated:true,projectId:project,expiresAt:session.expires_at});
  if(path==='/api/auth/lock'&&method==='POST'){await env.DB.prepare('DELETE FROM edit_sessions WHERE token_hash=? AND project_id=?').bind(await hash(token),project).run();return reply({ok:true})}
  if(!match||!['POST','PUT','DELETE'].includes(method))return reply({error:'不明な操作です。'},404);
  if((method==='POST'&&id)||(method!=='POST'&&!id))return reply({error:'URLを確認してください。'},400);
  const n=body.memo||body.todo||body,recordId=id||n.id||crypto.randomUUID();
  if(!/^[a-zA-Z0-9_-]{1,120}$/.test(recordId))return reply({error:'IDが不正です。'},400);
  const prior=await env.DB.prepare('SELECT * FROM '+table+' WHERE id=? AND project_id=? AND deleted_at IS NULL').bind(recordId,project).first();
  if(method!=='POST'&&!prior)return reply({error:'対象がありません。'},404);
  if(method==='POST'&&prior)return reply({error:'他端末で作成されています。',current:format(prior)},409);
  if(prior&&(!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision!==prior.revision))return reply({error:'他端末で更新されています。',current:format(prior)},409);
  const stamp=new Date(now).toISOString();
  if(method==='DELETE'){const r=await env.DB.prepare('UPDATE '+table+' SET deleted_at=?,updated_at=?,revision=revision+1 WHERE id=? AND project_id=? AND revision=?').bind(stamp,stamp,id,project,prior.revision).run();return r.meta.changes===1?reply({ok:true,softDeleted:true}):reply({error:'他端末で更新されています。'},409)}
  const limits=table==='memos'?{page_id:150,section_id:180,title:600,content:12000,character:80,card:80}:{todo_key:180,label:600};
  for(const [field,max]of Object.entries(limits))if(typeof(n[field]??'')!=='string'||(n[field]||'').length>max)return reply({error:'入力の長さ・形式を確認してください。'},400);
  if(table==='memos'?(!n.page_id||!n.section_id):(!n.todo_key||!n.label))return reply({error:'識別子を指定してください。'},400);
  if(table==='memos'&&typeof n.resolved!=='boolean'||table==='todos'&&typeof n.completed!=='boolean')return reply({error:'状態はtrue/falseで指定してください。'},400);
  if(prior&&(table==='memos'?(prior.page_id!==n.page_id||prior.section_id!==n.section_id):(prior.todo_key!==n.todo_key)))return reply({error:'既存の識別子は変更できません。'},400);
  const identity=table==='memos'?'page_id=? AND section_id=?':'todo_key=?',identityArgs=table==='memos'?[n.page_id,n.section_id]:[n.todo_key];
  if(method==='POST'){const existing=await env.DB.prepare('SELECT * FROM '+table+' WHERE project_id=? AND '+identity+' AND deleted_at IS NULL').bind(project,...identityArgs).first();if(existing)return reply({error:'他端末で作成されています。',current:format(existing)},409)}
  const fields=table==='memos'?['page_id','section_id','title','content','resolved','character','card']:['todo_key','label','completed','sort_order'];
  const values=fields.map(f=>['resolved','completed'].includes(f)?Number(n[f]):f==='sort_order'?(Number.isSafeInteger(n[f])?n[f]:0):n[f]||'');
  let result;if(prior){result=await env.DB.prepare('UPDATE '+table+' SET '+fields.map(f=>f+'=?').join(',')+',updated_at=?,revision=revision+1 WHERE id=? AND project_id=? AND revision=? AND deleted_at IS NULL').bind(...values,stamp,recordId,project,prior.revision).run()}
  else {result=await env.DB.prepare('INSERT OR IGNORE INTO '+table+'(id,project_id,'+fields.join(',')+',created_at,updated_at,revision) VALUES('+Array(fields.length+5).fill('?').join(',')+')').bind(recordId,project,...values,stamp,stamp,1).run()}
  if(result.meta.changes!==1)return reply({error:'他端末で更新されています。最新を取得してください。'},409);
  const saved=await env.DB.prepare('SELECT * FROM '+table+' WHERE id=? AND project_id=?').bind(recordId,project).first();return reply(format(saved),prior?200:201);
 }catch{return reply({error:'同期できませんでした。入力した文章を保持して再試行してください。'},503)}
}};
