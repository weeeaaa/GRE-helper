// Personal Cloudflare deployment only; the local Sites preview is unchanged.
const cache = new Map();
const bytes = value => Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
const decode = value => JSON.parse(new TextDecoder().decode(bytes(value)));
export async function verifiedOwner(request, env, fetchKeys = fetch) {
  const domain=env.ACCESS_TEAM_DOMAIN, aud=env.ACCESS_AUD, owner=env.OWNER_EMAIL;
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(domain??'') || !aud || !owner || !env.DATA_USER_ID) throw Error('CONFIG');
  const token=request.headers.get('cf-access-jwt-assertion');
  if(!token || token.length>20000) throw Error('AUTH');
  const parts=token.split('.'); if(parts.length!==3) throw Error('AUTH');
  const header=decode(parts[0]), claim=decode(parts[1]);
  const now=Math.floor(Date.now()/1000), issuer='https://'+domain;
  if(header.alg!=='RS256' || typeof header.kid!=='string' || claim.iss!==issuer ||
    !Array.isArray(claim.aud) || !claim.aud.includes(aud) ||
    !Number.isFinite(claim.exp) || claim.exp<=now ||
    (claim.nbf!==undefined && (!Number.isFinite(claim.nbf)||claim.nbf>now)) ||
    !claim.sub || typeof claim.email!=='string' || claim.email.toLowerCase()!==owner.toLowerCase()) throw Error('AUTH');
  let record=cache.get(domain);
  if(!record || record.until<Date.now()) {
    const response=await fetchKeys(issuer+'/cdn-cgi/access/certs',{redirect:'error'});
    if(!response.ok) throw Error('KEYS');
    const body=await response.json(); if(!Array.isArray(body.keys)) throw Error('KEYS');
    record={keys:body.keys,until:Date.now()+300000};cache.set(domain,record);
  }
  const jwk=record.keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
  if(!jwk) {cache.delete(domain);throw Error('AUTH');}
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]))) throw Error('AUTH');
  return env.DATA_USER_ID;
}

export function protect(handler) {
  return {async fetch(request,env,ctx) {
    let user;
    try {
      if(env.ACCESS_MODE==='public-shared') {
        if(!/^[A-Za-z0-9_-]{1,100}$/.test(env.DATA_USER_ID??'')) throw Error('CONFIG');
        user=env.DATA_USER_ID;
      } else user=await verifiedOwner(request,env);
    } catch(e) {
      return new Response(e.message==='CONFIG'?'網站尚未完成 Cloudflare Access 設定。':'請先透過 Cloudflare Access 使用網站擁有者帳號登入。',
        {status:e.message==='CONFIG'?503:401,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
    }
    const url=new URL(request.url);
    if(!['GET','HEAD','OPTIONS'].includes(request.method) && request.headers.get('origin') && request.headers.get('origin')!==url.origin)
      return new Response('Forbidden',{status:403});
    if(url.pathname==='/signin-with-chatgpt') return Response.redirect(url.origin+'/',302);
    if(url.pathname==='/signout-with-chatgpt') return Response.redirect(url.origin+(env.ACCESS_MODE==='public-shared'?'/':'/cdn-cgi/access/logout'),302);
    const headers=new Headers(request.headers);
    for(const name of [...headers.keys()]) if(name.startsWith('oai-authenticated-user-')) headers.delete(name);
    headers.set('oai-authenticated-user-id',user);
    if(env.ACCESS_MODE!=='public-shared') headers.set('oai-authenticated-user-email',env.OWNER_EMAIL);
    const authenticated=new Request(request,{headers});
    // Assets follow the selected access mode, including question images and PDFs.
    if(['GET','HEAD'].includes(request.method) && env.ASSETS) {
      const asset=await env.ASSETS.fetch(authenticated);
      if(asset.status!==404) return asset;
    }
    return handler.fetch(authenticated,env,ctx);
  }};
}
