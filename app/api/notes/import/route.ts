import {env} from 'cloudflare:workers';
import {identity,sameOrigin,list,validate} from '../../../../lib/store';
import {parseCorrections} from '../../../../lib/correction-import';
export async function POST(req:Request){
 try{
  sameOrigin(req);const user=identity(req);
  const text=await req.text();if(text.length>6000000)return Response.json({error:'訂正檔過大，請拆成較小批次。'},{status:413});
  const notes=parseCorrections(JSON.parse(text));notes.forEach(validate);
  const existing=await list(user),ids=new Set(existing.map(n=>n.id));
  const added=notes.filter(n=>!ids.has(n.id)),skipped=notes.length-added.length;
  const now=new Date().toISOString();
  // D1 batch is transactional. INSERT OR IGNORE also prevents concurrent imports
  // from overwriting an existing note; a reread below reports the actual count.
  let inserted=0;
  if(added.length){const results=await env.DB.batch(added.map(n=>env.DB.prepare('INSERT OR IGNORE INTO records(user_id,id,data,revision,updated_at) VALUES(?,?,?,?,?)').bind(user,n.id,JSON.stringify({...n,revision:1,updatedAt:now}),1,now)));inserted=results.reduce((sum,r)=>sum+(r.meta.changes??0),0);}
  return Response.json({notes:await list(user),imported:inserted,skipped:skipped+added.length-inserted});
 }catch(e){const message=e instanceof Error?e.message:'匯入失敗';return Response.json({error:message},{status:message==='UNAUTHENTICATED'?401:message==='FORBIDDEN'?403:400});}
}
