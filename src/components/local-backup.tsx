'use client';
import {useState} from 'react';
import {conflictPrefix,syncLabel,useWorkspaceSync} from '@/components/workspace-sync';

const keys=['none-checklists-v1','none-organizations-v1','none-brainstorm-v1','none-agents-v1','none-decisions-v1','none-auditorias-v1','none-event-links-v1','none-workspace-v2'];
const restorable=keys.filter(k=>k!=='none-workspace-v2');

export function LocalBackup(){
 const sync=useWorkspaceSync();
 const [notice,setNotice]=useState('');
 const [pending,setPending]=useState<Record<string,string>|null>(null);
 function download(){try{const conflicts=Object.keys(localStorage).filter(k=>k.startsWith(conflictPrefix));const entries=Object.fromEntries([...keys,...conflicts].map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),entries},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='none-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice(`Cópia preparada${conflicts.length?` (inclui ${conflicts.length} ${conflicts.length===1?'cópia guardada':'cópias guardadas'} de conflito)`:''}. Guarde o arquivo em local privado.`);}catch{setNotice('Não foi possível exportar os dados.');}}
 async function pick(file:File|undefined){
  if(!file)return;setPending(null);
  try{const v=JSON.parse(await file.text());if(v?.version!==1||!v.entries||typeof v.entries!=='object')throw Error();
   const entries=Object.fromEntries(Object.entries(v.entries as Record<string,unknown>).filter(([k,val])=>restorable.includes(k)&&typeof val==='string'&&(()=>{try{return typeof JSON.parse(val as string)==='object';}catch{return false;}})())) as Record<string,string>;
   if(!Object.keys(entries).length)throw Error();setPending(entries);setNotice('');
  }catch{setNotice('Arquivo inválido. Escolha uma cópia exportada pela none.');}
 }
 async function restore(){if(!pending)return;const entries=pending;setPending(null);try{for(const [k,v] of Object.entries(entries))localStorage.setItem(k,v);}catch{setNotice('Não foi possível restaurar. Nenhum dado foi apagado.');return;}setNotice('Cópia restaurada. Sincronizando…');await sync.syncNow();location.reload();}
 const names:Record<string,string>={'none-checklists-v1':'Checklists','none-organizations-v1':'Organizações','none-brainstorm-v1':'BrainStorm','none-agents-v1':'Agentes','none-decisions-v1':'Decisões','none-auditorias-v1':'Auditorias','none-event-links-v1':'Empresas dos eventos'};
 return <section className="panel wa-prep"><h2>Seus dados</h2><p>Organizações, decisões, auditorias, notas, checklists e agentes são salvos no navegador e {sync.state==='local'?'ficam apenas neste dispositivo, porque a base do none OS não está configurada no servidor.':'sincronizados com a base do none OS, com histórico das últimas versões.'} Estado atual: {syncLabel[sync.state].toLowerCase()}.</p>
  <div className="card-actions"><button className="outline" onClick={download}>Exportar cópia dos meus dados</button><label className="btn-ghost btn-sm backup-pick">Restaurar de uma cópia<input type="file" accept="application/json,.json" className="sr-only" onChange={e=>{void pick(e.target.files?.[0]);e.target.value='';}}/></label></div>
  {pending?<div className="backup-confirm" role="alert"><p>Substituir {Object.keys(pending).map(k=>names[k]).join(', ')} pelos dados do arquivo? A versão atual continua no histórico do servidor.</p><button className="primary" onClick={restore}>Restaurar</button><button className="text-button" onClick={()=>setPending(null)}>Cancelar</button></div>:null}
  <p role="status">{notice}</p></section>;
}
