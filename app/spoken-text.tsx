'use client';
import {useState} from 'react';
import Pronunciation from './pronunciation';
export function SpokenText({text}:{text:string}){
 return <>{text.split(/([A-Za-z]+(?:['’-][A-Za-z]+)*(?:[ \t]+[A-Za-z]+(?:['’-][A-Za-z]+)*)*)/g).map((part,i)=>/[A-Za-z]/.test(part)?<Pronunciation key={i} word={part} plain/>:part)}</>;
}
export default function SpokenField({value,onChange,label}:{value:string;onChange:(s:string)=>void;label:string}){
 const [editing,setEditing]=useState(false);
 return <div className="spoken-field">{editing?<><textarea autoFocus aria-label={label} value={value} onChange={e=>onChange(e.target.value)} style={{minHeight:Math.max(130,value.split('\n').length*28)}}/><button className="field-edit" onClick={()=>setEditing(false)}>完成編輯</button></>:<><div className="spoken-content"><SpokenText text={value}/></div><button className="field-edit" onClick={()=>setEditing(true)}>編輯{label}</button></>}</div>;
}
