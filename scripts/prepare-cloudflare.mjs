import {readFile,writeFile,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function validateConfig(c) {
  if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(c.name??'')) throw Error('Invalid Worker name');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c.database_id??'') || /^0{8}-/.test(c.database_id)) throw Error('Fill the real D1 database_id');
  for(const key of ['database_name','bucket_name']) if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(c[key]??'')) throw Error('Invalid '+key);
  if(!['private','public-shared',undefined].includes(c.access_mode)) throw Error('Invalid access mode');
  if(c.access_mode!=='public-shared') {
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(c.access_team_domain??'') || c.access_team_domain.includes('YOUR')) throw Error('Fill Access team domain');
  if(!/^[a-f0-9]{64}$/i.test(c.access_aud??'')) throw Error('Fill Access application AUD');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.owner_email??'') || c.owner_email.endsWith('@example.com')) throw Error('Fill owner email');
  }
  if(!/^[A-Za-z0-9_-]{1,100}$/.test(c.data_user_id??'')) throw Error('Invalid data user ID');
}
export async function prepare(root) {
  const c=JSON.parse(await readFile(path.join(root,'cloudflare.config.json'),'utf8'));validateConfig(c);
  const built=JSON.parse(await readFile(path.join(root,'dist/server/wrangler.json'),'utf8'));
  if(built.main!=='index.js') throw Error('Unexpected framework output; inspect before deploying');
  await copyFile(path.join(root,'deploy/access.mjs'),path.join(root,'dist/server/access.mjs'));
  await writeFile(path.join(root,'dist/server/cloudflare-entry.mjs'),"import handler from './index.js';\nimport {protect} from './access.mjs';\nexport default protect(handler);\n");
  const config={name:c.name,...(c.account_id?{account_id:c.account_id}:{}),main:'cloudflare-entry.mjs',compatibility_date:built.compatibility_date,
    compatibility_flags:built.compatibility_flags,workers_dev:true,preview_urls:false,no_bundle:true,find_additional_modules:true,
    rules:[{type:'ESModule',globs:['**/*.js','**/*.mjs']}],
    assets:{directory:'../client',binding:'ASSETS',run_worker_first:true},
    d1_databases:[{binding:'DB',database_name:c.database_name,database_id:c.database_id,migrations_dir:'../../drizzle'}],
    r2_buckets:[{binding:'BUCKET',bucket_name:c.bucket_name}],
    vars:{ACCESS_MODE:c.access_mode??'private',DATA_USER_ID:c.data_user_id,...(c.access_mode==='public-shared'?{}:{ACCESS_TEAM_DOMAIN:c.access_team_domain,ACCESS_AUD:c.access_aud,OWNER_EMAIL:c.owner_email})},
    observability:{enabled:false}};
  await writeFile(path.join(root,'dist/server/wrangler.cloudflare.json'),JSON.stringify(config,null,2)+'\n');
  console.log('Prepared '+(c.access_mode??'private')+' Cloudflare deployment; nothing uploaded.');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))
  await prepare(path.resolve(fileURLToPath(new URL('..',import.meta.url))));
