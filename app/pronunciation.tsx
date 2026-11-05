 'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,Square} from 'lucide-react';
export default function Pronunciation({word,plain=false}:{word:string;plain?:boolean}){
 const [status,setStatus]=useState(''),[speaking,setSpeaking]=useState(false);const active=useRef<SpeechSynthesisUtterance|null>(null);
 useEffect(()=>()=>{if(active.current){active.current.onend=null;active.current.onerror=null;window.speechSynthesis?.cancel();}},[]);
 function speak(){const text=word.trim();if(!text)return;if(!('speechSynthesis' in window)||!('SpeechSynthesisUtterance' in window)){setStatus('此瀏覽器不支援朗讀，請使用支援語音的瀏覽器。');return;}const synth=window.speechSynthesis;if(speaking){synth.cancel();setSpeaking(false);setStatus('');return;}synth.cancel();const u=new SpeechSynthesisUtterance(text);active.current=u;const voices=synth.getVoices();u.voice=voices.find(v=>/^en[-_]US$/i.test(v.lang))??voices.find(v=>/^en[-_]/i.test(v.lang))??null;u.lang=u.voice?.lang??'en-US';u.rate=.85;u.onstart=()=>{setSpeaking(true);setStatus('');};u.onend=()=>{setSpeaking(false);active.current=null;};u.onerror=e=>{setSpeaking(false);active.current=null;if(!['canceled','interrupted'].includes(e.error))setStatus('無法播放發音，請確認裝置的英文語音與音量設定。');};setStatus('');synth.speak(u);}
 return <span className={plain?"pronunciation pronunciation-plain":"pronunciation"}><button type="button" className="pronounce-word" aria-label={(speaking?'停止朗讀 ':'朗讀 ')+word} onClick={speak} disabled={!word.trim()} title="點單字聽英文發音">{!plain&&(speaking?<Square size={14}/>:<Volume2 size={14}/>)}<span>{word.trim()||'發音'}</span></button>{status&&<small role="status">{status}</small>}</span>;
}
