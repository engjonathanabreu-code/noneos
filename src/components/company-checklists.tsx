'use client';
import {useEffect,useMemo,useState} from 'react';
import {useOrganizations,organizationContext} from '@/lib/organizations';
import {checklistIcons,checklistIcon,companyPalette} from '@/lib/brand';
import {PERSONAL,useEntities} from '@/lib/colors';
import {Plus,Sparkles,Pencil,Archive,CalendarPlus,ChevronLeft,ChevronRight,CheckSquare,Search,ArchiveRestore,Check} from 'lucide-react';
import {useGoogleEvents} from '@/components/google-agenda';
import {NewEventDialog,type EventPreset} from '@/components/new-event';

// Recurring checklist per company or "Pessoal" (weekly or monthly). Completion is stored per period key.
// Data shape and storage key (none-checklists-v1) are unchanged; the list is built for dozens of items.
type Item={id:string;company:string;title:string;frequency:'weekly'|'monthly';completed:string[];archived:boolean;icon?:string};
const key='none-checklists-v1';
type AiState='checking'|'conectado'|'nao_configurado'|'erro';
type Status='todos'|'pendentes'|'concluidos';
function localDate(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function periodKey(date:Date,frequency:'weekly'|'monthly'){if(frequency==='monthly')return localDate(date).slice(0,7);const monday=new Date(date.getFullYear(),date.getMonth(),date.getDate());monday.setDate(monday.getDate()-(monday.getDay()+6)%7);return localDate(monday);}
const validItem=(i:Item)=>i&&typeof i.id==='string'&&typeof i.company==='string'&&typeof i.title==='string'&&['weekly','monthly'].includes(i.frequency)&&Array.isArray(i.completed)&&i.completed.every(x=>typeof x==='string')&&typeof i.archived==='boolean'&&(i.icon===undefined||typeof i.icon==='string');

export function CompanyChecklists(){
 const orgs=useOrganizations();const ents=useEntities();
 const [colorFor,setColorFor]=useState<string|null>(null);
 const [items,setItems]=useState<Item[]>([]);const [ready,setReady]=useState(false);const [notice,setNotice]=useState('');
 const [company,setCompany]=useState('all');const [frequency,setFrequency]=useState<'weekly'|'monthly'>('weekly');
 const [anchor,setAnchor]=useState(()=>new Date());
 const [status,setStatus]=useState<Status>('todos');const [query,setQuery]=useState('');
 const [title,setTitle]=useState('');const [icon,setIcon]=useState('check');const [target,setTarget]=useState('');const [edit,setEdit]=useState<string|null>(null);const [adding,setAdding]=useState(false);
 const [help,setHelp]=useState(false);const [showArchive,setShowArchive]=useState(false);
 const [ai,setAi]=useState<AiState>('checking');const [apoio,setApoio]=useState<{key:string;state:'idle'|'loading'|'ok'|'error';text:string}>({key:'',state:'idle',text:''});
 const [preset,setPreset]=useState<EventPreset|null>(null);
 const [today]=useState(()=>{const a=new Date();a.setHours(0,0,0,0);const b=new Date(a);b.setDate(b.getDate()+1);return [a,b] as const;});
 const gcal=useGoogleEvents(today[0],today[1]);
 // AI status is only checked once the "Apoio da none" panel is opened.
 useEffect(()=>{if(!help||ai!=='checking')return;let alive=true;fetch('/api/agentes').then(r=>r.ok?r.json():Promise.reject()).then((d:{state?:AiState})=>{if(alive)setAi(d.state==='conectado'||d.state==='nao_configurado'||d.state==='erro'?d.state:'erro');}).catch(()=>{if(alive)setAi('erro');});return()=>{alive=false;};},[help,ai]);
 useEffect(()=>{try{const raw=localStorage.getItem(key);if(raw){const v=JSON.parse(raw);if(v.version!==1||!Array.isArray(v.items)||!v.items.every(validItem))throw Error();setItems(v.items);}setReady(true);}catch{setNotice('Não foi possível recuperar os checklists. O conteúdo salvo foi preservado.');}},[]);
 function commit(next:Item[],ok='Checklist salvo.'){try{const cur=JSON.parse(localStorage.getItem(key)??'{}');localStorage.setItem(key,JSON.stringify({...cur,version:1,items:next}));setItems(next);setNotice(ok);return true;}catch{setNotice('Não foi possível salvar. A alteração não foi aplicada.');return false;}}
 const all=company==='all';const orgOf=(id:string)=>ents.entities.find(o=>o.id===id);
 const cycle=periodKey(anchor,frequency);
 const cycleLabel=frequency==='weekly'?'Semana de '+new Date(cycle+'T12:00:00').toLocaleDateString('pt-BR',{day:'numeric',month:'short'}):anchor.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 const isCurrent=cycle===periodKey(new Date(),frequency);
 function move(n:number){setAnchor(a=>frequency==='weekly'?new Date(a.getFullYear(),a.getMonth(),a.getDate()+7*n):new Date(a.getFullYear(),a.getMonth()+n,1));}
 const scoped=items.filter(i=>(all||i.company===company)&&i.frequency===frequency&&i.archived===showArchive);
 const doneOf=(i:Item)=>i.completed.includes(cycle);
 const q=query.trim().toLocaleLowerCase('pt-BR');
 const visible=scoped.filter(i=>(!q||i.title.toLocaleLowerCase('pt-BR').includes(q)||(orgOf(i.company)?.name??'').toLocaleLowerCase('pt-BR').includes(q))&&(status==='todos'||(status==='concluidos')===doneOf(i)));
 const groups=useMemo(()=>{const order=[PERSONAL,...orgs.items.map(o=>o.id)];const by=new Map<string,Item[]>();for(const i of visible){if(!by.has(i.company))by.set(i.company,[]);by.get(i.company)!.push(i);}
  return [...by.entries()].sort((a,b)=>(order.indexOf(a[0])+1||99)-(order.indexOf(b[0])+1||99)).map(([id,list])=>({id,list:[...list].sort((a,b)=>Number(doneOf(a))-Number(doneOf(b)))}));},[visible,orgs.items,cycle]); // eslint-disable-line react-hooks/exhaustive-deps
 const done=scoped.filter(doneOf).length;const pct=scoped.length?Math.round(100*done/scoped.length):0;
 function reset(){setTitle('');setIcon('check');setEdit(null);setAdding(false);}
 function open(item?:Item){setAdding(true);setEdit(item?.id??null);setTitle(item?.title??'');setIcon(item?.icon??'check');setTarget(item?.company??(all?orgs.items[0]?.id??'':company));}
 function add(e:React.FormEvent){e.preventDefault();const owner=all||edit?target:company;if(!title.trim()||!ready||!orgOf(owner))return;const next=edit?items.map(i=>i.id===edit?{...i,title:title.trim(),icon,company:owner}:i):[...items,{id:crypto.randomUUID(),company:owner,title:title.trim(),frequency,completed:[],archived:false,icon}];if(commit(next))reset();}
 const toggle=(i:Item,checked:boolean)=>commit(items.map(x=>x.id===i.id?{...x,completed:checked?[...x.completed.filter(c=>c!==cycle),cycle]:x.completed.filter(c=>c!==cycle)}:x));
 const pickColor=ents.colorOf(all||edit?target:company);
 const itemLabel=(i:Item)=>(all?(orgOf(i.company)?.name??'Empresa removida')+' · ':'')+i.title;
 const pendingTitles=showArchive?[]:scoped.filter(i=>!doneOf(i)).map(itemLabel);const doneTitles=showArchive?[]:scoped.filter(doneOf).map(itemLabel);
 const apoioKey=[company,frequency,cycle,showArchive].join('|');const apoioFresh=apoio.key===apoioKey;
 async function prioritize(){const k=apoioKey;setApoio({key:k,state:'loading',text:''});try{const res=await fetch('/api/checklists/apoio',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scope:all?'Todas as empresas':orgOf(company)?.name??company,orgContext:organizationContext(company).slice(0,30000),cycle:cycleLabel,pending:pendingTitles,done:doneTitles})});const d:{text?:unknown;error?:unknown}=await res.json().catch(()=>({}));if(!res.ok||typeof d.text!=='string')throw Error(typeof d.error==='string'?d.error:'Não foi possível falar com a IA agora.');setApoio({key:k,state:'ok',text:d.text});}catch(e){setApoio({key:k,state:'error',text:(e as Error).message||'Não foi possível falar com a IA agora.'});}}

 return <section className="panel company-checklists checklist-v2" aria-label="Checklists por empresa">
  <div className="ckl-head">
   <div><p className="eyebrow">SUA ROTINA</p><h2>Checklist</h2></div>
   <div className="ckl-head-actions"><button className="icon-button" aria-label="Apoio da none" title="Apoio da none" onClick={()=>setHelp(!help)} aria-expanded={help}><Sparkles size={19}/></button><button className="btn-secondary btn-sm" onClick={()=>adding?reset():open()}><Plus size={15}/>Novo item</button></div>
  </div>
  <div className="ckl-toolbar">
   <select aria-label="Empresa" value={company} onChange={e=>{setCompany(e.target.value);reset();}}><option value="all">Todas as empresas</option>{ents.entities.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>
   <div className="cal-modes" role="tablist" aria-label="Periodicidade">{(['weekly','monthly'] as const).map(f=><button key={f} role="tab" aria-selected={frequency===f} onClick={()=>{setFrequency(f);reset();}}>{f==='weekly'?'Semanal':'Mensal'}</button>)}</div>
   <div className="ckl-period"><button className="icon-button" aria-label="Período anterior" onClick={()=>move(-1)}><ChevronLeft size={17}/></button><strong>{cycleLabel}</strong><button className="icon-button" aria-label="Próximo período" onClick={()=>move(1)}><ChevronRight size={17}/></button>{!isCurrent?<button className="text-button" onClick={()=>setAnchor(new Date())}>Atual</button>:null}</div>
  </div>
  <div className="ckl-toolbar ckl-toolbar-2">
   <label className="ckl-search"><Search size={15}/><span className="sr-only">Buscar</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar item ou empresa"/></label>
   <div className="cal-modes" role="tablist" aria-label="Situação">{([['todos','Todos'],['pendentes','Pendentes'],['concluidos','Concluídos']] as const).map(([s,l])=><button key={s} role="tab" aria-selected={status===s} onClick={()=>setStatus(s)}>{l}</button>)}</div>
  </div>
  {!showArchive?<div className="ckl-progress"><div className="audit-progress"><i style={{width:pct+'%'}}/></div><span><b>{done}</b> de {scoped.length} concluídos · {pct}%</span></div>:<p className="ckl-archived-note">Itens arquivados. Restaure para voltar ao checklist.</p>}
  {adding&&<form className="check-add check-add-rich" onSubmit={add}><div className="check-add-row">{(all||edit)&&<select aria-label="Empresa do item" value={target} onChange={e=>setTarget(e.target.value)}>{ents.entities.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>}<label className="sr-only" htmlFor="check-title">Pendência do checklist</label><input autoFocus id="check-title" value={title} maxLength={240} onChange={e=>setTitle(e.target.value)} placeholder="O que precisa ser feito?" required/></div>
   <fieldset className="icon-picker" style={{'--pick':pickColor} as React.CSSProperties}><legend>Ícone</legend><div className="icon-grid">{checklistIcons.map(({key:k,label,Icon})=><button type="button" key={k} aria-label={label} title={label} aria-pressed={icon===k} onClick={()=>setIcon(k)}><Icon size={18}/></button>)}</div></fieldset>
   <div className="check-add-actions"><button className="primary" disabled={!ready||!orgs.ready||!title.trim()}>{edit?'Salvar':'Adicionar'}</button><button type="button" className="text-button" onClick={reset}>Cancelar</button></div></form>}
  {groups.length?<div className="ckl-groups">{groups.map(({id,list})=>{const org=orgOf(id);const color=org?.color??'#8a968d';const total=scoped.filter(i=>i.company===id);const d=total.filter(doneOf).length;return <div className="ckl-group" key={id} style={{'--c':color} as React.CSSProperties}>
    <div className="ckl-group-head"><button className="ckl-dot" aria-label={'Cor de '+(org?.name??'empresa')} title="Mudar cor" aria-expanded={colorFor===id} disabled={!org} onClick={()=>setColorFor(colorFor===id?null:id)}/><b>{org?.name??'Empresa removida'}</b><small>{d}/{total.length}</small></div>
    {colorFor===id&&org?<div className="ckl-palette" role="group" aria-label={'Cores para '+org.name}>{companyPalette.map(c=><button key={c.hex} style={{background:c.hex}} aria-label={c.label} title={c.label} aria-pressed={org.color===c.hex} onClick={()=>{ents.setColor(id,c.hex);setColorFor(null);setNotice('Cor de '+org.name+' atualizada em todo o none OS.');}}>{org.color===c.hex?<Check size={13}/>:null}</button>)}</div>:null}
    <ul>{list.map(i=>{const Icon=checklistIcon(i.icon);const isDone=doneOf(i);return <li key={i.id} className={isDone?'is-done':''}>
      <label><input type="checkbox" disabled={!ready||showArchive} checked={isDone} onChange={e=>toggle(i,e.target.checked)}/><Icon size={15} className="ckl-icon"/><span>{i.title}</span></label>
      <div className="ckl-tools">{!showArchive&&gcal.state!=='nao_configurado'?<button className="icon-button" aria-label={'Agendar '+i.title} title="Agendar" onClick={()=>setPreset({title:i.title,allDay:true,date:localDate(new Date()),company:i.company})}><CalendarPlus size={14}/></button>:null}<button className="icon-button" aria-label={'Editar '+i.title} title="Editar" onClick={()=>open(i)}><Pencil size={14}/></button><button className="icon-button" aria-label={(showArchive?'Restaurar ':'Arquivar ')+i.title} title={showArchive?'Restaurar':'Arquivar'} onClick={()=>commit(items.map(x=>x.id===i.id?{...x,archived:!x.archived}:x),showArchive?'Item restaurado.':'Item arquivado.')}>{showArchive?<ArchiveRestore size={14}/>:<Archive size={14}/>}</button></div>
    </li>;})}</ul>
   </div>;})}</div>
  :<div className="check-empty"><CheckSquare size={26}/><p>{scoped.length?'Nenhum item neste filtro.':showArchive?'Nenhum item arquivado.':'Seu checklist começa com um próximo passo.'}</p><small>{scoped.length?'Mude a busca ou a situação.':all?'Use “Novo item” e escolha a empresa de cada um.':'Adicione os itens que se repetem nesta empresa.'}</small></div>}
  <div className="check-bottom"><button className="text-button" onClick={()=>setShowArchive(!showArchive)}>{showArchive?'Ver ativos':'Arquivados'}</button><span>{frequency==='weekly'?'Itens semanais':'Itens mensais'} · conclusão registrada por período · salvo automaticamente</span></div>
  {help&&<aside className="check-help" aria-busy={apoio.state==='loading'}><h3>Apoio da none</h3>{ai==='nao_configurado'?<><p>IA não conectada. Estas são as pendências do período para você priorizar:</p><pre>{pendingTitles.map(t=>'☐ '+t).join('\n')||'Nenhuma pendência neste período.'}</pre></>:<><p>A none prioriza as pendências de {cycleLabel.toLocaleLowerCase('pt-BR')} usando apenas este checklist e o cadastro {all?'das empresas':'da empresa'}.</p><div className="check-help-actions"><button className="primary" disabled={apoio.state==='loading'||!orgs.ready||!scoped.length||showArchive} onClick={prioritize}><Sparkles size={15}/>{apoio.state==='loading'?'Priorizando…':apoioFresh&&apoio.state==='ok'?'Priorizar de novo':'Priorizar pendências'}</button><small>{pendingTitles.length} pendentes · {doneTitles.length} concluídos{ai==='erro'?' · conexão com a IA não confirmada':''}</small></div>{showArchive&&<p>Volte aos itens ativos para priorizar.</p>}{apoioFresh&&apoio.state==='error'&&<p className="check-help-error" role="alert">{apoio.text}</p>}{apoioFresh&&apoio.state==='ok'&&<div className="check-help-answer" role="status">{apoio.text}</div>}</>}</aside>}
  <p role="status" className="check-hint">{notice}</p>
  {preset?<NewEventDialog google={gcal.state} preset={preset} onClose={()=>setPreset(null)} onCreated={()=>setNotice('Evento criado. Ele aparece na agenda abaixo.')}/>:null}
 </section>;
}
