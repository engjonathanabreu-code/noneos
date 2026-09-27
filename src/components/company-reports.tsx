'use client';
import {useEffect,useState} from 'react';
import {FileUp,Sparkles,Trash2,Check,X,FileText} from 'lucide-react';
import type {ReportExtraction} from '@/lib/report-extract';

// Indicators extracted by the none AI from reports exported by each company's
// system (e.g. Next Fit for CT Diego Silva). Stored in this browser, like the rest of none OS.
export type SavedReport = ReportExtraction & {id:string;company:string;fileName:string;importedAt:string};
export const reportsKey='none-reports-v1';
const event='none-reports';

function read():SavedReport[]{try{const raw=localStorage.getItem(reportsKey);if(!raw)return [];const v=JSON.parse(raw);return v?.version===1&&Array.isArray(v.items)?v.items:[];}catch{return [];}}
function write(items:SavedReport[]){localStorage.setItem(reportsKey,JSON.stringify({version:1,items}));window.dispatchEvent(new Event(event));}

export function useReports(company:string){
 const [items,setItems]=useState<SavedReport[]>([]);
 useEffect(()=>{const r=()=>setItems(read().filter(i=>i.company===company));r();window.addEventListener(event,r);window.addEventListener('storage',r);return()=>{window.removeEventListener(event,r);window.removeEventListener('storage',r);};},[company]);
 return items;
}

// Latest value per label: the most recently imported report wins.
export function latestIndicators(items:SavedReport[]){
 const map=new Map<string,{i:ReportExtraction['indicadores'][number];r:SavedReport}>();
 for(const r of [...items].sort((a,b)=>a.importedAt.localeCompare(b.importedAt)))for(const i of r.indicadores)map.set(i.rotulo,{i,r});
 return [...map.values()];
}

const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});const int=new Intl.NumberFormat('pt-BR');
export const formatValue=(i:{valor:number;formato:string})=>i.formato==='brl'?brl.format(i.valor):i.formato==='pct'?int.format(i.valor)+'%':int.format(i.valor);
const day=(s:string|null)=>s?new Date(s+'T12:00:00').toLocaleDateString('pt-BR'):'';
export const period=(r:{periodo_inicio:string|null;periodo_fim:string|null})=>r.periodo_inicio||r.periodo_fim?[day(r.periodo_inicio),day(r.periodo_fim)].filter(Boolean).join(' a '):'período não informado';

async function toPayload(file:File):Promise<{kind:'pdf'|'text';data:string}>{
 const name=file.name.toLowerCase();
 if(name.endsWith('.pdf')){const b=new Uint8Array(await file.arrayBuffer());let s='';for(let i=0;i<b.length;i+=0x8000)s+=String.fromCharCode(...b.subarray(i,i+0x8000));return {kind:'pdf',data:btoa(s)};}
 if(name.endsWith('.xlsx')){
  const {default:readXlsxFile}=await import('read-excel-file/browser');
  const sheets=await readXlsxFile(file);
  const cell=(v:unknown)=>v instanceof Date?v.toISOString().slice(0,10):v==null?'':String(v).replace(/[;\n\r]+/g,' ');
  return {kind:'text',data:sheets.map(s=>'# Planilha: '+s.sheet+'\n'+s.data.map(r=>r.map(cell).join(';')).join('\n')).join('\n\n')};
 }
 if(name.endsWith('.csv')||name.endsWith('.txt'))return {kind:'text',data:await file.text()};
 throw new Error('Formato não suportado. Envie PDF, Excel (.xlsx) ou CSV.');
}

export function CompanyReports({company,companyName}:{company:string;companyName:string}){
 const items=useReports(company);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState('');const [draft,setDraft]=useState<SavedReport|null>(null);
 async function upload(file?:File){
  if(!file)return;setNotice('');setBusy(true);
  try{
   const p=await toPayload(file);
   const r=await fetch('/api/relatorios/extrair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({company,fileName:file.name,...p})});
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error??'Não foi possível analisar o relatório.');
   setDraft({...j.result,id:crypto.randomUUID(),company,fileName:file.name,importedAt:new Date().toISOString()});
  }catch(e){setNotice((e as Error).message);}finally{setBusy(false);}
 }
 function confirm(){if(!draft)return;try{write([...read(),draft]);setDraft(null);setNotice('Relatório salvo. Os indicadores já aparecem abaixo.');}catch{setNotice('Não foi possível salvar neste navegador.');}}
 function remove(id:string){write(read().filter(r=>r.id!==id));}
 const latest=latestIndicators(items);const groups=[...new Set(latest.map(x=>x.i.grupo))];
 return <section className="panel reports-panel" aria-label="Relatórios importados">
  <div className="section-header"><div><p className="eyebrow">RELATÓRIOS · IA DA NONE</p><h2>Indicadores de {companyName}</h2></div>
   <label className={'primary reports-upload'+(busy?' is-busy':'')}><FileUp size={16}/>{busy?'Analisando…':'Importar relatório'}<input type="file" accept=".pdf,.xlsx,.csv,.txt" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label></div>
  <p className="reports-hint">Exporte um relatório do sistema da empresa (PDF, Excel ou CSV). A IA lê o arquivo e extrai apenas totais, sem dados de pessoas. Você revisa antes de salvar.</p>
  {notice&&<p role="status" className="gcal-notice">{notice}</p>}
  {busy&&<p className="reports-hint"><Sparkles size={14}/> Lendo o relatório… pode levar até um minuto.</p>}
  {draft&&<div className="reports-review"><h3><FileText size={15}/>{draft.relatorio} · {period(draft)}</h3>
   {draft.indicadores.length?<table><tbody>{draft.indicadores.map((i,n)=><tr key={n}><td>{i.rotulo}<small>{i.grupo}{i.nota?' · '+i.nota:''}</small></td><td>{formatValue(i)}</td><td><button className="icon-button" aria-label={'Descartar '+i.rotulo} onClick={()=>setDraft({...draft,indicadores:draft.indicadores.filter((_,k)=>k!==n)})}><X size={14}/></button></td></tr>)}</tbody></table>:<p className="reports-hint">Nenhum indicador encontrado neste arquivo.</p>}
   {draft.observacoes&&<p className="reports-hint">{draft.observacoes}</p>}
   <div className="check-add-actions"><button className="primary" disabled={!draft.indicadores.length} onClick={confirm}><Check size={15}/>Confirmar e salvar</button><button className="text-button" onClick={()=>setDraft(null)}>Descartar</button></div></div>}
  {groups.map(g=><div key={g}><h3 className="live-group">{g}</h3><div className="metrics-grid">{latest.filter(x=>x.i.grupo===g).map(({i,r})=><div className="panel metric" key={i.rotulo}><span>{i.rotulo}</span><strong>{formatValue(i)}</strong><small>{i.nota?i.nota+' · ':''}{r.relatorio}, {period(r)}</small></div>)}</div></div>)}
  {items.length>0&&<details className="reports-history"><summary>Relatórios importados ({items.length})</summary>{[...items].reverse().map(r=><div key={r.id} className="reports-row"><span><strong>{r.relatorio}</strong> · {period(r)}<small>{r.fileName} · importado em {new Date(r.importedAt).toLocaleDateString('pt-BR')}</small></span><button className="icon-button" aria-label={'Remover '+r.relatorio} onClick={()=>remove(r.id)}><Trash2 size={14}/></button></div>)}</details>}
 </section>;
}
