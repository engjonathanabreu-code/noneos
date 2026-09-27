'use client';
import {useState} from 'react';
import {ArrowDown,ArrowUp,Check,Plus,Trash2} from 'lucide-react';
import {isOperation,kpiUnits,sectionsOf,type Audit,type AuditAnswer,type AuditKpi,type AuditQuestion} from '@/lib/audit';

// Edits the areas, questions and (operating audits) KPIs of an audit.
// Answers are keyed "<area>-<index>", so saving remaps each answer to the question's new position.
type DQ = AuditQuestion & {from?:string};
type DS = {id:string;name:string;desc:string;qs:DQ[]};
const newId = (p:string) => p+crypto.randomUUID().replace(/-/g,'').slice(0,8);
const LIMITS = {sections:12, questions:15, kpis:20};

export function AuditEditor({audit,onSave,onCancel}:{audit:Audit;onSave:(a:Audit)=>void;onCancel:()=>void}){
  const op = isOperation(audit);
  const [sections,setSections] = useState<DS[]>(()=>sectionsOf(audit).map(s=>({id:s.id,name:s.name,desc:s.desc,qs:s.qs.map((q,i)=>({...q,from:s.id+'-'+i}))})));
  const [kpis,setKpis] = useState<AuditKpi[]>(()=>audit.template?.kpis.map(k=>({...k}))??[]);
  const [focus,setFocus] = useState(audit.template?.focus??'');
  const [error,setError] = useState('');
  const answered = (key?:string) => !!key && !!audit.answers[key] && Object.values(audit.answers[key]).some(v=>v!==undefined && v!=='' && v!==false);

  const setS = (i:number, patch:Partial<DS>) => setSections(list=>list.map((s,j)=>j===i?{...s,...patch}:s));
  const setQ = (si:number, qi:number, patch:Partial<DQ>) => setSections(list=>list.map((s,j)=>j===si?{...s,qs:s.qs.map((q,k)=>k===qi?{...q,...patch}:q)}:s));
  const move = <T,>(arr:T[], i:number, d:number) => {const n=[...arr];const t=i+d;if(t<0||t>=n.length)return n;[n[i],n[t]]=[n[t],n[i]];return n;};

  function save(){
    const clean = sections.map(s=>({...s,name:s.name.trim(),desc:s.desc.trim(),qs:s.qs.map(q=>({...q,q:q.q.trim(),hint:q.hint.trim()})).filter(q=>q.q)})).filter(s=>s.name&&s.qs.length);
    if(!clean.length){setError('Mantenha pelo menos uma área com uma pergunta.');return;}
    const answers:Record<string,AuditAnswer> = {};
    for(const s of clean) s.qs.forEach((q,i)=>{if(q.from&&audit.answers[q.from])answers[s.id+'-'+i]=audit.answers[q.from];});
    const keptKpis = kpis.map(k=>({...k,name:k.name.trim(),why:k.why.trim()})).filter(k=>k.name);
    const finance = {...audit.finance};
    for(const k of audit.template?.kpis??[]) if(!keptKpis.some(x=>x.id===k.id)){delete finance['kpi:'+k.id];delete finance['meta:'+k.id];}
    onSave({...audit, answers, finance, template:{
      focus:focus.trim(), generatedAt:audit.template?.generatedAt??new Date().toISOString(), basis:audit.template?.basis??[],
      kpis:op?keptKpis:[],
      sections:clean.map(s=>({id:s.id,name:s.name.slice(0,200),desc:s.desc.slice(0,600),qs:s.qs.map(({from:_from,...q})=>({...q,q:q.q.slice(0,600),hint:q.hint.slice(0,1200),evidence:q.evidence?.trim()||undefined,source:q.source?.trim()||undefined}))}))
    }});
  }

  return <div className="audit-editor">
    <div className="audit-editor-bar"><div><p className="eyebrow">EDITAR ESTRUTURA</p><p className="reports-hint">Renomeie, reordene, inclua ou remova áreas e perguntas. As respostas já dadas acompanham cada pergunta.</p></div><div className="card-actions"><button className="outline" onClick={onCancel}>Cancelar</button><button className="primary" onClick={save}><Check size={16}/>Salvar estrutura</button></div></div>
    {error?<p role="alert" className="check-help-error">{error}</p>:null}
    {op?<label className="field-label decision-field">Foco da auditoria<textarea maxLength={2000} value={focus} onChange={e=>setFocus(e.target.value)}/></label>:null}
    {sections.map((s,si)=><section key={s.id} className="panel audit-edit-area">
      <div className="audit-edit-row">
        <input className="audit-edit-title" value={s.name} maxLength={200} onChange={e=>setS(si,{name:e.target.value})} aria-label="Nome da área" placeholder="Nome da área"/>
        <div className="audit-edit-tools"><button className="icon-button" aria-label="Subir área" disabled={si===0} onClick={()=>setSections(l=>move(l,si,-1))}><ArrowUp size={15}/></button><button className="icon-button" aria-label="Descer área" disabled={si===sections.length-1} onClick={()=>setSections(l=>move(l,si,1))}><ArrowDown size={15}/></button><button className="icon-button danger" aria-label="Remover área" onClick={()=>{const n=s.qs.filter(q=>answered(q.from)).length;if(n&&!confirm(`Esta área tem ${n} ${n===1?'resposta':'respostas'}. Remover a área e as respostas?`))return;setSections(l=>l.filter((_,j)=>j!==si));}}><Trash2 size={15}/></button></div>
      </div>
      <input className="audit-edit-desc" value={s.desc} maxLength={600} onChange={e=>setS(si,{desc:e.target.value})} aria-label="Descrição da área" placeholder="O que esta área avalia"/>
      <ol className="audit-edit-qs">{s.qs.map((q,qi)=><li key={(q.from??'')+qi}>
        <div className="audit-edit-row"><textarea value={q.q} maxLength={600} rows={2} onChange={e=>setQ(si,qi,{q:e.target.value})} aria-label="Pergunta" placeholder="Pergunta (Sim / Não / Não sei / Não se aplica)"/>
          <div className="audit-edit-tools"><button className="icon-button" aria-label="Subir pergunta" disabled={qi===0} onClick={()=>setS(si,{qs:move(s.qs,qi,-1)})}><ArrowUp size={14}/></button><button className="icon-button" aria-label="Descer pergunta" disabled={qi===s.qs.length-1} onClick={()=>setS(si,{qs:move(s.qs,qi,1)})}><ArrowDown size={14}/></button><button className="icon-button danger" aria-label="Remover pergunta" onClick={()=>{if(answered(q.from)&&!confirm('Esta pergunta tem resposta. Remover mesmo assim?'))return;setS(si,{qs:s.qs.filter((_,k)=>k!==qi)});}}><Trash2 size={14}/></button></div></div>
        <div className="audit-edit-sub"><input value={q.hint} maxLength={1200} onChange={e=>setQ(si,qi,{hint:e.target.value})} placeholder="Como verificar" aria-label="Orientação"/><input value={q.evidence??''} maxLength={600} onChange={e=>setQ(si,qi,{evidence:e.target.value})} placeholder="Evidência a pedir" aria-label="Evidência"/><label className="event-allday"><input type="checkbox" checked={q.critical} onChange={e=>setQ(si,qi,{critical:e.target.checked})}/>Crítica</label></div>
      </li>)}</ol>
      <button className="btn-ghost btn-sm" disabled={s.qs.length>=LIMITS.questions} onClick={()=>setS(si,{qs:[...s.qs,{q:'',hint:'',critical:false}]})}><Plus size={14}/>Pergunta{s.qs.length>=LIMITS.questions?' (máx. 15)':''}</button>
    </section>)}
    <button className="btn-secondary btn-sm" disabled={sections.length>=LIMITS.sections} onClick={()=>setSections(l=>[...l,{id:newId('a'),name:'Nova área',desc:'',qs:[{q:'',hint:'',critical:false}]}])}><Plus size={14}/>Nova área{sections.length>=LIMITS.sections?' (máx. 12)':''}</button>
    {op?<section className="panel audit-edit-area audit-edit-kpis"><h3>Indicadores-chave</h3>
      {kpis.map((k,ki)=><div key={k.id} className="audit-edit-kpi">
        <input value={k.name} maxLength={200} onChange={e=>setKpis(l=>l.map((x,j)=>j===ki?{...x,name:e.target.value}:x))} placeholder="Indicador" aria-label="Indicador"/>
        <select value={k.unit} onChange={e=>setKpis(l=>l.map((x,j)=>j===ki?{...x,unit:e.target.value}:x))} aria-label="Unidade">{Object.entries(kpiUnits).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        <input value={k.why} maxLength={600} onChange={e=>setKpis(l=>l.map((x,j)=>j===ki?{...x,why:e.target.value}:x))} placeholder="Por que acompanhar" aria-label="Por que acompanhar"/>
        <button className="icon-button danger" aria-label="Remover indicador" onClick={()=>setKpis(l=>l.filter((_,j)=>j!==ki))}><Trash2 size={14}/></button>
      </div>)}
      <button className="btn-ghost btn-sm" disabled={kpis.length>=LIMITS.kpis} onClick={()=>setKpis(l=>[...l,{id:newId('k'),name:'',unit:'int',why:''}])}><Plus size={14}/>Indicador</button>
    </section>:null}
    <div className="decision-actions"><button className="outline" onClick={onCancel}>Cancelar</button><button className="primary" onClick={save}><Check size={16}/>Salvar estrutura</button></div>
  </div>;
}
