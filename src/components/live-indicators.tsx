'use client';
import {useEffect,useState} from 'react';
import {Database,RefreshCw} from 'lucide-react';
import type {Indicator,SourceResult} from '@/lib/indicators';
import {useReports,latestIndicators,formatValue,period} from '@/components/company-reports';

const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const int=new Intl.NumberFormat('pt-BR');
function format(i:Indicator){return i.formato==='brl'?brl.format(i.valor):i.formato==='pct'?int.format(i.valor)+'%':int.format(i.valor);}

// groups: which indicator groups to show; undefined shows all.
export function LiveIndicators({companyId,groups}:{companyId:string;groups?:string[]}){
 const [data,setData]=useState<SourceResult[]|null>(null);const [failed,setFailed]=useState(false);const [tick,setTick]=useState(0);
 useEffect(()=>{let live=true;setFailed(false);fetch('/api/indicadores?empresa='+encodeURIComponent(companyId)).then(r=>{if(!r.ok)throw Error();return r.json();}).then(j=>{if(live)setData(j.fontes);}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[companyId,tick]);
 if(failed)return <section className="panel live-empty"><p>Não foi possível carregar os indicadores.</p><button className="text-button" onClick={()=>setTick(t=>t+1)}><RefreshCw size={15}/>Tentar novamente</button></section>;
 if(!data)return <section className="panel live-empty" aria-busy="true"><p>Carregando indicadores…</p></section>;
 if(!data.length)return null;
 return <div className="live-indicators">{data.map(s=>{
  if(s.status!=='ok')return <section className="panel live-empty" key={s.fonte}><Database size={18}/><div><strong>{s.fonte}</strong><p>{s.mensagem}</p></div></section>;
  const list=s.indicadores.filter(i=>!groups||groups.includes(i.grupo));if(!list.length)return null;
  const byGroup=[...new Set(list.map(i=>i.grupo))];
  return <section className="live-source" key={s.fonte}>{byGroup.map(g=><div key={g}><h3 className="live-group">{g}</h3><div className="metrics-grid">{list.filter(i=>i.grupo===g).map(i=><div className="panel metric" key={i.rotulo}><span>{i.rotulo}</span><strong>{format(i)}</strong>{i.nota&&<small>{i.nota}</small>}</div>)}</div></div>)}<p className="source-note"><Database size={12}/>Fonte: {s.fonte} · atualizado {new Date(s.gerado_em).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})} · somente leitura</p></section>;
 })}</div>;
}

// Home summary: the headline indicators of each company with a live source.
const pulse:{id:string;name:string;pick:string[]}[]=[
 {id:'integral',name:'Integral',pick:['Resultado do mês','Contratos públicos a receber (total)','Carteira REURB a receber','Contas a pagar (próx. 30 dias)','Clientes ativos','Processos em andamento']},
 {id:'mcl',name:'Minha Casa Legal',pick:['Previsto para receber no mês','Recebido no mês','Parcelas em atraso','Carteira a receber']},
 {id:'reurb',name:'REURB.Software',pick:['Receita recorrente mensal (MRR)','Assinaturas ativas','Visitas ao site (30 dias)','Pré-cadastros']}
];
export function PortfolioPulse({onOpen}:{onOpen:(id:string)=>void}){
 return <section className="portfolio-section"><div className="section-header"><h2>Indicadores das empresas</h2><small className="pulse-note">Dados reais · somente leitura</small></div><div className="pulse-grid">{pulse.map(p=><PulseCard key={p.id} {...p} onOpen={()=>onOpen(p.id)}/>)}<ReportPulseCard id="ct" name="CT Diego Silva" onOpen={()=>onOpen('ct')}/></div></section>;
}
function PulseCard({id,name,pick,onOpen}:{id:string;name:string;pick:string[];onOpen:()=>void}){
 const [data,setData]=useState<SourceResult[]|null>(null);const [failed,setFailed]=useState(false);
 useEffect(()=>{let live=true;fetch('/api/indicadores?empresa='+id).then(r=>{if(!r.ok)throw Error();return r.json();}).then(j=>{if(live)setData(j.fontes);}).catch(()=>{if(live)setFailed(true);});return()=>{live=false;};},[id]);
 const all=(data??[]).flatMap(s=>s.status==='ok'?s.indicadores:[]);const shown=pick.map(l=>all.find(i=>i.rotulo===l)).filter((i):i is Indicator=>!!i);
 const problem=failed||(data&&data.some(s=>s.status!=='ok'));
 return <article className="panel pulse-card"><header><strong>{name}</strong><button className="text-button" onClick={onOpen}>Detalhes</button></header>
  {!data&&!failed&&<p className="pulse-empty">Carregando…</p>}
  {shown.length>0&&<dl>{shown.map(i=><div key={i.rotulo}><dt>{i.rotulo}</dt><dd>{format(i)}</dd></div>)}</dl>}
  {problem&&<p className="pulse-empty">{failed?'Não foi possível carregar.':(data??[]).flatMap(s=>s.status==='ok'?[]:[s.fonte+': '+s.mensagem]).join(' · ')}</p>}
 </article>;
}

// Companies without a database: headline numbers from reports imported through the none AI.
function ReportPulseCard({id,name,onOpen}:{id:string;name:string;onOpen:()=>void}){
 const latest=latestIndicators(useReports(id).items).slice(-6);
 return <article className="panel pulse-card"><header><strong>{name}</strong><button className="text-button" onClick={onOpen}>{latest.length?'Detalhes':'Importar relatório'}</button></header>
  {latest.length?<dl>{latest.map(({i})=><div key={i.rotulo}><dt>{i.rotulo}</dt><dd>{formatValue(i)}</dd></div>)}</dl>:<p className="pulse-empty">Sem integração direta. Importe relatórios do Next Fit na página da empresa.</p>}
  {latest.length>0&&<p className="pulse-empty">Fonte: relatórios importados · último: {period(latest[latest.length-1].r)}</p>}
 </article>;
}
