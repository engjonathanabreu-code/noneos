'use client';
import {useCallback,useEffect,useState} from 'react';
import {CalendarDays,ExternalLink,MapPin,RefreshCw,Unplug} from 'lucide-react';
import type {CalendarEvent} from '@/lib/google';

export type AgendaState = 'loading'|'ok'|'desconectado'|'nao_configurado'|'erro';
export function localDay(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}

export function useGoogleEvents(from:Date,to:Date){
 const [state,setState]=useState<AgendaState>('loading');const [events,setEvents]=useState<CalendarEvent[]>([]);const [tick,setTick]=useState(0);
 const range=from.toISOString()+'|'+to.toISOString();
 useEffect(()=>{let live=true;setState('loading');const [a,b]=range.split('|');
  fetch('/api/google/events?'+new URLSearchParams({from:a,to:b})).then(async r=>{const j=await r.json().catch(()=>({}));if(!live)return;
   if(r.ok){setEvents(j.events);setState('ok');}else setState(j.status==='desconectado'||j.status==='nao_configurado'?j.status:'erro');
  }).catch(()=>{if(live)setState('erro');});return()=>{live=false;};},[range,tick]);
 const reload=useCallback(()=>setTick(t=>t+1),[]);
 return {state,events,reload};
}

// Days (YYYY-MM-DD, local) an event covers. All-day end dates are exclusive.
export function eventDays(e:CalendarEvent){
 const start=e.allDay?new Date(e.start+'T12:00:00'):new Date(e.start);const end=e.allDay?new Date(e.end+'T12:00:00'):new Date(e.end);
 if(e.allDay)end.setDate(end.getDate()-1);
 const days:string[]=[];const d=new Date(start.getFullYear(),start.getMonth(),start.getDate());
 while(d<=end&&days.length<62){days.push(localDay(d));d.setDate(d.getDate()+1);}
 return days.length?days:[localDay(start)];
}
export function eventTime(e:CalendarEvent){return e.allDay?'Dia todo':new Date(e.start).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});}

export async function scheduleOnGoogle(title:string,date:string){
 const r=await fetch('/api/google/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,date})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.status==='desconectado'?'Conecte o Google Agenda para agendar.':j.error??'Não foi possível agendar.');
 return j.event as {id:string;link?:string};
}

export function GoogleConnection({state,onChange}:{state:AgendaState;onChange:()=>void}){
 const [busy,setBusy]=useState(false);
 async function disconnect(){setBusy(true);try{await fetch('/api/google/connection',{method:'DELETE'});}finally{setBusy(false);onChange();}}
 if(state==='nao_configurado')return <p className="gcal-status">Google Agenda · aguardando credenciais do Google no servidor.</p>;
 if(state==='desconectado')return <p className="gcal-status"><span>Google Agenda · não conectado</span><a className="primary gcal-connect" href="/api/google/connect"><CalendarDays size={15}/>Conectar Google Agenda</a></p>;
 if(state==='ok')return <p className="gcal-status"><span><i className="gcal-dot"/>Google Agenda · conectado</span><button className="text-button" disabled={busy} onClick={disconnect}><Unplug size={14}/>Desconectar</button></p>;
 if(state==='erro')return <p className="gcal-status"><span>Google Agenda · indisponível agora</span><button className="text-button" onClick={onChange}><RefreshCw size={14}/>Tentar novamente</button></p>;
 return <p className="gcal-status">Google Agenda · verificando…</p>;
}

const notices:Record<string,string>={conectado:'Google Agenda conectado.',cancelado:'Conexão com o Google cancelada.','estado-invalido':'A conexão expirou. Tente conectar novamente.',erro:'O Google recusou a conexão. Tente novamente.','nao-configurado':'Credenciais do Google ainda não configuradas no servidor.'};

export function AgendaCard(){
 const [range]=useState(()=>{const a=new Date();a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+8);return [a,b] as const;});
 const {state,events,reload}=useGoogleEvents(range[0],range[1]);const [notice,setNotice]=useState('');
 useEffect(()=>{const s=new URLSearchParams(location.search).get('google');if(s){setNotice(notices[s]??'');history.replaceState(null,'',location.pathname);}},[]);
 const days=Array.from({length:8},(_,i)=>{const d=new Date(range[0]);d.setDate(d.getDate()+i);return d;});
 const byDay=days.map(d=>({d,key:localDay(d),list:events.filter(e=>eventDays(e).includes(localDay(d)))})).filter((x,i)=>i===0||x.list.length);
 return <section className="panel agenda-card" aria-label="Agenda"><div className="section-header"><div><p className="eyebrow">SUA AGENDA</p><h2>Hoje e próximos 7 dias</h2></div></div>
  {notice&&<p role="status" className="gcal-notice">{notice}</p>}
  {state==='ok'&&<div className="agenda-days">{byDay.map(({d,key,list})=><div className="agenda-day" key={key}><h3>{key===localDay(new Date())?'Hoje':d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'short'})}</h3>{list.length?list.map(e=><EventRow key={e.id+key} e={e}/>):<p className="agenda-empty">Nada na agenda hoje.</p>}</div>)}</div>}
  {state==='loading'&&<p className="agenda-empty">Carregando agenda…</p>}
  <GoogleConnection state={state} onChange={reload}/>
 </section>;
}

export function EventRow({e}:{e:CalendarEvent}){
 return <div className="agenda-event"><span className="agenda-time">{eventTime(e)}</span><div><strong>{e.title}</strong>{e.location&&<small><MapPin size={11}/>{e.location}</small>}</div>{e.link&&<a className="icon-button" href={e.link} target="_blank" rel="noopener noreferrer" aria-label={'Abrir '+e.title+' no Google Agenda'}><ExternalLink size={14}/></a>}</div>;
}
