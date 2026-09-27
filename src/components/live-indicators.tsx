'use client';
import {useEffect,useState} from 'react';
import {Database,RefreshCw} from 'lucide-react';
import type {Indicator,SourceResult} from '@/lib/indicators';

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
