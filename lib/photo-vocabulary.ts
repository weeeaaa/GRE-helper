import {normalize,type VocabGroup} from './vocab-model';
// Append reviewed additions once by source ID; never replace saved wording.
export function withPhotoVocabulary(groups:VocabGroup[],additions:VocabGroup[]){
 const result=structuredClone(groups);
 const known=new Set(result.flatMap(g=>g.entries.map(e=>(e as any).sourceId).filter(Boolean)));
 for(const group of additions){
  const entries=group.entries.filter(e=>!known.has((e as any).sourceId));
  if(!entries.length)continue;
  const exact=result.find(g=>g.id===group.id||(g.kind===group.kind&&normalize(g.title)===normalize(group.title)&&normalize(g.major)===normalize(group.major)));
  if(exact)exact.entries.push(...entries);else result.push({...group,entries});
  entries.forEach(e=>known.add((e as any).sourceId));
 }
 return result;
}
