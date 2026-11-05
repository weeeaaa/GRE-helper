export type VocabKind='同義'|'片語'|'易混淆'|'易誤解'|'其他';
export type VocabEntry={word:string;meaning:string;note:string};
export type VocabGroup={id:string;kind:VocabKind;major:string;title:string;entries:VocabEntry[]};
export const normalize=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,'');
const families=[['欺騙','欺瞞','詐騙','蒙騙','騙人','deception','deceit'],['阻礙','阻擋','妨礙','阻撓','阻止'],['贊同','同意','認同','支持'],['批評','指責','責備','譴責'],['模糊','含糊','不清楚','曖昧'],['固執','頑固','頑強','倔強'],['傲慢','自大','高傲','驕傲'],['謙虛','謙遜','謙卑'],['短暫','暫時','轉瞬即逝'],['豐富','充足','充裕','大量'],['稀少','缺乏','不足','匱乏'],['冷漠','漠不關心','無動於衷'],['真實','真誠','誠實'],['假冒','假冒的','虛假','偽造'],['美麗','漂亮','優美'],['憤怒','生氣','惱怒'],['害怕','恐懼','畏懼']];
export function similarGroups(input:VocabGroup,groups:VocabGroup[]){
 if(input.kind!=='同義')return [];
 const key=normalize(input.title),words=new Set(input.entries.map(e=>normalize(e.word)));
 return groups.filter(g=>g.kind==='同義'&&g.id!==input.id&&normalize(g.title)!==key).map(g=>{
  const other=normalize(g.title);let score=0,reason='';
  if(families.some(f=>f.some(x=>key===normalize(x))&&f.some(x=>other===normalize(x)))){score=3;reason='類別可能意思相近';}
  if(key.length>1&&other.length>1&&(key.includes(other)||other.includes(key))){score=Math.max(score,2);reason='類別名稱相近';}
  if(g.entries.some(e=>words.has(normalize(e.word)))){score=4;reason='含有相同單字，可能屬於同一詞群';}
  const a=new Set(key),b=new Set(other),common=[...a].filter(c=>b.has(c)).length;
  if(common>=2&&common/Math.max(a.size,b.size)>=.6&&score<2){score=1;reason='名稱有相近用字，請確認語意';}
  return {group:g,score,reason};
 }).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,5);
}
export function exactGroup(input:VocabGroup,groups:VocabGroup[]){return groups.find(g=>g.id!==input.id&&g.kind===input.kind&&normalize(g.major)===normalize(input.major)&&normalize(g.title)===normalize(input.title));}
export function mergeGroup(target:VocabGroup,input:VocabGroup):VocabGroup{return {...target,entries:[...target.entries,...input.entries]};}
