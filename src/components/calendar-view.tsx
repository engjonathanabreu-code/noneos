'use client';
import {createContext,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {CalendarPlus,ChevronLeft,ChevronRight,ExternalLink,MapPin,X} from 'lucide-react';
import type {CalendarEvent} from '@/lib/google';
import {useGoogleEvents,useErpEvents,eventDays,eventTime,byStart,localDay,GoogleConnection,ErpStatus} from '@/components/google-agenda';
import {NewEventDialog,type EventPreset} from '@/components/new-event';
import {useOrganizations} from '@/lib/organizations';
import {eventKey,useEntities,useEventLinks} from '@/lib/colors';

// Each event takes the color of its company (chosen by the partner or recognized by the AI).
const Cal = createContext<{colorOf:(e:CalendarEvent)=>string;companyOf:(e:CalendarEvent)=>string|undefined;open:(e:CalendarEvent)=>void}>({colorOf:()=>'#8a968d',companyOf:()=>undefined,open:()=>{}});
const tint = (c:string) => ({background:c+'22',borderLeftColor:c});

// Calendar with day and week (hour grid), month (one line per event) and list views.
// Sources: Google Agenda (read/write) and the partner's ERP Integral agenda (read-only).
type Mode='dia'|'semana'|'mes'|'lista';
const HOUR=48; // px per hour in the day/week grid
const weekdays=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
// Message after returning from the Google OAuth screen (?google=...).
const oauthNotices:Record<string,string>={conectado:'Google Agenda conectado.',cancelado:'Conexão com o Google cancelada.','estado-invalido':'A conexão expirou. Tente conectar novamente.',erro:'O Google recusou a conexão. Tente novamente.','nao-configurado':'Credenciais do Google ainda não configuradas no servidor.'};

const startOfDay=(d:Date)=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const addDays=(d:Date,n:number)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const mondayOf=(d:Date)=>addDays(startOfDay(d),-((d.getDay()+6)%7));
const sameDay=(a:Date,b:Date)=>localDay(a)===localDay(b);
const hhmm=(d:Date)=>`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

function range(mode:Mode,anchor:Date):[Date,Date]{
  if(mode==='dia')return [startOfDay(anchor),addDays(startOfDay(anchor),1)];
  if(mode==='semana'){const m=mondayOf(anchor);return [m,addDays(m,7)];}
  if(mode==='mes'){const first=new Date(anchor.getFullYear(),anchor.getMonth(),1);const m=mondayOf(first);return [m,addDays(m,42)];}
  return [startOfDay(anchor),addDays(startOfDay(anchor),8)];
}

// Timed events of one day with column placement for overlaps.
function layoutDay(events:CalendarEvent[],day:Date){
  const d0=startOfDay(day).getTime(),d1=d0+864e5;
  const items=events.filter(e=>!e.allDay).map(e=>{const s=Math.max(Date.parse(e.start),d0),en=Math.min(Math.max(Date.parse(e.end),Date.parse(e.start)+15*6e4),d1);return {e,s,en};}).filter(x=>x.s<d1&&x.en>d0).sort((a,b)=>a.s-b.s||b.en-a.en);
  const placed:{e:CalendarEvent;s:number;en:number;col:number;cols:number}[]=[];
  let cluster:typeof placed=[];let clusterEnd=0;
  const flush=()=>{const cols=Math.max(1,...cluster.map(c=>c.col+1));cluster.forEach(c=>c.cols=cols);cluster=[];};
  for(const it of items){
    if(cluster.length&&it.s>=clusterEnd)flush();
    const used=new Set(cluster.filter(c=>c.en>it.s).map(c=>c.col));let col=0;while(used.has(col))col++;
    const p={...it,col,cols:1};placed.push(p);cluster.push(p);clusterEnd=Math.max(clusterEnd,it.en);
  }
  flush();
  return placed.map(p=>({...p,top:(p.s-d0)/36e5*HOUR,height:Math.max(20,(p.en-p.s)/36e5*HOUR)}));
}

function EventChip({e,compact=false}:{e:CalendarEvent;compact?:boolean}){
  const {colorOf,companyOf,open}=useContext(Cal);
  const label=`${e.allDay?'Dia todo':eventTime(e)} · ${e.title}${companyOf(e)?' · '+companyOf(e):''}${e.location?' · '+e.location:''}`;
  return <button className="cal-chip" style={tint(colorOf(e))} title={label} onClick={()=>open(e)}>{!e.allDay&&!compact?<b>{eventTime(e)}</b>:null}<span>{e.title}</span>{e.source==='erp'?<em>ERP</em>:null}</button>;
}

export function CalendarPanel(){
  const [mode,setMode]=useState<Mode>(()=>typeof window!=='undefined'&&window.innerWidth<700?'dia':'semana');
  const [anchor,setAnchor]=useState(()=>startOfDay(new Date()));
  const [from,to]=useMemo(()=>range(mode,anchor),[mode,anchor]);
  const google=useGoogleEvents(from,to);const erp=useErpEvents(from,to);
  const events=useMemo(()=>[...(google.state==='ok'?google.events:[]),...(erp.state==='ok'?erp.events:[])].sort(byStart),[google.state,google.events,erp.state,erp.events]);
  const [preset,setPreset]=useState<EventPreset|null>(null);
  const [opened,setOpened]=useState<CalendarEvent|null>(null);
  const {entities,colorOf:entityColor,nameOf}=useEntities();
  const orgs=useOrganizations();
  const {links,save:saveLinks}=useEventLinks();
  const companyId=(e:CalendarEvent)=>links[eventKey(e)]?.company??undefined;
  const ctx={colorOf:(e:CalendarEvent)=>entityColor(companyId(e)??null),companyOf:(e:CalendarEvent)=>nameOf(companyId(e)),open:setOpened};
  // Ask the AI about events never classified (once per event or recurring series).
  const tried=useRef(new Set<string>());
  useEffect(()=>{
    if(!orgs.ready)return;
    const pending=events.filter(e=>{const k=eventKey(e);return !(k in links)&&!tried.current.has(k);});
    const unique=[...new Map(pending.map(e=>[eventKey(e),e])).values()].slice(0,40);
    if(!unique.length)return;
    unique.forEach(e=>tried.current.add(eventKey(e)));
    fetch('/api/agenda/classificar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      companies:orgs.items.map(o=>({id:o.id,name:o.name,sector:o.sector,description:o.description})),
      events:unique.map(e=>({key:eventKey(e),title:e.title,location:e.location,calendar:e.calendar,source:e.source,start:e.start}))
    })}).then(r=>r.ok?r.json():null).then((j:{result?:Record<string,string|null>}|null)=>{
      if(!j?.result)return;
      saveLinks(Object.fromEntries(Object.entries(j.result).map(([k,c])=>[k,{company:c,by:'ia' as const}])));
    }).catch(()=>{});
  },[events,links,orgs.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const legend=entities.filter(x=>events.some(e=>companyId(e)===x.id));
  const [now,setNow]=useState(()=>new Date());
  const [notice,setNotice]=useState('');
  useEffect(()=>{const s=new URLSearchParams(location.search).get('google');if(s){setNotice(oauthNotices[s]??'');history.replaceState(null,'',location.pathname+location.hash);}},[]);
  useEffect(()=>{const id=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(id);},[]);
  const step=(n:number)=>setAnchor(a=>mode==='dia'?addDays(a,n):mode==='semana'||mode==='lista'?addDays(a,7*n):new Date(a.getFullYear(),a.getMonth()+n,1));
  const title=mode==='dia'?anchor.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})
    :mode==='mes'?anchor.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})
    :`${from.toLocaleDateString('pt-BR',{day:'numeric',month:'short'})} – ${addDays(to,-1).toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'})}`;
  const canCreate=google.state==='ok'||google.state==='desconectado'||google.state==='erro';
  const reload=()=>{google.reload();erp.reload();};
  return <Cal.Provider value={ctx}><section className="panel cal-panel" aria-label="Agenda">
    <div className="cal-head">
      <div><p className="eyebrow">SUA AGENDA</p><h2 className="cal-title">{title}</h2></div>
      <div className="cal-controls">
        <div className="cal-modes" role="tablist" aria-label="Visualização">{([['dia','Dia'],['semana','Semana'],['mes','Mês'],['lista','Lista']] as const).map(([m,l])=><button key={m} role="tab" aria-selected={mode===m} onClick={()=>setMode(m)}>{l}</button>)}</div>
        <div className="cal-nav"><button className="icon-button" aria-label="Anterior" onClick={()=>step(-1)}><ChevronLeft size={18}/></button><button className="btn-ghost btn-sm" onClick={()=>setAnchor(startOfDay(new Date()))}>Hoje</button><button className="icon-button" aria-label="Próximo" onClick={()=>step(1)}><ChevronRight size={18}/></button></div>
        {canCreate?<button className="btn-secondary btn-sm" onClick={()=>setPreset({date:localDay(anchor)})}><CalendarPlus size={15}/>Novo evento</button>:null}
      </div>
    </div>
    {notice?<p role="status" className="gcal-notice">{notice}</p>:null}
    {(google.state==='loading'&&erp.state==='loading')?<p className="agenda-empty">Carregando agenda…</p>:null}
    {mode==='dia'&&<TimeGrid days={[anchor]} events={events} now={now} onSlot={(d,t)=>canCreate&&setPreset({date:localDay(d),startTime:t})}/>}
    {mode==='semana'&&<TimeGrid days={Array.from({length:7},(_,i)=>addDays(from,i))} events={events} now={now} onSlot={(d,t)=>canCreate&&setPreset({date:localDay(d),startTime:t})} onDay={d=>{setAnchor(d);setMode('dia');}}/>}
    {mode==='mes'&&<MonthGrid from={from} month={anchor.getMonth()} events={events} now={now} onDay={d=>{setAnchor(d);setMode('dia');}}/>}
    {mode==='lista'&&<ListView from={from} events={events} now={now}/>}
    <div className="cal-legend">{legend.map(x=><span key={x.id}><i style={{background:x.color}}/>{x.name}</span>)}<span><i style={{background:'#8a968d'}}/>Sem empresa</span><span className="cal-legend-note">Cores do checklist · clique no evento para ajustar a empresa</span></div>
    <GoogleConnection state={google.state} onChange={reload} message={google.message}/><ErpStatus state={erp.state} onRetry={erp.reload}/>
    {preset?<NewEventDialog google={google.state} preset={preset} onClose={()=>setPreset(null)} onCreated={reload}/>:null}
    {opened?<EventDialog e={opened} company={companyId(opened)} by={links[eventKey(opened)]?.by} entities={entities} onClose={()=>setOpened(null)} onCompany={c=>{saveLinks({[eventKey(opened)]:{company:c,by:'socio'}});}}/>:null}
  </section></Cal.Provider>;
}

function EventDialog({e,company,by,entities,onClose,onCompany}:{e:CalendarEvent;company?:string;by?:'socio'|'ia';entities:{id:string;name:string;color:string}[];onClose:()=>void;onCompany:(c:string|null)=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  const when=e.allDay?new Date(e.start+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})+' · dia todo'
    :new Date(e.start).toLocaleString('pt-BR',{weekday:'long',day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})+' – '+new Date(e.end).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const color=entities.find(x=>x.id===company)?.color??'#8a968d';
  return <dialog ref={ref} className="modal" aria-labelledby="cal-event-title" onCancel={ev=>{ev.preventDefault();onClose();}} onClick={ev=>{if(ev.target===ev.currentTarget)onClose();}}>
    <div className="modal-heading"><span className="eyebrow">{e.source==='erp'?'ERP INTEGRAL · SOMENTE LEITURA':'GOOGLE AGENDA'}</span><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>
    <h2 id="cal-event-title" className="cal-event-title"><i style={{background:color}}/>{e.title}</h2>
    <p className="cal-event-when">{when}</p>
    {e.location?<p className="cal-event-when"><MapPin size={13}/> {e.location}</p>:null}
    {e.calendar?<p className="cal-event-when">Agenda: {e.calendar}</p>:null}
    <label className="field-label decision-field">Empresa<span className="event-company"><i style={{background:color}}/><select value={company??''} onChange={ev=>onCompany(ev.target.value||null)}><option value="">Sem empresa</option>{entities.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></span></label>
    <p className="source-note">{company?(by==='ia'?'Reconhecida pela IA. Corrija se estiver errada: sua escolha prevalece.':'Definida por você.'):'Sem empresa definida.'}{e.series?' Vale para todas as repetições deste evento.':''}</p>
    <div className="decision-actions">{e.link?<a className="outline" href={e.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Abrir no Google Agenda</a>:null}<button className="primary" onClick={onClose}>Concluir</button></div>
  </dialog>;
}

function TimeGrid({days,events,now,onSlot,onDay}:{days:Date[];events:CalendarEvent[];now:Date;onSlot:(d:Date,time:string)=>void;onDay?:(d:Date)=>void}){
  const scroller=useRef<HTMLDivElement>(null);
  // Open at the current hour during the working day, otherwise at 07:00.
  useEffect(()=>{const el=scroller.current;const h=now.getHours();if(el)el.scrollTop=(h>=8&&h<=18?h-1:7)*HOUR;},[days.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const allDay=days.map(d=>events.filter(e=>e.allDay&&eventDays(e).includes(localDay(d))));
  const hasAllDay=allDay.some(x=>x.length);
  const cols=`56px repeat(${days.length},minmax(0,1fr))`;
  return <div className={`cal-grid ${days.length===1?'is-day':'is-week'}`}>
    <div className="cal-daynames" style={{gridTemplateColumns:cols}}><span/>{days.map(d=><button key={localDay(d)} className={sameDay(d,now)?'is-today':''} onClick={()=>onDay?.(d)} disabled={!onDay}><small>{d.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</small><b>{d.getDate()}</b></button>)}</div>
    {hasAllDay?<div className="cal-allday" style={{gridTemplateColumns:cols}}><small>dia todo</small>{allDay.map((list,i)=><div key={i}>{list.map(e=><EventChip key={e.id+i} e={e} compact/>)}</div>)}</div>:null}
    <div className="cal-scroll" ref={scroller}>
      <div className="cal-body" style={{gridTemplateColumns:cols,height:24*HOUR}}>
        <div className="cal-hours">{Array.from({length:24},(_,h)=><span key={h} style={{top:h*HOUR}}>{h?`${String(h).padStart(2,'0')}:00`:''}</span>)}</div>
        {days.map(d=>{const placed=layoutDay(events,d);const today=sameDay(d,now);return <div key={localDay(d)} className={`cal-col${today?' is-today':''}`} onClick={ev=>{if(ev.target!==ev.currentTarget)return;const y=ev.nativeEvent.offsetY;const h=Math.min(23,Math.floor(y/HOUR));const m=(y%HOUR)>=HOUR/2?30:0;onSlot(d,`${String(h).padStart(2,'0')}:${m?'30':'00'}`);}}>
          {Array.from({length:24},(_,h)=><i key={h} className="cal-line" style={{top:h*HOUR}}/>)}
          {placed.map(p=><EventBlock key={p.e.id} p={p}/>)}
          {today?<i className="cal-now" style={{top:(now.getHours()*60+now.getMinutes())/60*HOUR}}/>:null}
        </div>;})}
      </div>
    </div>
  </div>;
}

function EventBlock({p}:{p:ReturnType<typeof layoutDay>[number]}){
  const {colorOf,companyOf,open}=useContext(Cal);const c=colorOf(p.e);const co=companyOf(p.e);
  return <button className="cal-event" style={{top:p.top,height:p.height,left:`calc(${100*p.col/p.cols}% + 2px)`,width:`calc(${100/p.cols}% - 4px)`,...tint(c)}} title={`${eventTime(p.e)} · ${p.e.title}${co?' · '+co:''}${p.e.location?' · '+p.e.location:''}`} onClick={()=>open(p.e)}>
    <b>{p.e.title}</b><small>{hhmm(new Date(p.s))}–{hhmm(new Date(p.en))}{co?' · '+co:''}{p.e.source==='erp'?' · ERP':''}</small>
  </button>;
}

function MonthGrid({from,month,events,now,onDay}:{from:Date;month:number;events:CalendarEvent[];now:Date;onDay:(d:Date)=>void}){
  const MAX=3;
  return <div className="cal-month">
    <div className="cal-month-names">{weekdays.map(w=><small key={w}>{w}</small>)}</div>
    <div className="cal-month-grid">{Array.from({length:42},(_,i)=>{const d=addDays(from,i);const key=localDay(d);const list=events.filter(e=>eventDays(e).includes(key));return <div key={key} className={`cal-cell${d.getMonth()!==month?' is-out':''}${sameDay(d,now)?' is-today':''}`}>
      <button className="cal-cell-day" onClick={()=>onDay(d)} aria-label={'Ver '+d.toLocaleDateString('pt-BR')}>{d.getDate()}</button>
      {list.slice(0,MAX).map(e=><EventChip key={e.id} e={e}/>)}
      {list.length>MAX?<button className="cal-more" onClick={()=>onDay(d)}>+{list.length-MAX} mais</button>:null}
    </div>;})}</div>
  </div>;
}

function ListView({from,events,now}:{from:Date;events:CalendarEvent[];now:Date}){
  const days=Array.from({length:8},(_,i)=>addDays(from,i)).map(d=>({d,key:localDay(d),list:events.filter(e=>eventDays(e).includes(localDay(d)))})).filter((x,i)=>i===0||x.list.length);
  return <div className="agenda-days">{days.map(({d,key,list})=><div className="agenda-day" key={key}><h3>{sameDay(d,now)?'Hoje':d.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'short'})}</h3>{list.length?list.map(e=><ListRow key={e.id+key} e={e}/>):<p className="agenda-empty">Nada na agenda.</p>}</div>)}</div>;
}

function ListRow({e}:{e:CalendarEvent}){
  const {colorOf,companyOf,open}=useContext(Cal);const c=colorOf(e);
  return <button className="cal-list-row" style={{borderLeftColor:c}} onClick={()=>open(e)}><span className="agenda-time">{eventTime(e)}</span><span className="cal-list-main"><b>{e.title}</b><small>{companyOf(e)??'Sem empresa'}{e.source==='erp'?' · ERP Integral':' · Google'}{e.location?' · '+e.location:''}</small></span></button>;
}
