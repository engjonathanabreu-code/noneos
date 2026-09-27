'use client';
import {useEffect,useRef,useState} from 'react';
import {Building2,Check,CheckCheck,ChevronRight,Clock3,Pencil,Plus,Sparkles,Trash2,X} from 'lucide-react';
import {useOrganizations,organizationContext,type Organization} from '@/lib/organizations';
import {organizationLogo,companyColor} from '@/lib/brand';
import {useDecisions,newDecision,statusLabel,eventLabel,type DecisionItem,type Priority} from '@/lib/decisions';
import type {DecisionStatus} from '@/lib/domain';

function Badge({children,tone='neutral'}:{children:React.ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>;}
function OrgMark({org}:{org?:Organization}){if(!org)return <span aria-hidden="true" className="company-mark small"><Building2 size={16}/></span>;const logo=organizationLogo(org);if(logo)return <img src={logo} alt="" aria-hidden="true" className="company-logo small"/>;const c=companyColor(org);return <span aria-hidden="true" className="company-mark small" style={{background:c+'24',color:c}}>{org.name.slice(0,2).toUpperCase()}</span>;}
const dueLabel=(d:string)=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'}):'Sem prazo';

function Dialog({eyebrow,title,onClose,children}:{eyebrow:string;title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className="modal" aria-labelledby="decision-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-heading"><span className="eyebrow">{eyebrow}</span><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div><h2 id="decision-title">{title}</h2>{children}</dialog>;
}

function DecisionRow({d,org,onClick}:{d:DecisionItem;org?:Organization;onClick:()=>void}){
  const done=d.status!=='pending';
  return <button className="decision-row" onClick={onClick}><OrgMark org={org}/><div className="decision-copy"><small>{org?.name??'Organização removida'}</small><h3>{d.title}</h3><p>{d.context||'Sem contexto registrado.'}</p></div><div className="decision-tail"><Badge tone={done?'green':d.priority==='Alta'?'amber':'neutral'}>{done?statusLabel[d.status]:d.priority}</Badge><small>{done?new Date(d.updatedAt).toLocaleDateString('pt-BR'):dueLabel(d.due)}</small></div><ChevronRight className="row-arrow" size={17}/></button>;
}

// Full decisions area. With companyId it shows only that company (company detail tabs).
export function Decisions({companyId,compact=false}:{companyId?:string;compact?:boolean}){
  const {items:orgs}=useOrganizations();
  const store=useDecisions();
  const [filter,setFilter]=useState<DecisionStatus|'all'>('pending');
  const [company,setCompany]=useState(companyId??'all');
  const [open,setOpen]=useState<string|null>(null);
  const [draft,setDraft]=useState<DecisionItem|null>(null);
  const [notice,setNotice]=useState('');
  const orgOf=(id:string)=>orgs.find(o=>o.id===id);
  const scope=companyId??company;
  const list=store.items.filter(d=>(scope==='all'||d.companyId===scope)&&(filter==='all'||d.status===filter)).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||b.createdAt.localeCompare(a.createdAt));
  const audit=store.audit.filter(a=>scope==='all'||a.companyId===scope);
  const active=store.items.find(d=>d.id===open)??null;
  function act(fn:()=>void,ok:string){try{fn();setNotice(ok);}catch{setNotice('Não foi possível salvar. Os dados anteriores foram preservados.');}}
  const counts=Object.fromEntries((['pending','approved','deferred','rejected'] as const).map(s=>[s,store.items.filter(d=>(scope==='all'||d.companyId===scope)&&d.status===s).length]));
  const create=()=>{setOpen(null);setDraft(newDecision(scope!=='all'?scope:orgs[0]?.id??'integral'));};

  return <>
    {!compact&&<div className="page-heading"><div><p className="eyebrow">DO CONTEXTO À AÇÃO</p><h1>As decisões passam por você.</h1><p>Registre o que precisa decidir, peça a análise da none e acompanhe o histórico.</p></div><button className="primary" disabled={!store.ready} onClick={create}><Plus size={17}/>Nova decisão</button></div>}
    {(store.error||notice)&&<p role="status" className="storage-warning">{store.error||notice}</p>}
    <div className="decision-filters"><div className="filter-row">{([['pending','Pendentes'],['approved','Aprovadas'],['deferred','Adiadas'],['rejected','Não aprovadas'],['all','Todas']] as const).map(([id,label])=><button key={id} aria-pressed={filter===id} className={filter===id?'selected':''} onClick={()=>setFilter(id)}>{label}{id!=='all'?<span>{counts[id]}</span>:null}</button>)}</div>{companyId?<button className="btn-secondary btn-sm" disabled={!store.ready} onClick={create}><Plus size={15}/>Nova decisão</button>:<select aria-label="Filtrar decisões por empresa" value={company} onChange={e=>setCompany(e.target.value)}><option value="all">Todas as empresas</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select>}</div>
    <section className="panel">{list.length?list.map(d=><DecisionRow key={d.id} d={d} org={orgOf(d.companyId)} onClick={()=>setOpen(d.id)}/>):<div className="empty"><CheckCheck size={28}/><h3>{store.items.length?'Nenhuma decisão neste filtro':'Nenhuma decisão registrada'}</h3><p>{store.items.length?'Escolha outro status ou outra empresa.':'Use “Nova decisão” para registrar o que precisa do seu olhar.'}</p></div>}</section>
    {!compact&&<section className="panel history"><div className="section-header"><h2>Histórico de decisões</h2><Badge>{audit.length} {audit.length===1?'registro':'registros'}</Badge></div>{audit.length?audit.slice(0,60).map(a=><div className="history-row" key={a.id}><span className="history-check"><Check size={16}/></span><div><h3>{a.title||'Decisão'}</h3><p>{eventLabel[a.status]} · {new Date(a.at).toLocaleString('pt-BR')}</p>{a.note?<blockquote>{a.note}</blockquote>:null}</div></div>):<p className="history-empty">Suas escolhas aparecerão aqui.</p>}</section>}
    {active&&!draft?<DecisionDetail d={active} org={orgOf(active.companyId)} onClose={()=>setOpen(null)} onEdit={()=>setDraft({...active})}
      onDecide={(s,note)=>{act(()=>store.decide(active.id,s,note),s==='pending'?'Decisão reaberta.':`Decisão registrada: ${statusLabel[s].toLowerCase()}.`);setOpen(null);}}
      onRemove={()=>{act(()=>store.remove(active.id),'Decisão excluída. O registro permanece no histórico.');setOpen(null);}}
      onAnalysis={text=>act(()=>store.save({...active,recommendation:text}),'Análise da none salva na decisão.')}/>:null}
    {draft?<DecisionForm draft={draft} orgs={orgs} isNew={!store.items.some(d=>d.id===draft.id)} onClose={()=>setDraft(null)} onSave={d=>{act(()=>store.save(d),'Decisão salva.');setDraft(null);setOpen(d.id);}}/>:null}
  </>;
}

function DecisionForm({draft,orgs,isNew,onClose,onSave}:{draft:DecisionItem;orgs:Organization[];isNew:boolean;onClose:()=>void;onSave:(d:DecisionItem)=>void}){
  const [d,setD]=useState(draft);
  const field=(k:'context'|'options'|'impact',label:string,ph:string)=><label className="field-label decision-field">{label}<textarea maxLength={4000} value={d[k]} placeholder={ph} onChange={e=>setD({...d,[k]:e.target.value})}/></label>;
  return <Dialog eyebrow="NONE / DECISÃO" title={isNew?'Nova decisão':'Editar decisão'} onClose={onClose}>
    <form className="decision-form" onSubmit={e=>{e.preventDefault();if(d.title.trim())onSave({...d,title:d.title.trim()});}}>
      <label className="field-label decision-field">Título<input required maxLength={200} value={d.title} onChange={e=>setD({...d,title:e.target.value})} placeholder="Ex.: Contratar mais um projetista"/></label>
      <div className="decision-form-row">
        <label className="field-label decision-field">Empresa<select value={d.companyId} onChange={e=>setD({...d,companyId:e.target.value})}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        <label className="field-label decision-field">Prioridade<select value={d.priority} onChange={e=>setD({...d,priority:e.target.value as Priority})}><option>Alta</option><option>Média</option><option>Baixa</option></select></label>
        <label className="field-label decision-field">Prazo<input type="date" value={d.due} onChange={e=>setD({...d,due:e.target.value})}/></label>
      </div>
      {field('context','Contexto','O que aconteceu e por que a decisão é necessária.')}
      {field('options','Alternativas','Opções consideradas, valores e condições.')}
      {field('impact','Impacto e limites','O que muda, riscos e o que não pode acontecer.')}
      <div className="decision-actions"><button type="button" className="outline" onClick={onClose}>Cancelar</button><button className="primary" disabled={!d.title.trim()||!d.companyId}><Check size={16}/>Salvar decisão</button></div>
    </form>
  </Dialog>;
}

function DecisionDetail({d,org,onClose,onEdit,onDecide,onRemove,onAnalysis}:{d:DecisionItem;org?:Organization;onClose:()=>void;onEdit:()=>void;onDecide:(s:DecisionStatus,note:string)=>void;onRemove:()=>void;onAnalysis:(text:string)=>void}){
  const [note,setNote]=useState(d.note);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [confirm,setConfirm]=useState(false);
  async function analyse(){
    setBusy(true);setError('');
    try{
      const r=await fetch('/api/decisoes/analise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:d.companyId,companyName:org?.name??'',orgContext:organizationContext(d.companyId),title:d.title,context:d.context,options:d.options,impact:d.impact,priority:d.priority,due:d.due})});
      const j=await r.json().catch(()=>({})) as {text?:string;error?:string};
      if(!r.ok||!j.text){setError(j.error??'Não foi possível analisar agora.');return;}
      onAnalysis(j.text);
    }catch{setError('Sem conexão com o servidor. Tente novamente.');}
    finally{setBusy(false);}
  }
  return <Dialog eyebrow="NONE / DECISÃO" title={d.title} onClose={onClose}>
    <div className="modal-meta"><Badge tone="green">{org?.name??'Organização removida'}</Badge><Badge tone={d.priority==='Alta'?'amber':'neutral'}>Prioridade {d.priority.toLowerCase()}</Badge><Badge>{statusLabel[d.status]}</Badge>{d.due?<Badge>Prazo {dueLabel(d.due)}</Badge>:null}</div>
    {d.context?<div className="modal-section"><h3>Contexto</h3><p className="pre-line">{d.context}</p></div>:null}
    {d.options?<div className="modal-section"><h3>Alternativas</h3><p className="pre-line">{d.options}</p></div>:null}
    {d.impact?<div className="modal-section"><h3>Impacto e limites</h3><p className="pre-line">{d.impact}</p></div>:null}
    <div className="recommendation"><Sparkles size={21}/><div><h3>Análise da none</h3>{d.recommendation?<p className="pre-line">{d.recommendation}</p>:<p>Peça uma análise com base no cadastro da empresa e nos indicadores conectados.</p>}<button className="btn-ghost btn-sm" disabled={busy} onClick={analyse}><Sparkles size={14}/>{busy?'Analisando…':d.recommendation?'Analisar de novo':'Pedir análise da none'}</button>{error?<p role="alert" className="check-help-error">{error}</p>:null}</div></div>
    <label className="field-label" htmlFor="decision-note">Sua observação <span>(opcional)</span></label>
    <textarea id="decision-note" value={note} onChange={e=>setNote(e.target.value)} maxLength={600} placeholder="Registre o contexto da sua decisão…"/>
    <p className="source-note">Registrada em {new Date(d.createdAt).toLocaleString('pt-BR')} · atualizada em {new Date(d.updatedAt).toLocaleString('pt-BR')}. Registrar a decisão não executa nenhuma ação externa.</p>
    <div className="decision-actions"><button className="text-button danger" onClick={()=>onDecide('rejected',note)}>Não aprovar</button><button className="outline" onClick={()=>onDecide('deferred',note)}><Clock3 size={16}/>Adiar</button><button className="primary" onClick={()=>onDecide('approved',note)}><Check size={16}/>Aprovar</button></div>
    <div className="decision-manage">{d.status!=='pending'?<button className="text-button" onClick={()=>onDecide('pending',note)}>Reabrir decisão</button>:null}<button className="text-button" onClick={onEdit}><Pencil size={15}/>Editar</button>{confirm?<><span>Excluir esta decisão?</span><button className="text-button danger" onClick={onRemove}>Sim, excluir</button><button className="text-button" onClick={()=>setConfirm(false)}>Cancelar</button></>:<button className="text-button danger" onClick={()=>setConfirm(true)}><Trash2 size={15}/>Excluir</button>}</div>
  </Dialog>;
}

export function usePendingDecisions(){const {items}=useDecisions();return items.filter(d=>d.status==='pending').length;}
