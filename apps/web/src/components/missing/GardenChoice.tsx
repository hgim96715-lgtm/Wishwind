"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LuCheck, LuChevronDown } from "react-icons/lu";

/** Ordinary buttons keep keyboard navigation native without an OS select popup. */
export function GardenChoice({label,value,options,onChange}:{label:string;value:string;options:{value:string;label:string}[];onChange:(value:string)=>void}) {
  const [open,setOpen]=useState(false),id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
    const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.stopPropagation();setOpen(false);trigger.current?.focus();}};
    document.addEventListener("pointerdown",outside);root.current?.addEventListener("keydown",escape);
    const node=root.current;return()=>{document.removeEventListener("pointerdown",outside);node?.removeEventListener("keydown",escape);};
  },[open]);
  return <div className="garden-choice" ref={root} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}>
    <button ref={trigger} type="button" className="garden-choice-trigger" aria-label={label} aria-expanded={open} aria-controls={id} onClick={()=>setOpen(v=>!v)}><span>{options.find(o=>o.value===value)?.label}</span><LuChevronDown aria-hidden="true" className={open?"is-open":""}/></button>
    {open&&<div id={id} role="group" aria-label={`${label} 선택`} className="garden-choice-options">{options.map(o=><button key={o.value} type="button" aria-pressed={o.value===value} onClick={()=>{onChange(o.value);setOpen(false);trigger.current?.focus();}}><span>{o.label}</span>{o.value===value&&<LuCheck aria-hidden="true"/>}</button>)}</div>}
  </div>;
}
