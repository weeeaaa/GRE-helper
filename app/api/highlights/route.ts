import {env} from 'cloudflare:workers';
import {identity,sameOrigin,failure} from '../../../lib/store';
export async function GET(req:Request){try{const rows=await env.DB.prepare('SELECT data,revision FROM highlights WHERE user_id=? ORDER BY id').bind(identity(req)).all<any>();return Response.json(rows.results.map(r=>({...JSON.parse(r.data),revision:r.revision})));}catch(e){return failure(e);}}
export async function PUT(req:Request){try{sameOrigin(req);const user=identity(req),n=await req.json() as any;
if(!n||typeof n.id!=='string'||!/^H[0-9a-f-]{36}$/.test(n.id)||typeof n.title!=='string'||!n.title.trim()||n.title.length>200||typeof n.content!=='string'||!n.content.trim()||n.content.length>150000||!Number.isInteger(n.revision)||n.revision<0)throw Error('INVALID_HIGHLIGHT');
const next={id:n.id,title:n.title,content:n.content,revision:n.revision+1};
const row=await env.DB.prepare('INSERT INTO highlights(user_id,id,data,revision) SELECT ?,?,?,? WHERE ?=0 OR EXISTS(SELECT 1 FROM highlights WHERE user_id=? AND id=?) ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data,revision=excluded.revision WHERE highlights.revision=? RETURNING revision').bind(user,n.id,JSON.stringify(next),next.revision,n.revision,user,n.id,n.revision).first();
if(!row)throw Error('CONFLICT');return Response.json(next);
}catch(e){return failure(e);}}
