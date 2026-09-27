'use client';
import {useEffect,useState} from 'react';
import type {DecisionStatus} from './domain';

// Decisions registered by the partner. Stored under none-decisions-v1 and synced like the
// other workspace documents (none_os.documentos_estado, key "decisoes").
export type Priority = 'Alta'|'Média'|'Baixa';
export type DecisionItem = {id:string;companyId:string;title:string;context:string;options:string;impact:string;recommendation:string;priority:Priority;due:string;status:DecisionStatus;note:string;createdAt:string;updatedAt:string};
export type DecisionEvent = {id:string;decisionId:string;companyId?:string;title:string;status:DecisionStatus|'created'|'edited'|'removed';at:string;note:string};
type Store = {version:1;items:DecisionItem[];audit:DecisionEvent[]};

export const decisionKey = 'none-decisions-v1';
export const statusLabel:Record<DecisionStatus,string> = {pending:'Pendente',approved:'Aprovada',deferred:'Adiada',rejected:'Não aprovada'};
export const eventLabel:Record<DecisionEvent['status'],string> = {...statusLabel,pending:'Reaberta',created:'Registrada',edited:'Editada',removed:'Excluída'};
const statuses = ['pending','approved','deferred','rejected'];
const empty:Store = {version:1,items:[],audit:[]};

function valid(v:Store){
  return v&&v.version===1&&Array.isArray(v.items)&&Array.isArray(v.audit)
    &&v.items.every(d=>d&&typeof d.id==='string'&&typeof d.title==='string'&&typeof d.companyId==='string'&&statuses.includes(d.status))
    &&v.audit.every(e=>e&&typeof e.id==='string'&&typeof e.at==='string');
}
function read():Store{const raw=localStorage.getItem(decisionKey);if(!raw)return empty;const v=JSON.parse(raw) as Store;if(!valid(v))throw Error('invalid');return v;}

export function newDecision(companyId:string):DecisionItem{const now=new Date().toISOString();return {id:crypto.randomUUID(),companyId,title:'',context:'',options:'',impact:'',recommendation:'',priority:'Média',due:'',status:'pending',note:'',createdAt:now,updatedAt:now};}

export function useDecisions(){
  const [store,setStore] = useState<Store>(empty);
  const [error,setError] = useState('');
  const [ready,setReady] = useState(false);
  useEffect(()=>{const load=()=>{try{setStore(read());setReady(true);setError('');}catch{setReady(false);setError('Não foi possível ler as decisões salvas. Os dados foram preservados.');}};load();window.addEventListener('none-decisions',load);return()=>window.removeEventListener('none-decisions',load);},[]);
  function commit(change:(s:Store)=>Store){
    if(!ready) throw Error('Decisões indisponíveis.');
    const next = change(read());
    localStorage.setItem(decisionKey,JSON.stringify(next));
    setStore(next);
    window.dispatchEvent(new Event('none-decisions'));
  }
  const log = (d:DecisionItem,status:DecisionEvent['status'],note=''):DecisionEvent=>({id:crypto.randomUUID(),decisionId:d.id,companyId:d.companyId,title:d.title,status,at:new Date().toISOString(),note});
  return {
    items:store.items, audit:store.audit, ready, error,
    save(d:DecisionItem){commit(s=>{const exists=s.items.some(x=>x.id===d.id);const item={...d,updatedAt:new Date().toISOString()};return {...s,items:exists?s.items.map(x=>x.id===d.id?item:x):[item,...s.items],audit:[log(item,exists?'edited':'created'),...s.audit].slice(0,300)};});},
    decide(id:string,status:DecisionStatus,note:string){commit(s=>{const d=s.items.find(x=>x.id===id);if(!d)return s;const item={...d,status,note,updatedAt:new Date().toISOString()};return {...s,items:s.items.map(x=>x.id===id?item:x),audit:[log(item,status,note),...s.audit].slice(0,300)};});},
    remove(id:string){commit(s=>{const d=s.items.find(x=>x.id===id);if(!d)return s;return {...s,items:s.items.filter(x=>x.id!==id),audit:[log(d,'removed'),...s.audit].slice(0,300)};});}
  };
}
