'use client';
import {useEffect,useRef,useState} from 'react';
import {ArrowDownLeft,ArrowUpRight,Box,Check,ClipboardCheck,Download,FileText,Landmark,PenLine,Pencil,Plus,Printer,ShieldCheck,Sparkles,Target,Trash2,Upload,Users,X} from 'lucide-react';
import {AuditEditor} from '@/components/audit-editor';
import type {LucideIcon} from 'lucide-react';
import {useOrganizations,organizationContext,type Organization} from '@/lib/organizations';
import {companyColor} from '@/lib/brand';
import {useDecisions,newDecision} from '@/lib/decisions';
import {answerOptions,answered,auditCalculations,auditMetrics,auditStatus,choicesOf,cleanAuditData,financeFields,isAudit,isOperation,kpiUnits,operationTypes,sectionsOf,type Audit,type AuditAnswer,type AuditKind,type AuditTemplate} from '@/lib/audit';

// Audits live under none-auditorias-v1 and sync one document per audit (see workspace-sync).
const auditKey = 'none-auditorias-v1';
const areaIcon:Record<string,LucideIcon> = {legal:FileText,food:ShieldCheck,team:Users,operation:Box,money:Landmark,deal:Target};

function read():Audit[]{const raw=localStorage.getItem(auditKey);if(!raw)return [];const v=JSON.parse(raw) as {version?:number;items?:unknown[]};if(v.version!==1||!Array.isArray(v.items))throw Error('invalid');return v.items.filter(isAudit);}

export function useAudits(){
  const [items,setItems]=useState<Audit[]>([]);
  const [ready,setReady]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{const load=()=>{try{setItems(read());setReady(true);setError('');}catch{setReady(false);setError('Não foi possível ler as auditorias salvas. Os dados foram preservados.');}};load();window.addEventListener('none-audits',load);return()=>window.removeEventListener('none-audits',load);},[]);
  function commit(change:(list:Audit[])=>Audit[]){
    if(!ready) throw Error('Auditorias indisponíveis.');
    const next=change(read());
    localStorage.setItem(auditKey,JSON.stringify({version:1,items:next}));
    setItems(next);window.dispatchEvent(new Event('none-audits'));
  }
  return {
    items,ready,error,
    save(a:Audit){commit(list=>{const item={...a,updatedAt:new Date().toISOString()};return list.some(x=>x.id===a.id)?list.map(x=>x.id===a.id?item:x):[item,...list];});},
    remove(id:string){commit(list=>list.filter(x=>x.id!==id));}
  };
}

const brl=(n:number|null)=>n===null?'Não informado':n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dateBR=(d?:string)=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'Data não informada';
const kindLabel=(a:Pick<Audit,'kind'|'template'>)=>isOperation(a)?'Operação · gerada pela IA':'Investimento';
function blankAudit(companyId:string,org?:Organization):Audit{const now=new Date().toISOString();return {id:crypto.randomUUID(),companyId,createdAt:now,updatedAt:now,kind:'investimento',meta:{company:org?.name??''},answers:{},finance:{},decision:{}};}

// Asks the Executive agent to build an operating audit from the company's data and the MBA base.
async function generateTemplate(org:Organization,focus:string):Promise<AuditTemplate>{
  const r=await fetch('/api/auditorias/gerar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:org.id,companyName:org.name,orgContext:organizationContext(org.id),focus})});
  const j=await r.json().catch(()=>({})) as {template?:AuditTemplate;error?:string};
  if(!r.ok||!j.template)throw Error(j.error??'Não foi possível gerar a auditoria agora.');
  return j.template;
}

function Dialog({title,eyebrow,onClose,children}:{title:string;eyebrow:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
  return <dialog ref={ref} className="modal" aria-labelledby="audit-dialog-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-heading"><span className="eyebrow">{eyebrow}</span><button className="icon-button" onClick={onClose} aria-label="Fechar"><X size={20}/></button></div><h2 id="audit-dialog-title">{title}</h2>{children}</dialog>;
}

function Stats({audit}:{audit:Audit}){
  const m=auditMetrics(audit);
  return <div className="audit-stats"><div><strong>{m.done}<small> / {m.items.length}</small></strong><span>Itens respondidos</span></div><div className={m.critical.length?'is-alert':''}><strong>{m.critical.length}</strong><span>Alertas críticos</span></div><div><strong>{m.verified.length}</strong><span>“Sim” comprovados</span></div></div>;
}

// List of audits (all companies, or one company inside its page).
export function Audits({companyId}:{companyId?:string}){
  const {items:orgs}=useOrganizations();
  const store=useAudits();
  const [open,setOpen]=useState<string|null>(null);
  const [openTab,setOpenTab]=useState<Tab>('visita');
  const [removing,setRemoving]=useState<string|null>(null);
  const [creating,setCreating]=useState<'new'|'import'|null>(null);
  const [filter,setFilter]=useState(companyId??'all');
  const [notice,setNotice]=useState('');
  const orgOf=(id:string)=>orgs.find(o=>o.id===id);
  const active=store.items.find(a=>a.id===open);
  const list=store.items.filter(a=>(companyId??filter)==='all'||a.companyId===(companyId??filter));
  function act(fn:()=>void,ok:string){try{fn();setNotice(ok);}catch{setNotice('Não foi possível salvar. Os dados anteriores foram preservados.');}}
  const openAudit=(id:string,t:Tab='visita')=>{setOpenTab(t);setOpen(id);};
  if(active) return <AuditDetail key={active.id} initialTab={openTab} audit={active} org={orgOf(active.companyId)} orgs={orgs} onBack={()=>setOpen(null)} onSave={a=>store.save(a)} onRemove={()=>{act(()=>store.remove(active.id),'Auditoria excluída.');setOpen(null);}}/>;
  return <>
    {!companyId&&<div className="page-heading"><div><p className="eyebrow">NONE / AUDITORIA</p><h1>Antes de decidir, olhe por dentro.</h1><p>Empresas em operação recebem uma auditoria avançada montada pelo agente Executivo com os dados da empresa e o material do seu MBA. Novos investimentos usam o checklist de aquisição.</p></div><div className="card-actions"><button className="btn-ghost" disabled={!store.ready} onClick={()=>setCreating('import')}><Upload size={16}/>Importar do app antigo</button><button className="primary" disabled={!store.ready} onClick={()=>setCreating('new')}><Plus size={17}/>Nova auditoria</button></div></div>}
    {(store.error||notice)&&<p role="status" className="storage-warning">{store.error||notice}</p>}
    {companyId?<div className="section-header"><h2>Auditorias da empresa</h2><div className="card-actions"><button className="btn-ghost btn-sm" disabled={!store.ready} onClick={()=>setCreating('import')}><Upload size={14}/>Importar</button><button className="btn-secondary btn-sm" disabled={!store.ready} onClick={()=>setCreating('new')}><Plus size={14}/>Nova auditoria</button></div></div>
      :<div className="decision-filters"><select aria-label="Filtrar por empresa" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Todas as empresas</option>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></div>}
    {list.length?<div className="audit-grid">{list.map(a=>{const m=auditMetrics(a);const org=orgOf(a.companyId);const c=companyColor(org);return <article key={a.id} className="panel audit-card"><button className="audit-card-main" onClick={()=>openAudit(a.id)}>
      <div className="audit-card-top"><span className="company-mark small" style={{background:c+'24',color:c}}>{(org?.name??'?').slice(0,2).toUpperCase()}</span><span className="badge">{kindLabel(a)}</span></div>
      <h2>{a.meta.company||org?.name||'Auditoria'}</h2><small>{org?.name??'Empresa removida'} · {dateBR(a.meta.date)}</small>
      <div className="audit-progress" aria-label={`${m.done} de ${m.items.length} respondidos`}><i style={{width:`${100*m.done/m.items.length}%`}}/></div>
      <p><span className={m.critical.length?'audit-status is-alert':'audit-status'}>{auditStatus(a)}</span> · {m.done} de {m.items.length} itens · {m.critical.length} {m.critical.length===1?'alerta crítico':'alertas críticos'}</p>
      <span className="audit-open">Abrir auditoria<ArrowUpRight size={16}/></span></button>
      <div className="audit-card-actions">{removing===a.id?<><span>Excluir esta auditoria?</span><button className="text-button danger" onClick={()=>{act(()=>store.remove(a.id),'Auditoria excluída.');setRemoving(null);}}>Sim, excluir</button><button className="text-button" onClick={()=>setRemoving(null)}>Cancelar</button></>:<><button className="text-button" onClick={()=>openAudit(a.id,'estrutura')}><Pencil size={14}/>Editar</button><button className="text-button danger" onClick={()=>setRemoving(a.id)}><Trash2 size={14}/>Excluir</button></>}</div>
    </article>;})}</div>
    :<div className="panel empty"><ClipboardCheck size={28}/><h3>{store.items.length?'Nenhuma auditoria nesta empresa':'Nenhuma auditoria ainda'}</h3><p>Crie uma auditoria ou importe o backup (.json) exportado no app antigo em Ferramentas → Exportar auditoria.</p></div>}
    {creating?<CreateDialog mode={creating} orgs={orgs} defaultCompany={companyId??(filter!=='all'?filter:undefined)} onClose={()=>setCreating(null)} onCreate={a=>{act(()=>store.save(a),creating==='import'?'Auditoria importada e ligada à empresa.':'Auditoria criada.');setCreating(null);setOpen(a.id);}}/>:null}
  </>;
}

function CreateDialog({mode,orgs,defaultCompany,onClose,onCreate}:{mode:'new'|'import';orgs:Organization[];defaultCompany?:string;onClose:()=>void;onCreate:(a:Audit)=>void}){
  const initial=defaultCompany??orgs.find(o=>o.id==='bergamota')?.id??orgs[0]?.id??'';
  const [company,setCompany]=useState(initial);
  const org=orgs.find(o=>o.id===company);
  const [kind,setKind]=useState<AuditKind>(org?.status==='Em operação'?'operacao':'investimento');
  const [focus,setFocus]=useState('');
  const [busy,setBusy]=useState(false);
  const [data,setData]=useState<ReturnType<typeof cleanAuditData>|null>(null);
  const [error,setError]=useState('');
  function pickCompany(id:string){setCompany(id);if(mode==='new')setKind(orgs.find(o=>o.id===id)?.status==='Em operação'?'operacao':'investimento');}
  async function pick(file?:File){
    setError('');setData(null);if(!file)return;
    try{if(file.size>15000000)throw Error();const v=cleanAuditData(JSON.parse(await file.text()));setData(v);
      const name=(v.meta.company??'').toLocaleLowerCase();const match=orgs.find(o=>name&&(name.includes(o.name.toLocaleLowerCase())||o.name.toLocaleLowerCase().includes(name)));if(match&&!defaultCompany)setCompany(match.id);
    }catch{setError('Arquivo inválido ou maior que 15 MB. Use o backup exportado pelo app de auditoria.');}
  }
  async function submit(){
    if(!org||busy)return;setError('');
    const base=blankAudit(company,org);
    if(mode==='import'){if(data)onCreate({...base,...data});return;}
    if(kind==='investimento'){onCreate(base);return;}
    setBusy(true);
    try{const template=await generateTemplate(org,focus.trim());onCreate({...base,kind:'operacao',template,meta:{company:org.name}});}
    catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  }
  const m=data?auditMetrics(data):null;
  return <Dialog eyebrow="NONE / AUDITORIA" title={mode==='import'?'Importar auditoria':'Nova auditoria'} onClose={()=>{if(!busy)onClose();}}>
    <form className="decision-form" onSubmit={e=>{e.preventDefault();void submit();}}>
      <label className="field-label decision-field">Empresa<select value={company} disabled={busy} onChange={e=>pickCompany(e.target.value)}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name} · {o.status}</option>)}</select></label>
      {mode==='import'?<><p className="source-note">No app antigo (none auditoria), abra Ferramentas → Exportar auditoria e escolha o arquivo aqui. Respostas, notas, anotações à mão, números e decisão são mantidos.</p>
        <label className="field-label decision-field">Arquivo de backup (.json)<input type="file" accept="application/json,.json" onChange={e=>void pick(e.target.files?.[0])}/></label>
        {data&&m?<p className="audit-import-preview"><Check size={15}/>{data.meta.company||'Auditoria'} · {data.meta.city||'município não informado'} · {m.done} de {m.items.length} itens · {m.critical.length} alertas críticos</p>:null}</>
      :<><fieldset className="audit-kind"><legend className="field-label">Tipo de auditoria</legend>
          <label className={kind==='operacao'?'selected':''}><input type="radio" name="kind" checked={kind==='operacao'} disabled={busy} onChange={()=>setKind('operacao')}/><span><b><Sparkles size={15}/>Operação · avançada</b><small>O agente Executivo monta áreas, perguntas e indicadores para esta empresa, com os dados dela e o material do seu MBA.</small></span></label>
          <label className={kind==='investimento'?'selected':''}><input type="radio" name="kind" checked={kind==='investimento'} disabled={busy} onChange={()=>setKind('investimento')}/><span><b><ClipboardCheck size={15}/>Investimento · aquisição</b><small>Checklist padrão de 50 itens para avaliar a compra de uma fábrica ou confeitaria, com simulação de retorno.</small></span></label>
        </fieldset>
        {kind==='operacao'?<label className="field-label decision-field">Foco <span>(opcional)</span><textarea maxLength={1000} value={focus} disabled={busy} onChange={e=>setFocus(e.target.value)} placeholder="Ex.: margem e custos, processos da equipe técnica, crescimento comercial…"/></label>:null}</>}
      {busy?<p className="audit-generating" role="status"><Sparkles size={15}/>O agente está montando a auditoria com os dados de {org?.name} e o material do MBA. Isso leva de 1 a 3 minutos.</p>:null}
      {error?<p role="alert" className="check-help-error">{error}</p>:null}
      <div className="decision-actions"><button type="button" className="outline" disabled={busy} onClick={onClose}>Cancelar</button><button className="primary" disabled={!company||busy||(mode==='import'&&!data)}>{mode==='import'?<><Upload size={16}/>Importar</>:kind==='operacao'?<><Sparkles size={16}/>{busy?'Gerando…':'Gerar auditoria'}</>:<><Plus size={16}/>Criar auditoria</>}</button></div>
    </form>
  </Dialog>;
}

type Tab='visita'|'checklist'|'numeros'|'diagnostico'|'estrutura';
function AuditDetail({audit,org,orgs,initialTab='visita',onBack,onSave,onRemove}:{audit:Audit;org?:Organization;orgs:Organization[];initialTab?:Tab;onBack:()=>void;onSave:(a:Audit)=>void;onRemove:()=>void}){
  const [a,setA]=useState(audit);
  const [tab,setTab]=useState<Tab>(initialTab);
  const [area,setArea]=useState(0);
  const [confirm,setConfirm]=useState(false);
  const [notice,setNotice]=useState('');
  const {save:saveDecision}=useDecisions();
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const latest=useRef(a);
  const saveRef=useRef(onSave);saveRef.current=onSave;
  const op=isOperation(a), sections=sectionsOf(a);
  // Save shortly after typing stops, and on leaving the screen.
  function update(next:Audit){setA(next);latest.current=next;if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{timer.current=null;try{saveRef.current(next);}catch{setNotice('Não foi possível salvar. Exporte uma cópia da auditoria.');}},500);}
  useEffect(()=>()=>{if(timer.current){clearTimeout(timer.current);try{saveRef.current(latest.current);}catch{}}},[]);
  // A newer version arrived (other device or our own save): adopt it unless an edit is still pending.
  useEffect(()=>{if(!timer.current&&audit.updatedAt!==latest.current.updatedAt){setA(audit);latest.current=audit;}},[audit]);
  const setGroup=(g:'meta'|'finance'|'decision',k:string,v:string)=>update({...a,[g]:{...a[g],[k]:v}});
  const setAnswer=(id:string,patch:Partial<AuditAnswer>)=>update({...a,answers:{...a.answers,[id]:{...a.answers[id],...patch}}});
  const go=(t:Tab,i?:number)=>{setTab(t);if(i!==undefined)setArea(i);window.scrollTo({top:0,behavior:'instant'});};
  function exportJson(){const {meta,answers,finance,decision,kind,template}=a;const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,kind,template,meta,answers,finance,decision},null,2)],{type:'application/json'}));const el=document.createElement('a');el.href=url;el.download='auditoria-none-'+(a.meta.company||org?.name||'empresa').replace(/[^\p{L}\p{N} _-]/gu,'').trim().slice(0,40)+'.json';el.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
  function toDecision(){
    const m=auditMetrics(a),d=newDecision(a.companyId);
    const numbers=op?a.template!.kpis.filter(k=>a.finance['kpi:'+k.id]||k.current).slice(0,6).map(k=>`${k.name}: ${a.finance['kpi:'+k.id]||k.current}${a.finance['meta:'+k.id]?' (meta '+a.finance['meta:'+k.id]+')':''}`).join('; ')||'Indicadores ainda não preenchidos.'
      :(()=>{const c=auditCalculations(a.finance);return `Resultado mensal estimado ${brl(c.profit)}; capital total ${brl(c.total)}; retorno simples ${c.payback===null?'não calculado':c.payback.toFixed(1)+' meses'}.`;})();
    try{saveDecision({...d,title:`${op?'Plano da operação':'Investimento'}: ${a.meta.company||org?.name||'empresa auditada'}`,priority:m.critical.length?'Alta':'Média',
      context:`Auditoria ${op?'de operação':'de investimento'} de ${dateBR(a.meta.date)}. ${auditStatus(a)}: ${m.done}/${m.items.length} itens respondidos, ${m.critical.length} alertas críticos, ${m.unknown.length} sem conclusão.${op?' Foco: '+a.template!.focus:''}`,
      options:choicesOf(a).join('; '),impact:numbers+(a.decision.conditions?' Condições: '+a.decision.conditions:'')});
      setNotice('Decisão criada em Decisões. Use “Pedir análise da none” lá: a IA lê esta auditoria.');}
    catch{setNotice('Não foi possível criar a decisão.');}
  }
  const tabs:[Tab,string][]=[['visita',op?'Visão geral':'Visita'],['checklist','Checklist'],['numeros',op?'Indicadores':'Números'],['diagnostico','Diagnóstico'],['estrutura','Estrutura']];
  function saveNow(next:Audit,msg:string){if(timer.current){clearTimeout(timer.current);timer.current=null;}setA(next);latest.current=next;try{saveRef.current(next);setNotice(msg);}catch{setNotice('Não foi possível salvar. Exporte uma cópia da auditoria.');}}
  return <div className="audit-detail">
    <button className="text-button back-button" onClick={onBack}><ArrowDownLeft size={16}/>Todas as auditorias</button>
    <div className="audit-head"><p className="eyebrow">AUDITORIA · {kindLabel(a).toUpperCase()}</p><h1>{a.meta.company||org?.name||'Auditoria'}</h1><p>{org?.name??'Empresa removida'} · {dateBR(a.meta.date)} · <span className={auditMetrics(a).critical.length?'audit-status is-alert':'audit-status'}>{auditStatus(a)}</span></p></div>
    {notice?<p role="status" className="storage-warning">{notice}</p>:null}
    <div className="tabs" role="tablist" aria-label="Partes da auditoria">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={tab===id?'selected':''} onClick={()=>go(id)}>{label}</button>)}</div>
    {tab==='visita'&&<>
      {!op&&org?.status==='Em operação'&&auditMetrics(a).done===0?<Upgrade org={org} onDone={template=>{update({...a,kind:'operacao',template,meta:{...a.meta,company:a.meta.company||org.name}});setNotice('Auditoria avançada gerada para '+org.name+'.');}}/>:null}
      {op?<section className="panel audit-focus"><p className="eyebrow">FOCO DEFINIDO PELO AGENTE EXECUTIVO</p><p>{a.template!.focus}</p>{a.template!.basis.length?<><h3>Bases usadas</h3><ul>{a.template!.basis.map((b,i)=><li key={i}>{b}</li>)}</ul></>:null}<small>Gerada em {new Date(a.template!.generatedAt).toLocaleString('pt-BR')}. As perguntas são um roteiro; ajuste o que não se aplicar com “Não se aplica”.</small></section>:null}
      <section className="panel audit-meta">
        <label className="field-label decision-field">Empresa do portfólio<select value={a.companyId} onChange={e=>update({...a,companyId:e.target.value})}>{orgs.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>
        {([['company',op?'Unidade ou escopo avaliado':'Empresa avaliada',op?'Ex.: operação completa, unidade Ibirama…':'Nome da fábrica ou confeitaria','text'],['city','Município / UF','Ex.: Ibirama / SC','text'],['date',op?'Data da auditoria':'Data da visita','','date'],['auditor','Responsável pela auditoria','Seu nome','text'],['contact',op?'Pessoas entrevistadas':'Pessoa entrevistada','Nome e função','text']] as const).map(([k,l,ph,t])=><label key={k} className="field-label decision-field">{l}<input type={t} value={a.meta[k]??''} placeholder={ph} onChange={e=>setGroup('meta',k,e.target.value)}/></label>)}
        {!op?<label className="field-label decision-field">Tipo de operação<select value={a.meta.type??''} onChange={e=>setGroup('meta','type',e.target.value)}><option value="">Selecionar</option>{operationTypes.map(t=><option key={t}>{t}</option>)}</select></label>:null}
      </section>
      <Stats audit={a}/>
      <div className="audit-section-title"><h2>Áreas da auditoria</h2><button className="primary" onClick={()=>go('checklist',Math.max(0,sections.findIndex(s=>s.qs.some((_,i)=>!answered(a.answers[s.id+'-'+i]??{})))))}>{auditMetrics(a).done?'Continuar':'Começar'}<ArrowUpRight size={16}/></button></div>
      <div className="audit-areas">{sections.map((s,i)=>{const n=s.qs.filter((_,j)=>answered(a.answers[s.id+'-'+j]??{})).length;const alerts=s.qs.filter((_,j)=>a.answers[s.id+'-'+j]?.value==='Não').length;const Icon=areaIcon[s.id]??ClipboardCheck;return <button key={s.id} className="panel audit-area" onClick={()=>go('checklist',i)}><span className="stat-icon"><Icon size={20}/></span><h3>{s.name}</h3><small>{s.desc}</small><div className="audit-progress"><i style={{width:`${100*n/s.qs.length}%`}}/></div><small>{n} de {s.qs.length} respondidas{alerts?` · ${alerts} ${alerts===1?'alerta':'alertas'}`:''}</small></button>;})}</div>
    </>}
    {tab==='checklist'&&<Checklist audit={a} area={area} setArea={i=>go('checklist',i)} setAnswer={setAnswer} onDone={()=>go('diagnostico')}/>}
    {tab==='numeros'&&(op?<Kpis audit={a} set={(k,v)=>setGroup('finance',k,v)} onNext={()=>go('diagnostico')}/>:<Numbers audit={a} set={(k,v)=>setGroup('finance',k,v)} onNext={()=>go('diagnostico')}/>)}
    {tab==='estrutura'&&<AuditEditor audit={a} onCancel={()=>go('visita')} onSave={next=>{saveNow(next,'Estrutura da auditoria salva.');go('visita');}}/>}
    {tab==='diagnostico'&&<Diagnosis audit={a} setDecision={(k,v)=>setGroup('decision',k,v)} onNumbers={()=>go('numeros')} onArea={i=>go('checklist',i)}/>}
    <div className="audit-actions card-actions">
      <button className="btn-secondary btn-sm" onClick={toDecision}><Target size={14}/>Criar decisão com esta auditoria</button>
      <button className="btn-ghost btn-sm" onClick={()=>{go('diagnostico');setTimeout(()=>window.print(),300);}}><Printer size={14}/>Imprimir / PDF</button>
      <button className="btn-ghost btn-sm" onClick={exportJson}><Download size={14}/>Exportar (.json)</button>
      {confirm?<><span className="audit-confirm">Excluir esta auditoria?</span><button className="text-button danger" onClick={onRemove}>Sim, excluir</button><button className="text-button" onClick={()=>setConfirm(false)}>Cancelar</button></>:<button className="text-button danger" onClick={()=>setConfirm(true)}><Trash2 size={14}/>Excluir</button>}
    </div>
    <p className="source-note">{op?'Roteiro gerado pela IA a partir dos dados da empresa e do material do MBA FGV do sócio. Confira as perguntas e os valores com as fontes antes de decidir.':'Roteiro de diligência para pequena fábrica ou confeitaria no Brasil, não certificado de conformidade. Exigências dependem da atividade, do produto, do estado e do município. Referências: Anvisa RDC 275/2002 e RDC 216/2004, certidões da Receita Federal e CNDT (TST).'}</p>
  </div>;
}

// Offered on an empty investment-type audit of a company that is already operating.
function Upgrade({org,onDone}:{org:Organization;onDone:(t:AuditTemplate)=>void}){
  const [focus,setFocus]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function run(){setBusy(true);setError('');try{onDone(await generateTemplate(org,focus.trim()));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="panel audit-upgrade"><Sparkles size={22}/><div><h3>{org.name} está em operação.</h3><p>Este checklist é de aquisição de negócio. Gere uma auditoria avançada de operação: o agente Executivo monta as áreas, as perguntas e os indicadores com os dados da empresa e o material do seu MBA.</p>
    <label className="field-label decision-field">Foco <span>(opcional)</span><input value={focus} disabled={busy} maxLength={1000} onChange={e=>setFocus(e.target.value)} placeholder="Ex.: margem, processos, crescimento comercial…"/></label>
    {busy?<p className="audit-generating" role="status"><Sparkles size={15}/>Gerando… isso leva de 1 a 3 minutos.</p>:null}{error?<p role="alert" className="check-help-error">{error}</p>:null}
    <button className="primary" disabled={busy} onClick={run}><Sparkles size={16}/>{busy?'Gerando…':'Gerar auditoria avançada'}</button></div></section>;
}

function Checklist({audit:a,area,setArea,setAnswer,onDone}:{audit:Audit;area:number;setArea:(i:number)=>void;setAnswer:(id:string,p:Partial<AuditAnswer>)=>void;onDone:()=>void}){
  const sections=sectionsOf(a);const s=sections[Math.min(area,sections.length-1)];
  const [ink,setInk]=useState<string|null>(null);
  return <>
    <div className="audit-area-nav">{sections.map((x,i)=><button key={x.id} aria-pressed={x.id===s.id} onClick={()=>setArea(i)}>{String(i+1).padStart(2,'0')} · {x.name}</button>)}</div>
    <p className="eyebrow">ÁREA {sections.indexOf(s)+1} / {sections.length}</p><h2 className="audit-area-title">{s.name}</h2><p className="reports-hint">{s.desc}</p>
    {s.qs.map((q,i)=>{const id=s.id+'-'+i,ans=a.answers[id]??{};const filled=!!(ans.note||ans.evidence||ans.ink);return <article key={id} className="panel audit-question">
      <p className="eyebrow">{String(i+1).padStart(2,'0')}{q.critical?<span className="badge amber">Crítico</span>:null}</p>
      <h3>{q.q}</h3><small>{q.hint}</small>
      {q.evidence||q.source?<p className="audit-q-meta">{q.evidence?<span><b>Evidência:</b> {q.evidence}</span>:null}{q.source?<span><b>Base MBA:</b> {q.source}</span>:null}</p>:null}
      <div className="audit-choices" role="group" aria-label="Resposta">{answerOptions.map(v=><button key={v} aria-pressed={ans.value===v} className={`is-${v==='Sim'?'yes':v==='Não'?'no':'other'}`} onClick={()=>setAnswer(id,{value:v})}>{v}</button>)}</div>
      {ans.value==='Não se aplica'?<label className="field-label decision-field">Por que não se aplica?<input value={ans.reason??''} placeholder="Justificativa obrigatória" onChange={e=>setAnswer(id,{reason:e.target.value})}/></label>:null}
      <details open={filled}><summary>Notas e evidências{filled?' · preenchidas':''}</summary>
        <label className="field-label decision-field">Observação curta<textarea maxLength={2000} value={ans.note??''} placeholder="O que encontrou? O que precisa corrigir?" onChange={e=>setAnswer(id,{note:e.target.value})}/></label>
        <label className="field-label decision-field">Documento ou evidência conferida<input maxLength={500} value={ans.evidence??''} placeholder="Ex.: relatório…, período…, pasta…" onChange={e=>setAnswer(id,{evidence:e.target.value})}/></label>
        <label className="event-allday"><input type="checkbox" checked={!!ans.verified} onChange={e=>setAnswer(id,{verified:e.target.checked})}/>Conferi a evidência descrita</label>
        <div className="card-actions"><button className="btn-ghost btn-sm" onClick={()=>setInk(id)}><PenLine size={14}/>Anotação à mão</button>{ans.ink?<button className="text-button" onClick={()=>setAnswer(id,{ink:undefined})}>Remover anotação</button>:null}</div>
        {ans.ink?<img className="audit-ink-preview" alt="Anotação manuscrita" src={ans.ink}/>:null}
      </details>
    </article>;})}
    <div className="decision-actions"><button className="outline" disabled={area===0} onClick={()=>setArea(area-1)}>← Anterior</button><button className="primary" onClick={()=>area>=sections.length-1?onDone():setArea(area+1)}>{area>=sections.length-1?'Ver diagnóstico':'Próxima área →'}</button></div>
    {ink?<InkDialog initial={a.answers[ink]?.ink} onClose={()=>setInk(null)} onSave={img=>{setAnswer(ink,{ink:img});setInk(null);}}/>:null}
  </>;
}

// Handwriting with finger or Apple Pencil, saved as an image (no text recognition).
function InkDialog({initial,onClose,onSave}:{initial?:string;onClose:()=>void;onSave:(png:string)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const history=useRef<ImageData[]>([]);
  useEffect(()=>{const c=canvas.current!,ctx=c.getContext('2d')!;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#17231c';
    if(initial){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,1000,400);im.src=initial;}
    let drawing:number|null=null;
    const xy=(e:PointerEvent):[number,number]=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*1000/r.width,(e.clientY-r.top)*400/r.height];};
    const down=(e:PointerEvent)=>{if(drawing!==null)return;e.preventDefault();history.current.push(ctx.getImageData(0,0,1000,400));drawing=e.pointerId;c.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...xy(e));};
    const move=(e:PointerEvent)=>{if(drawing!==e.pointerId)return;ctx.lineTo(...xy(e));ctx.stroke();};
    const up=(e:PointerEvent)=>{if(drawing===e.pointerId)drawing=null;};
    c.addEventListener('pointerdown',down);c.addEventListener('pointermove',move);c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
    return()=>{c.removeEventListener('pointerdown',down);c.removeEventListener('pointermove',move);c.removeEventListener('pointerup',up);c.removeEventListener('pointercancel',up);};
  },[initial]);
  const ctx=()=>canvas.current!.getContext('2d')!;
  return <Dialog eyebrow="NONE / AUDITORIA" title="Anotação à mão" onClose={onClose}>
    <p className="source-note">Escreva com a caneta ou o dedo. Os traços são salvos como imagem.</p>
    <canvas ref={canvas} className="audit-ink" width={1000} height={400} aria-label="Espaço para escrita manuscrita"/>
    <div className="decision-actions"><button className="outline" onClick={()=>{const h=history.current.pop();if(h)ctx().putImageData(h,0,0);}}>Desfazer</button><button className="outline" onClick={()=>{history.current.push(ctx().getImageData(0,0,1000,400));ctx().clearRect(0,0,1000,400);}}>Limpar</button><button className="primary" onClick={()=>onSave(canvas.current!.toDataURL('image/png'))}><Check size={16}/>Salvar anotação</button></div>
  </Dialog>;
}

function Calc({audit:a}:{audit:Audit}){
  const c=auditCalculations(a.finance);
  return <><div className="audit-stats"><div><strong className="money">{brl(c.profit)}</strong><span>Resultado mensal estimado</span></div><div><strong className="money">{brl(c.total)}</strong><span>Capital total necessário</span></div><div><strong className="money">{c.payback===null?'—':c.payback.toFixed(1)+' meses'}</strong><span>Retorno simples estimado</span></div></div>
    <p className="reports-hint">Margem estimada: <b>{c.margin===null?'—':c.margin.toFixed(1)+'%'}</b> · Resultado com 20% menos receita: <b>{brl(c.stress)}</b></p>
    <p className="source-note">Simulação da aquisição de 100% do negócio. Capital total = preço + dívidas assumidas + reformas + giro. Resultado = receita − custos − despesas − gestão − tributos. Retorno simples = capital / resultado positivo; não é fluxo de caixa descontado. No cenário de queda, custos variáveis caem 20%. Campos vazios não contam como zero.</p></>;
}

function Numbers({audit:a,set,onNext}:{audit:Audit;set:(k:string,v:string)=>void;onNext:()=>void}){
  return <><p className="eyebrow">ANÁLISE ECONÔMICA</p><h2 className="audit-area-title">Os números fecham?</h2><p className="reports-hint">Use médias dos últimos 12 meses conferidas com o contador. Preencha zero somente quando o valor realmente for zero.</p>
    <section className="panel audit-finance">{financeFields.map(([l,k])=><label key={k} className="field-label decision-field">{l}<input type="number" min="0" step="any" inputMode="decimal" value={a.finance[k]??''} placeholder="0,00" onChange={e=>set(k,e.target.value)}/></label>)}</section>
    <Calc audit={a}/>
    <div className="decision-actions"><button className="primary" onClick={onNext}>Ver diagnóstico →</button></div></>;
}

// Operating audit: the KPIs chosen by the agent, with current value and target.
function Kpis({audit:a,set,onNext}:{audit:Audit;set:(k:string,v:string)=>void;onNext:()=>void}){
  return <><p className="eyebrow">INDICADORES-CHAVE</p><h2 className="audit-area-title">Como a operação está indo?</h2><p className="reports-hint">Indicadores escolhidos pelo agente para esta empresa. Os valores trazidos dos sistemas mostram a origem; confira e registre a meta.</p>
    <div className="audit-kpis">{a.template!.kpis.map(k=><section key={k.id} className="panel audit-kpi">
      <div className="audit-kpi-head"><h3>{k.name}</h3><span className="badge">{kpiUnits[k.unit]??k.unit}</span></div><small>{k.why}</small>
      <div className="audit-kpi-fields"><label className="field-label decision-field">Atual<input value={a.finance['kpi:'+k.id]??k.current??''} placeholder="—" onChange={e=>set('kpi:'+k.id,e.target.value)}/></label><label className="field-label decision-field">Meta<input value={a.finance['meta:'+k.id]??''} placeholder="a definir" onChange={e=>set('meta:'+k.id,e.target.value)}/></label></div>
      {k.origin?<small className="audit-kpi-origin">Valor sugerido: {k.current} · {k.origin}</small>:null}
    </section>)}</div>
    <div className="decision-actions"><button className="primary" onClick={onNext}>Ver diagnóstico →</button></div></>;
}

function KpiTable({audit:a}:{audit:Audit}){
  const rows=a.template!.kpis;
  return <section className="panel audit-kpi-table"><table><thead><tr><th>Indicador</th><th>Atual</th><th>Meta</th></tr></thead><tbody>{rows.map(k=><tr key={k.id}><td>{k.name}<small>{kpiUnits[k.unit]??k.unit}</small></td><td>{a.finance['kpi:'+k.id]||k.current||'—'}</td><td>{a.finance['meta:'+k.id]||'a definir'}</td></tr>)}</tbody></table></section>;
}

function Diagnosis({audit:a,setDecision,onNumbers,onArea}:{audit:Audit;setDecision:(k:string,v:string)=>void;onNumbers:()=>void;onArea:(i:number)=>void}){
  const m=auditMetrics(a),op=isOperation(a),sections=sectionsOf(a);
  return <div className="audit-print">
    <p className="audit-diag-meta">{a.meta.city||'Município não informado'} · {dateBR(a.meta.date)} · {a.meta.auditor||'Auditor não informado'}</p>
    <Stats audit={a}/>
    <section className={`panel audit-signal${m.critical.length?' is-alert':''}`}><p className="eyebrow">SINALIZAÇÃO DO CHECKLIST</p><h2>{auditStatus(a)}</h2><p>{m.unknown.length} itens sem conclusão, {m.no.length} respostas “Não” e {m.yes.length-m.verified.length} respostas “Sim” sem evidência conferida.</p><small>Regra de triagem, não recomendação automática. A decisão depende dos números, da documentação e da avaliação dos profissionais responsáveis.</small></section>
    <div className="audit-two">
      <section className="panel"><h2>Prioridades críticas</h2>{m.critical.length?m.critical.map(x=><div key={x.id} className="audit-alert"><b>{x.q.q}</b><p>{x.a.note||'Registrar a correção e a evidência necessária.'}</p></div>):<p className="reports-hint">Nenhuma resposta “Não” em item crítico até agora. Itens não verificados continuam pendentes.</p>}</section>
      <section className="panel"><h2>Por área</h2>{sections.map((s,i)=>{const it=m.items.filter(x=>x.section.id===s.id);const al=it.filter(x=>x.a.value==='Não').length;return <button key={s.id} className="audit-area-row" onClick={()=>onArea(i)}><span>{s.name}</span><small>{it.filter(x=>answered(x.a)).length}/{it.length}{al?<b> · {al} {al===1?'alerta':'alertas'}</b>:' · sem alertas'}</small></button>;})}</section>
    </div>
    <div className="audit-section-title"><h2>{op?'Indicadores-chave':'Viabilidade econômica'}</h2><button className="btn-ghost btn-sm" onClick={onNumbers}>{op?'Editar indicadores':'Editar números'}</button></div>
    {op?<KpiTable audit={a}/>:<Calc audit={a}/>}
    <section className="panel audit-decision"><h2>Sua decisão</h2>
      <label className="field-label decision-field">Encaminhamento<select value={a.decision.choice??''} onChange={e=>setDecision('choice',e.target.value)}><option value="">Ainda em análise</option>{choicesOf(a).map(t=><option key={t}>{t}</option>)}</select></label>
      <label className="field-label decision-field">{op?'Ações e condições':'Condições antes de investir'}<textarea value={a.decision.conditions??''} placeholder={op?'Ex.: revisar precificação, formalizar processos, meta de margem…':'Ex.: comprovar receita, regularizar licença, ajustar o preço…'} onChange={e=>setDecision('conditions',e.target.value)}/></label>
    </section>
    <div className="audit-section-title"><h2>Registro completo</h2></div>
    {sections.map(s=><section key={s.id} className="panel audit-record"><h3>{s.name}</h3>{m.items.filter(x=>x.section.id===s.id).map(x=><div key={x.id} className="audit-record-item"><b>{x.q.q}</b><p>{x.a.value||'Não respondido'}{x.a.value==='Não se aplica'&&!x.a.reason?.trim()?' · justificativa pendente':''}{x.q.critical?' · crítico':''}{x.a.value==='Sim'?' · '+(x.a.verified&&x.a.evidence?.trim()?'evidência conferida':'sem comprovação'):''}</p>{x.a.reason?<p>Justificativa: {x.a.reason}</p>:null}{x.a.note?<p>Nota: {x.a.note}</p>:null}{x.a.evidence?<p>Evidência: {x.a.evidence}</p>:null}{x.a.ink?<img className="audit-ink-preview" src={x.a.ink} alt="Anotação manuscrita"/>:null}</div>)}</section>)}
  </div>;
}
