'use client';
import {useCallback,useEffect,useState} from 'react';
import {companyColor,paletteHexes} from './brand';
import {useOrganizations} from './organizations';

// One color per company (organization registry) plus the "Pessoal" category, used by the
// checklist, the calendar and the rest of the system. The personal color lives in the
// checklist document (none-checklists-v1 → personalColor) so it syncs with it.
export const PERSONAL = 'personal';
export const PERSONAL_NAME = 'Pessoal';
const DEFAULT_PERSONAL = '#ca8a04';
const checklistKey = 'none-checklists-v1';

export function readPersonalColor(){
  try{const v=JSON.parse(localStorage.getItem(checklistKey)??'null') as {personalColor?:string}|null;return v?.personalColor&&paletteHexes.includes(v.personalColor)?v.personalColor:DEFAULT_PERSONAL;}
  catch{return DEFAULT_PERSONAL;}
}
export function savePersonalColor(hex:string){
  if(!paletteHexes.includes(hex)) return;
  const raw=localStorage.getItem(checklistKey);const v=raw?JSON.parse(raw):{version:1,items:[]};
  localStorage.setItem(checklistKey,JSON.stringify({...v,personalColor:hex}));
  window.dispatchEvent(new Event('none-colors'));
}

export type Entity = {id:string;name:string;color:string};
// Companies and "Pessoal", with their current colors; setColor updates the right store.
export function useEntities(){
  const orgs=useOrganizations();
  const [personal,setPersonal]=useState(DEFAULT_PERSONAL);
  useEffect(()=>{const load=()=>setPersonal(readPersonalColor());load();window.addEventListener('none-colors',load);window.addEventListener('storage',load);return()=>{window.removeEventListener('none-colors',load);window.removeEventListener('storage',load);};},[]);
  const entities:Entity[]=[{id:PERSONAL,name:PERSONAL_NAME,color:personal},...orgs.items.map(o=>({id:o.id,name:o.name,color:companyColor(o)}))];
  const colorOf=useCallback((id?:string|null)=>id?(entities.find(e=>e.id===id)?.color??companyColor({id})):'#8a968d',[entities]); // eslint-disable-line react-hooks/exhaustive-deps
  function setColor(id:string,hex:string){
    if(id===PERSONAL){savePersonalColor(hex);setPersonal(hex);return;}
    const org=orgs.items.find(o=>o.id===id);if(org&&orgs.ready)orgs.save({...org,color:hex});
  }
  return {entities,colorOf,setColor,ready:orgs.ready,nameOf:(id?:string|null)=>entities.find(e=>e.id===id)?.name};
}

// Which company an event belongs to. Keyed by "<source>:<series or id>" so a recurring
// Google meeting is linked once. by: 'socio' (chosen by the partner) wins over 'ia'.
export type EventLink = {company:string|null;by:'socio'|'ia'};
const linksKey = 'none-event-links-v1';
export const eventKey = (e:{source?:string;id:string;series?:string}) => `${e.source??'google'}:${e.series??e.id}`;
function readLinks():Record<string,EventLink>{try{const v=JSON.parse(localStorage.getItem(linksKey)??'null') as {links?:Record<string,EventLink>}|null;return v?.links&&typeof v.links==='object'?v.links:{};}catch{return {};}}
export function useEventLinks(){
  const [links,setLinks]=useState<Record<string,EventLink>>({});
  useEffect(()=>{const load=()=>setLinks(readLinks());load();window.addEventListener('none-event-links',load);return()=>window.removeEventListener('none-event-links',load);},[]);
  const save=useCallback((patch:Record<string,EventLink>)=>{
    const cur=readLinks();
    // Never let the AI overwrite the partner's own choice.
    for(const [k,v] of Object.entries(patch)){if(v.by==='ia'&&cur[k]?.by==='socio')continue;cur[k]=v;}
    // Keep the document small: most recent 3000 links.
    const entries=Object.entries(cur);const trimmed=entries.length>3000?Object.fromEntries(entries.slice(-3000)):cur;
    try{localStorage.setItem(linksKey,JSON.stringify({version:1,links:trimmed}));}catch{/* quota: links are a convenience */}
    setLinks(trimmed);window.dispatchEvent(new Event('none-event-links'));
  },[]);
  return {links,save};
}
