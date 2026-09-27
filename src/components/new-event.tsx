'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarPlus,Check,Download,ExternalLink,X} from 'lucide-react';
import {localDay,type AgendaState} from '@/components/google-agenda';

type Draft = {title:string;allDay:boolean;date:string;endDate:string;startTime:string;endTime:string;location:string;description:string};

function addHour(t:string){const [h,m]=t.split(':').map(Number);return `${String(Math.min(h+1,23)).padStart(2,'0')}:${String(h>=23?59:m).padStart(2,'0')}`;}
function nextSlot(){const d=new Date();d.setMinutes(0,0,0);d.setHours(Math.min(d.getHours()+1,22));return `${String(d.getHours()).padStart(2,'0')}:00`;}
function blank():Draft{const t=nextSlot();const today=localDay(new Date());return {title:'',allDay:false,date:today,endDate:today,startTime:t,endTime:addHour(t),location:'',description:''};}

// iCalendar file: opens in Apple Calendar (iPhone, iPad, Mac) and any other calendar app.
function ics(d:Draft){
  const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
  const utc=(date:string,time:string)=>new Date(`${date}T${time}:00`).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const day=(date:string)=>date.replace(/-/g,'');
  const after=(date:string)=>{const n=new Date(date+'T12:00:00');n.setDate(n.getDate()+1);return localDay(n).replace(/-/g,'');};
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//none OS//Agenda//PT-BR','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@none-os`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,
    ...(d.allDay?[`DTSTART;VALUE=DATE:${day(d.date)}`,`DTEND;VALUE=DATE:${after(d.endDate)}`]:[`DTSTART:${utc(d.date,d.startTime)}`,`DTEND:${utc(d.endDate,d.endTime)}`]),
    `SUMMARY:${esc(d.title)}`,...(d.location?[`LOCATION:${esc(d.location)}`]:[]),...(d.description?[`DESCRIPTION:${esc(d.description)}`]:[]),
    'END:VEVENT','END:VCALENDAR'];
  return lines.join('\r\n');
}
function downloadIcs(d:Draft){
  const url=URL.createObjectURL(new Blob([ics(d)],{type:'text/calendar;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=(d.title.replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,60)||'evento')+'.ics';a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}

export function NewEventButton({google,onCreated}:{google:AgendaState;onCreated:()=>void}){
  const [open,setOpen]=useState(false);
  return <>
    <button className="btn-secondary btn-sm" onClick={()=>setOpen(true)}><CalendarPlus size={15}/>Novo evento</button>
    {open?<NewEventDialog google={google} onClose={()=>setOpen(false)} onCreated={onCreated}/>:null}
  </>;
}

function NewEventDialog({google,onClose,onCreated}:{google:AgendaState;onClose:()=>void;onCreated:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  const [d,setD]=useState<Draft>(blank);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [done,setDone]=useState<{link?:string;draft:Draft}|null>(null);
  useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
  const valid=d.title.trim()&&d.date&&d.endDate>=d.date&&(d.allDay||(d.startTime&&d.endTime&&d.endDate+d.endTime>d.date+d.startTime));
  const connected=google==='ok';
  async function create(){
    if(!valid||busy)return;setBusy(true);setError('');
    try{
      const r=await fetch('/api/google/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...d,title:d.title.trim(),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone})});
      const j=await r.json().catch(()=>({})) as {event?:{link?:string};error?:string;status?:string};
      if(!r.ok){setError(j.status==='desconectado'?'O Google Agenda foi desconectado. Conecte novamente para criar o evento.':j.error??'Não foi possível criar o evento.');return;}
      setDone({link:j.event?.link,draft:{...d,title:d.title.trim()}});onCreated();
    }catch{setError('Sem conexão com o servidor. Tente novamente.');}
    finally{setBusy(false);}
  }
  const set=(p:Partial<Draft>)=>setD(x=>{const n={...x,...p};if(p.date&&n.endDate<p.date)n.endDate=p.date;if(p.startTime&&n.endDate===n.date&&n.endTime<=p.startTime)n.endTime=addHour(p.startTime);return n;});
  return <dialog ref={ref} className="modal" aria-labelledby="event-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className="modal-heading"><span className="eyebrow">NONE / AGENDA</span><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div>
    <h2 id="event-title">{done?'Evento criado':'Novo evento'}</h2>
    {done?<div className="event-done">
      <p><Check size={16}/> “{done.draft.title}” está no seu Google Agenda. Se a sua conta Google estiver no Calendário da Apple (iPhone ou Mac), o evento aparece lá automaticamente.</p>
      <div className="decision-actions">{done.link?<a className="outline" href={done.link} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Abrir no Google Agenda</a>:null}<button className="outline" onClick={()=>downloadIcs(done.draft)}><Download size={15}/>Adicionar ao Calendário da Apple</button><button className="primary" onClick={onClose}>Concluir</button></div>
      <p className="source-note">Use “Adicionar ao Calendário da Apple” só se a conta Google não estiver no aparelho; caso contrário o evento aparecerá duplicado.</p>
    </div>:<form className="decision-form" onSubmit={e=>{e.preventDefault();void create();}}>
      <label className="field-label decision-field">Título<input required maxLength={300} value={d.title} onChange={e=>set({title:e.target.value})} placeholder="Ex.: Reunião com a MCL"/></label>
      <label className="event-allday"><input type="checkbox" checked={d.allDay} onChange={e=>set({allDay:e.target.checked})}/>Dia inteiro</label>
      <div className="decision-form-row event-row">
        <label className="field-label decision-field">Início<input type="date" required value={d.date} onChange={e=>set({date:e.target.value})}/></label>
        {!d.allDay?<label className="field-label decision-field">Hora<input type="time" required value={d.startTime} onChange={e=>set({startTime:e.target.value})}/></label>:null}
        <label className="field-label decision-field">Término<input type="date" required min={d.date} value={d.endDate} onChange={e=>set({endDate:e.target.value})}/></label>
        {!d.allDay?<label className="field-label decision-field">Hora<input type="time" required value={d.endTime} onChange={e=>set({endTime:e.target.value})}/></label>:null}
      </div>
      <label className="field-label decision-field">Local <span>(opcional)</span><input maxLength={300} value={d.location} onChange={e=>set({location:e.target.value})} placeholder="Endereço ou link da reunião"/></label>
      <label className="field-label decision-field">Descrição <span>(opcional)</span><textarea maxLength={4000} value={d.description} onChange={e=>set({description:e.target.value})}/></label>
      {error?<p role="alert" className="check-help-error">{error}</p>:null}
      {!connected?<p className="source-note">{google==='desconectado'?'O Google Agenda não está conectado. Conecte na seção Agenda ou baixe o evento para o Calendário da Apple.':'O Google Agenda está indisponível agora. Você pode baixar o evento para o Calendário da Apple.'}</p>:null}
      <div className="decision-actions"><button type="button" className="outline" disabled={!valid} onClick={()=>downloadIcs({...d,title:d.title.trim()})}><Download size={15}/>Só no Calendário da Apple</button><button className="primary" disabled={!valid||busy||!connected}><CalendarPlus size={16}/>{busy?'Criando…':'Criar no Google Agenda'}</button></div>
    </form>}
  </dialog>;
}
