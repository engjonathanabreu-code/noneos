'use client';
import {useCallback,useEffect,useState} from 'react';
import {Bot,CalendarDays,Database,Dumbbell,MessageCircle,Plug,RefreshCw,Unplug} from 'lucide-react';
import type {Connection,ConnectionStatus} from '@/app/api/conexoes/route';

const label:Record<ConnectionStatus,string>={conectado:'Conectado',desconectado:'Não conectado',nao_configurado:'Não configurado',erro:'Com erro',previsto:'Previsto',manual:'Via relatórios'};
const icon=(c:Connection)=>c.id==='claude'?Bot:c.id==='google'?CalendarDays:c.id==='nextfit'?Dumbbell:['whatsapp','chatwoot','gmail','social'].includes(c.id)?MessageCircle:c.kind.startsWith('Supabase')?Database:Plug;

// Live status of every connection (see /api/conexoes). Active ones first.
export function ConnectionsStatus(){
 const [data,setData]=useState<{connections:Connection[];checkedAt:string}|null>(null);const [failed,setFailed]=useState(false);const [busy,setBusy]=useState(false);
 const load=useCallback(()=>{setFailed(false);fetch('/api/conexoes').then(r=>{if(!r.ok)throw Error();return r.json();}).then(setData).catch(()=>setFailed(true));},[]);
 useEffect(load,[load]);
 async function disconnectGoogle(){setBusy(true);try{await fetch('/api/google/connection',{method:'DELETE'});}finally{setBusy(false);load();}}
 if(failed)return <section className="panel live-empty"><p>Não foi possível verificar as conexões.</p><button className="text-button" onClick={load}><RefreshCw size={14}/>Tentar novamente</button></section>;
 if(!data)return <p className="reports-hint">Verificando conexões…</p>;
 const order:ConnectionStatus[]=['conectado','erro','desconectado','nao_configurado','manual','previsto'];
 const list=[...data.connections].sort((a,b)=>order.indexOf(a.status)-order.indexOf(b.status));
 const active=list.filter(c=>c.status==='conectado').length;
 return <>
  <div className="connections-summary"><span><i className="gcal-dot"/>{active} conexões ativas</span><span>Verificado em {new Date(data.checkedAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span><button className="btn-ghost btn-sm" onClick={load}><RefreshCw size={14}/>Verificar novamente</button></div>
  <div className="connection-grid">{list.map(c=>{const Icon=icon(c);return <section className={'panel connector is-'+c.status} key={c.id}>
   <div><span className="stat-icon"><Icon size={22}/></span><span className={'badge status-'+c.status}>{label[c.status]}</span></div>
   <h2>{c.name}</h2><p>{c.purpose}</p><small>{c.kind}</small>
   <div className="connector-footer">{c.detail}
    {c.id==='google'&&c.status==='desconectado'&&<a className="btn-secondary btn-sm" href="/api/google/connect"><CalendarDays size={14}/>Conectar</a>}
    {c.id==='google'&&c.status==='conectado'&&<button className="btn-ghost btn-sm" disabled={busy} onClick={disconnectGoogle}><Unplug size={14}/>Desconectar</button>}
   </div></section>;})}</div>
 </>;
}
