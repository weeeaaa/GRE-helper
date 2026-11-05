import {identity,sameOrigin,list,save,history,failure} from '../../../lib/store';
export async function GET(req:Request){try{const user=identity(req),id=new URL(req.url).searchParams.get('history');return Response.json(id?await history(user,id):await list(user));}catch(e){return failure(e);}}
export async function PUT(req:Request){try{sameOrigin(req);const user=identity(req);return Response.json(await save(user,await req.json()));}catch(e){return failure(e);}}
