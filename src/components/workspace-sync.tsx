'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';

// Keeps the browser copy of the workspace in step with none_os.documentos_estado.
// Components keep reading and writing localStorage; this layer pulls server versions before
// they mount, pushes local changes (debounced) and never discards data: when both sides
// changed, the local copy is kept under a "none-sync-conflito-*" key before adopting the server.

export type SyncState = 'loading'|'synced'|'saving'|'offline'|'local';
const SyncContext = createContext<{state:SyncState;at:string;syncNow:()=>Promise<void>}>({state:'local',at:'',syncNow:async()=>{}});
export function useWorkspaceSync(){return useContext(SyncContext);}
export const syncLabel:Record<SyncState,string> = {loading:'Sincronizando…',synced:'Sincronizado entre dispositivos',saving:'Salvando…',offline:'Sem conexão · salvo neste navegador',local:'Salvo neste navegador'};

const simpleKeys:Record<string,string> = {brainstorm:'none-brainstorm-v1',checklists:'none-checklists-v1',agentes:'none-agents-v1',decisoes:'none-decisions-v1'};
const orgKey = 'none-organizations-v1';
const auditKey = 'none-auditorias-v1';
const managed = new Set([orgKey,auditKey,...Object.values(simpleKeys)]);
const localKeyOf = (chave:string) => chave in simpleKeys ? simpleKeys[chave] : chave.startsWith('auditoria:') ? auditKey : orgKey;
const metaKey = 'none-sync-v1';
export const conflictPrefix = 'none-sync-conflito-';
const warnedTooLarge = new Set<string>();

type Meta = Record<string,{v:number;h:string}>;
type OrgItem = Record<string,unknown>&{id:string;logo?:string};
type AuditItem = Record<string,unknown>&{id:string;updatedAt?:string};

function canonical(v:unknown):string{
  if(Array.isArray(v)) return '['+v.map(canonical).join(',')+']';
  if(v&&typeof v==='object') return '{'+Object.keys(v).sort().filter(k=>(v as Record<string,unknown>)[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}';
  return JSON.stringify(v);
}
function hash(v:unknown){const s=canonical(v);let h1=0x811c9dc5,h2=0x1000193;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,16777619);h2=Math.imul(h2^c,2246822519);}return (h1>>>0).toString(36)+(h2>>>0).toString(36)+s.length.toString(36);}
function parse(raw:string|null){if(raw===null)return undefined;try{const v=JSON.parse(raw);return v&&typeof v==='object'?v:undefined;}catch{return undefined;}}
function readMeta():Meta{return (parse(localStorage.getItem(metaKey)) as Meta)??{};}

// Local storage → server documents. Logos travel as their own documents so the organization
// list stays small and each logo is versioned on its own.
function localDocs():Map<string,unknown>{
  const docs = new Map<string,unknown>();
  for(const [chave,key] of Object.entries(simpleKeys)){const v=parse(localStorage.getItem(key));if(v)docs.set(chave,v);}
  const orgs = parse(localStorage.getItem(orgKey)) as {version?:number;items?:OrgItem[]}|undefined;
  if(orgs&&Array.isArray(orgs.items)){
    docs.set('organizacoes',{...orgs,items:orgs.items.map(o=>({...o,logo:''}))});
    const meta = readMeta();
    // A removed logo is sent as empty once it had been synced, so other devices drop it too.
    for(const o of orgs.items) if(typeof o?.id==='string'&&(o.logo||meta['logo:'+o.id])) docs.set('logo:'+o.id,{logo:o.logo??''});
  }
  // Audits: one document each (handwritten notes make them large). A deleted audit that had been
  // synced is sent once as a tombstone so other devices remove it too.
  const audits = parse(localStorage.getItem(auditKey)) as {items?:AuditItem[]}|undefined;
  const ids = new Set<string>();
  if(audits&&Array.isArray(audits.items)) for(const a of audits.items) if(typeof a?.id==='string'&&/^[a-f0-9-]{36}$/.test(a.id)){ids.add(a.id);docs.set('auditoria:'+a.id,a);}
  for(const k of Object.keys(readMeta())) if(k.startsWith('auditoria:')&&!ids.has(k.slice(10))) docs.set(k,{id:k.slice(10),removida:true});
  return docs;
}

// Server documents → local storage (only what changed).
function writeDocs(docs:Map<string,unknown>){
  for(const [chave,key] of Object.entries(simpleKeys)) if(docs.has(chave)) localStorage.setItem(key,JSON.stringify(docs.get(chave)));
  const auditDocs=[...docs.entries()].filter(([k])=>k.startsWith('auditoria:'));
  if(auditDocs.length){
    const current = (parse(localStorage.getItem(auditKey)) as {items?:AuditItem[]}|undefined)?.items ?? [];
    const byId = new Map(current.filter(a=>typeof a?.id==='string').map(a=>[a.id,a]));
    for(const [k,d] of auditDocs){const id=k.slice(10);if((d as {removida?:boolean}).removida)byId.delete(id);else byId.set(id,d as AuditItem);}
    const items=[...byId.values()].sort((a,b)=>String(b.updatedAt??'').localeCompare(String(a.updatedAt??'')));
    localStorage.setItem(auditKey,JSON.stringify({version:1,items}));
  }
  const touchesOrgs=[...docs.keys()].some(k=>k==='organizacoes'||k.startsWith('logo:'));
  if(!touchesOrgs) return;
  const current = parse(localStorage.getItem(orgKey)) as {version?:number;items?:OrgItem[]}|undefined;
  const base = (docs.get('organizacoes') as {version?:number;items?:OrgItem[]}|undefined) ?? current;
  if(!base||!Array.isArray(base.items)) return;
  const localLogo = (id:string) => current?.items?.find(o=>o.id===id)?.logo ?? '';
  const items = base.items.map(o=>{const d=docs.get('logo:'+o.id) as {logo?:string}|undefined;return {...o,logo:d?(d.logo??''):localLogo(o.id)};});
  localStorage.setItem(orgKey,JSON.stringify({...base,items}));
}

async function api<T>(url:string,init?:RequestInit):Promise<{status:number;body:T}>{
  const r = await fetch(url,{cache:'no-store',...init});
  return {status:r.status,body:await r.json().catch(()=>({})) as T};
}

export function WorkspaceSync({children}:{children:React.ReactNode}){
  const [state,setState] = useState<SyncState>('loading');
  const [ready,setReady] = useState(false);
  const [generation,setGeneration] = useState(0);
  const [at,setAt] = useState('');
  const [notice,setNotice] = useState('');
  const running = useRef<Promise<void>|null>(null);
  const again = useRef(false);
  const applying = useRef(false);
  const enabled = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>|null>(null);

  const cycle = useCallback(async(initial:boolean)=>{
    const head = await api<{configured?:boolean;versoes?:Record<string,number>}>('/api/estado');
    if(head.status!==200) throw Error('status '+head.status);
    if(!head.body.configured){enabled.current=false;setState('local');return;}
    const server = head.body.versoes ?? {};
    const meta = readMeta();
    const local = localDocs();
    const toPull:string[] = [];
    const toPush:string[] = [];
    for(const chave of new Set([...Object.keys(server),...local.keys()])){
      const s = server[chave], m = meta[chave], l = local.get(chave);
      if(s===undefined){if(l!==undefined)toPush.push(chave);continue;}
      if(m&&m.v===s){if(l!==undefined&&hash(l)!==m.h)toPush.push(chave);continue;}
      toPull.push(chave);
    }
    let pulledChanges = false;
    const backups = new Set<string>();
    const tooLarge:string[] = [];
    const backup = (chave:string)=>{
      const key = localKeyOf(chave);
      if(backups.has(key)) return;
      const raw = localStorage.getItem(key); if(raw===null) return;
      backups.add(key);
      try{localStorage.setItem(conflictPrefix+key+'-'+new Date().toISOString().replace(/[:.]/g,'-'),raw);}catch{/* quota: the server keeps its own history */}
    };
    const pull = async(keys:string[])=>{
      if(!keys.length) return;
      const r = await api<{documentos?:{chave:string;dados:unknown;versao:number}[]}>('/api/estado?chaves='+encodeURIComponent(keys.join(',')));
      if(r.status!==200) throw Error('read '+r.status);
      const incoming = new Map<string,unknown>();
      const next = readMeta();
      const nowLocal = localDocs();
      for(const d of r.body.documentos ?? []){
        const h = hash(d.dados), l = nowLocal.get(d.chave), m = next[d.chave];
        if(l===undefined||hash(l)!==h){
          // Both sides differ: keep the local copy if it had changes the server never saw.
          if(l!==undefined&&(!m||hash(l)!==m.h)) backup(d.chave);
          incoming.set(d.chave,d.dados);
        }
        next[d.chave] = {v:d.versao,h};
      }
      // Asked for but not on the server (removed there): forget the old version so it is saved again.
      const found = new Set((r.body.documentos ?? []).map(d=>d.chave));
      for(const k of keys) if(!found.has(k)) delete next[k];
      if(incoming.size){applying.current=true;try{writeDocs(incoming);}finally{applying.current=false;}pulledChanges=true;}
      localStorage.setItem(metaKey,JSON.stringify(next));
    };
    await pull(toPull);
    for(const chave of toPush){
      const l = localDocs().get(chave); if(l===undefined) continue;
      const base = readMeta()[chave]?.v ?? server[chave] ?? 0;
      setState('saving');
      const r = await api<{versao?:number;conflito?:boolean}>('/api/estado',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({chave,dados:l,versao_base:base})});
      if(r.status===409&&r.body.conflito){await pull([chave]);if(!readMeta()[chave])again.current=true;continue;}
      // Too large to sync (e.g. many handwritten notes): keep it in this browser and say so.
      if(r.status===413){tooLarge.push(chave);continue;}
      if(r.status!==200||typeof r.body.versao!=='number') throw Error('save '+r.status);
      const next = readMeta(); next[chave] = {v:r.body.versao,h:hash(l)}; localStorage.setItem(metaKey,JSON.stringify(next));
    }
    setState('synced'); setAt(new Date().toISOString());
    if(tooLarge.some(k=>!warnedTooLarge.has(k))){tooLarge.forEach(k=>warnedTooLarge.add(k));setNotice('Uma auditoria ficou grande demais para sincronizar (anotações à mão). Ela continua salva neste navegador; exporte uma cópia em Conexões.');}
    if(backups.size) setNotice('Havia alterações diferentes neste navegador e em outro dispositivo. A versão do servidor foi aplicada e a cópia deste navegador foi guardada (Conexões → Exportar cópia).');
    if(pulledChanges&&!initial){window.dispatchEvent(new Event('none-organizations'));setGeneration(g=>g+1);if(!backups.size)setNotice('Atualizado com alterações feitas em outro dispositivo.');}
  },[]);

  const run = useCallback((initial=false)=>{
    if(!enabled.current) return Promise.resolve();
    if(running.current){again.current=true;return running.current;}
    const p = (async()=>{
      try{do{again.current=false;await cycle(initial);initial=false;}while(again.current&&enabled.current);}
      catch(e){console.error('[sync]',(e as Error)?.message);setState('offline');}
      finally{running.current=null;}
    })();
    running.current = p;
    return p;
  },[cycle]);

  useEffect(()=>{
    let alive = true;
    const fallback = setTimeout(()=>{if(alive)setReady(true);},10000);
    run(true).finally(()=>{if(alive){clearTimeout(fallback);setReady(true);}});
    // Watch component writes to the managed keys.
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(this:Storage,key:string,value:string){
      original.call(this,key,value);
      if(this===window.localStorage&&managed.has(key)&&!applying.current&&enabled.current){
        setState('saving');
        if(timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(()=>{timer.current=null;void run();},1200);
      }
    };
    const onFocus = ()=>{if(document.visibilityState==='visible')void run();};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onFocus);
    window.addEventListener('online',onFocus);
    const interval = setInterval(onFocus,120000);
    const beforeUnload = (e:BeforeUnloadEvent)=>{if(timer.current||running.current){e.preventDefault();}};
    window.addEventListener('beforeunload',beforeUnload);
    return()=>{alive=false;clearTimeout(fallback);Storage.prototype.setItem=original;window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);window.removeEventListener('online',onFocus);window.removeEventListener('beforeunload',beforeUnload);clearInterval(interval);if(timer.current)clearTimeout(timer.current);};
  },[run]);

  useEffect(()=>{if(!notice)return;const id=setTimeout(()=>setNotice(''),9000);return()=>clearTimeout(id);},[notice]);

  if(!ready) return <div className="sync-loading" role="status"><span className="brand">none<span>®</span></span><p>Sincronizando seu workspace…</p></div>;
  return <SyncContext.Provider value={{state,at,syncNow:()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}return run();}}}>
    <div key={generation} style={{display:'contents'}}>{children}</div>
    {notice?<div className="toast sync-toast" role="status">{notice}<button aria-label="Fechar aviso" onClick={()=>setNotice('')}>×</button></div>:null}
  </SyncContext.Provider>;
}
