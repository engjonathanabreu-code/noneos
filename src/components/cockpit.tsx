'use client';

import {useEffect,useRef,useState} from 'react';
import {ArrowDownLeft,ArrowRight,ArrowUpRight,Building2,CalendarCheck,Check,CheckCheck,ChevronRight,FileText,Home,Layers3,LockKeyhole,LogOut,PanelLeftClose,PanelLeftOpen,Plug,ShieldCheck,Sparkles,X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {WhatsAppPreparation} from '@/components/whatsapp-preparation';
import {OrganizationPortfolio} from '@/components/organization-portfolio';
import {useOrganizations,organizationContext,labels,type Organization} from '@/lib/organizations';
import {LocalBackup} from '@/components/local-backup';
import {CompanyChecklists} from '@/components/company-checklists';
import {BrainStorm} from '@/components/brainstorm';
import {LiveIndicators,PortfolioPulse} from '@/components/live-indicators';
import {AgendaCard} from '@/components/google-agenda';
import {CompanyReports} from '@/components/company-reports';
import {organizationLogo,companyColor} from '@/lib/brand';
import {ConnectionsStatus} from '@/components/connections-status';
import {AgentHub} from '@/components/agent-hub';
import {Decisions,usePendingDecisions} from '@/components/decisions';
import {useWorkspaceSync,syncLabel} from '@/components/workspace-sync';
import {useAiStatus,aiStateLabel} from '@/lib/ai-status';

type View='hoje'|'rotina'|'empresas'|'decisoes'|'agentes'|'perguntar'|'conexoes'|'brainstorm';
const navigation:{id:View;label:string;icon:LucideIcon}[]=[{id:'hoje',label:'Hoje',icon:Home},{id:'empresas',label:'Empresas',icon:Building2},{id:'decisoes',label:'Decisões',icon:CheckCheck},{id:'rotina',label:'Checklist e agenda',icon:CalendarCheck},{id:'agentes',label:'Agentes',icon:Layers3},{id:'brainstorm',label:'BrainStorm',icon:FileText},{id:'perguntar',label:'Perguntar à none',icon:Sparkles}];
function Badge({children,tone='neutral'}:{children:React.ReactNode;tone?:string}) {return <span className={`badge ${tone}`}>{children}</span>;}
function OrgMark({org}:{org:Organization}){const logo=organizationLogo(org);if(logo)return <img src={logo} alt="" aria-hidden="true" className="company-logo"/>;const c=companyColor(org);return <span aria-hidden="true" className="company-mark" style={{background:c+'24',color:c}}>{org.name.slice(0,2).toUpperCase()}</span>;}

export function Cockpit(){
 const portfolio=useOrganizations();
 const sync=useWorkspaceSync();
 const pending=usePendingDecisions();
 const [view,setView]=useState<View>('hoje');const [collapsed,setCollapsed]=useState(false);const [toast,setToast]=useState('');
 const [companyId,setCompanyId]=useState<string|null>(null);
 const company=companyId?portfolio.items.find(o=>o.id===companyId)??null:null;
 useEffect(()=>{const read=()=>{const [v,id]=location.hash.slice(1).split('/');if([...navigation.map(n=>n.id),'conexoes'].includes(v)){setView(v as View);setCompanyId(v==='empresas'&&id?decodeURIComponent(id):null);}else{setView('hoje');setCompanyId(null);}};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);},[]);
 useEffect(()=>{if(!toast)return;const id=setTimeout(()=>setToast(''),4500);return()=>clearTimeout(id);},[toast]);
 function go(v:View){setView(v);setCompanyId(null);location.hash=v;window.scrollTo({top:0,behavior:'instant'});}
 function openCompany(id:string){setCompanyId(id);setView('empresas');location.hash='empresas/'+encodeURIComponent(id);window.scrollTo({top:0,behavior:'instant'});}
 async function logout(){try{const r=await fetch('/api/session',{method:'DELETE'});if(!r.ok)throw Error();window.location.assign('/entrar');}catch{setToast('Não foi possível sair. Tente novamente.');}}
 const title=company?company.name:({hoje:'Hoje',rotina:'Checklist e agenda',empresas:'Empresas',decisoes:'Decisões',agentes:'Agentes',perguntar:'Perguntar à none',conexoes:'Conexões',brainstorm:'BrainStorm'}[view]);
 const agentName=(id:string)=>({secretary:'Secretária',finance:'Financeiro',executive:'Executivo',social:'Social'} as Record<string,string>)[id];
 return <div className={`shell ${collapsed?'collapsed':''}`}>
  <aside className="sidebar"><div className="brand-row"><button className="brand" onClick={()=>go('hoje')} aria-label="none início">{collapsed?'n.':<>none<span>®</span></>}</button><button className="collapse-button" aria-label={collapsed?'Expandir menu':'Recolher menu'} onClick={()=>setCollapsed(c=>!c)}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}</button></div><div className="workspace-label"><span className="workspace-dot"/>SEU WORKSPACE</div><nav aria-label="Navegação principal">{navigation.map(n=><button key={n.id} title={n.label} aria-label={n.id === 'decisoes' && pending > 0 ? n.label + ' ' + pending : n.label} aria-current={view===n.id?'page':undefined} className={`nav-item ${view===n.id?'active':''}`} onClick={()=>go(n.id)}><n.icon size={21}/><span>{n.label}</span>{n.id==='decisoes'&&pending>0?<b>{pending}</b>:null}</button>)}</nav><div className="sidebar-bottom"><div className="private-note"><ShieldCheck size={19}/><div>Seu espaço, privado.<small>Clareza para decidir.</small></div></div><button className={`nav-item ${view==='conexoes'?'active':''}`} onClick={()=>go('conexoes')} title="Conexões"><Plug size={20}/><span>Conexões</span></button><div className="profile"><span className="avatar">JA</span><div>Jonathan David de Abreu<small>Visão do sócio</small></div><button className="icon-button" title="Sair" aria-label="Sair" onClick={logout}><LogOut size={18}/></button></div></div></aside>
  <div className="main-shell"><header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14}/><strong>{title}</strong></div><div className="topbar-right"><span className="private-label"><LockKeyhole size={13}/>Privado</span><span className="demo-pill">none OS</span><span className="avatar light" title="Jonathan David de Abreu · Visão do sócio">JA</span><button className="icon-button mobile-control" aria-label="Conexões" onClick={()=>go('conexoes')}><Plug size={18}/></button><button className="icon-button mobile-control" aria-label="Sair" onClick={logout}><LogOut size={18}/></button></div></header>
  <main id="main-content" className="content"><div className={`demo-notice sync-${sync.state}`}><span className="demo-dot"/><span>Workspace privado · {syncLabel[sync.state]}</span>{sync.state==='offline'?<button className="notice-end text-button" onClick={()=>void sync.syncNow()}>Tentar sincronizar</button>:<button className="notice-end text-button" onClick={()=>go('conexoes')}>Ver conexões</button>}</div>
  <div className="view-transition" key={view+':'+(companyId??'')} >
  {view==='hoje'&&<><div className="page-heading"><div><p className="eyebrow">NONE / HOLDING DE INVESTIMENTOS</p><h1>Seu portfólio, em perspectiva.</h1><p>Indicadores dos sistemas conectados e decisões em um só lugar. Checklist e agenda têm um espaço próprio no menu.</p></div></div><div className="overview-stats"><button className="stat-card" onClick={()=>go('empresas')}><span className="stat-label">Investimentos cadastrados</span><strong>{portfolio.items.length}</strong><span className="stat-foot">Organizar portfólio<ArrowUpRight size={17}/></span></button><button className="stat-card" onClick={()=>go('decisoes')}><span className="stat-label">Decisões pendentes</span><strong>{pending}</strong><span className="stat-foot">{pending?'Revisar decisões':'Registrar uma decisão'}<ArrowUpRight size={17}/></span></button></div><section className="portfolio-section"><div className="section-header"><h2>Investimentos da none</h2><button className="text-button" onClick={()=>go('empresas')}>Gerenciar organizações</button></div><div className="mini-companies">{portfolio.items.map(c=><button key={c.id} onClick={()=>openCompany(c.id)}>{organizationLogo(c)?<img src={organizationLogo(c)} alt="" style={{width:32,height:32,objectFit:'contain'}}/>:<Building2 size={22}/>}<span>{c.name}<small>{c.status}</small></span></button>)}</div></section><PortfolioPulse onOpen={openCompany}/></>}
  {view==='rotina'&&<><div className="page-heading"><div><p className="eyebrow">SUA ROTINA</p><h1>Checklist e agenda.</h1><p>As tarefas de cada empresa e, em seguida, o resumo dos compromissos do Google Agenda e do ERP da Integral.</p></div></div><CompanyChecklists/><AgendaCard/></>}
  {view==='empresas'&&(company?<CompanyDetail org={company} onBack={()=>go('empresas')}/>:<OrganizationPortfolio onLegacy={openCompany}/>)}
  {view==='decisoes'&&<Decisions/>}
  {view==='agentes'&&<AgentHub onRun={id=>setToast(`Rascunho do agente ${agentName(id)??''} pronto para revisão. Nada foi enviado.`)}/>}
  {view==='brainstorm'&&<BrainStorm/>}
  {view==='perguntar'&&<Chat/>}
  {view==='conexoes'&&<><div className="page-heading"><div><p className="eyebrow">SEUS SISTEMAS, CONECTADOS</p><h1>O contexto começa nas fontes.</h1><p>A none reúne informação acima dos seus sistemas existentes.</p></div></div><div className="integration-note"><ShieldCheck size={24}/><div><h3>Uma camada executiva para o seu ecossistema.</h3><p>ERP e CRM continuam sendo as fontes da operação. A none lê indicadores em modo somente leitura e não altera dados das empresas.</p></div></div><ConnectionsStatus/><LocalBackup/><WhatsAppPreparation/></>}
  </div><footer className="page-footer"><span className="footer-brand">none.</span><span>Holding de investimentos · Workspace privado</span><span>{syncLabel[sync.state]}</span></footer></main></div>
  {toast?<div className="toast" role="status"><Check size={18}/>{toast}<button aria-label="Fechar aviso" onClick={()=>setToast('')}><X size={16}/></button></div>:null}
 </div>;
}

// Companies with a read-only Supabase summary (see src/lib/indicators.ts); null shows every group.
const liveCompanies=['integral','mcl','reurb'];
const liveGroups:Record<string,string[]|null>={Financeiro:['Financeiro'],Clientes:['Clientes','Comercial'],Indicadores:null};
const contextFields=['description','audience','products','services','pricing','billing','profit','ownership','values','guidance'] as const;

function CompanyDetail({org,onBack}:{org:Organization;onBack:()=>void}){
 const [tab,setTab]=useState('Visão geral');const tabs=['Visão geral','Financeiro','Clientes','Documentos','Decisões','Indicadores'];
 const live=liveCompanies.includes(org.id);const filled=contextFields.filter(k=>org[k].trim()).length;const missing=contextFields.filter(k=>!org[k].trim()).map(k=>labels[k]);
 return <><button className="text-button back-button" onClick={onBack}><ArrowDownLeft size={16}/>Todas as empresas</button><div className="company-detail-heading"><OrgMark org={org}/><div><p className="eyebrow">{org.sector||'Setor a informar'}</p><h1>{org.name}</h1></div><Badge tone={org.status==='Em operação'?'green':'amber'}>{org.status}</Badge></div>{org.description?<p className="detail-description">{org.description}</p>:null}<div className="tabs" role="tablist" aria-label="Áreas da empresa">{tabs.map(t=><button key={t} id={`tab-${t}`} role="tab" aria-selected={tab===t} aria-controls="company-tabpanel" className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t}</button>)}</div><section id="company-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
 {tab==='Visão geral'?<>{live?<LiveIndicators companyId={org.id}/>:<CompanyReports company={org.id} companyName={org.name}/>}<div className="detail-grid"><section className="panel next-step"><p className="eyebrow">CONTEXTO PARA A IA</p><h2>{filled} de {contextFields.length} campos do cadastro preenchidos.</h2><p>{missing.length?'Complete em Empresas → Personalizar: '+missing.slice(0,4).join(', ')+(missing.length>4?'…':'.'):'O cadastro completo orienta os agentes, as análises de decisões e Perguntar à none.'}</p><Badge tone={live?'green':'neutral'}>{live?'Indicadores conectados':'Dados via relatórios importados'}</Badge></section><section className="panel"><div className="section-header"><h2>Decisões da empresa</h2></div><Decisions companyId={org.id} compact/></section></div></>:null}
 {tab==='Decisões'?<Decisions companyId={org.id} compact/>:null}
 {tab==='Documentos'?<><p className="reports-hint">Relatórios importados desta empresa. A IA lê os indicadores extraídos de cada arquivo.</p><CompanyReports company={org.id} companyName={org.name}/></>:null}
 {tab in liveGroups?(live?<LiveIndicators companyId={org.id} groups={liveGroups[tab]??undefined}/>:<CompanyReports company={org.id} companyName={org.name}/>):null}
 </section></>;
}

type ChatMessage={role:'user'|'assistant';text:string;error?:boolean};
const chatKey='none-perguntar-v1';
function Chat(){const portfolio=useOrganizations();const ai=useAiStatus();const [question,setQuestion]=useState('');const [companyId,setCompanyId]=useState('all');const [messages,setMessages]=useState<ChatMessage[]>([]);const [busy,setBusy]=useState(false);const bottom=useRef<HTMLDivElement>(null);
 // The conversation survives switching screens in this tab (sessionStorage), not across devices.
 useEffect(()=>{try{const v=JSON.parse(sessionStorage.getItem(chatKey)??'null');if(v&&Array.isArray(v.messages)){setMessages(v.messages.slice(-40));if(typeof v.companyId==='string')setCompanyId(v.companyId);}}catch{}},[]);
 useEffect(()=>{try{sessionStorage.setItem(chatKey,JSON.stringify({messages:messages.slice(-40),companyId}));}catch{}},[messages,companyId]);
 useEffect(()=>{const panel=bottom.current?.parentElement;if(messages.length&&panel)panel.scrollTo({top:panel.scrollHeight,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[messages]);
 async function ask(q:string){const text=q.trim();if(!text||busy)return;const history=messages.filter(m=>!m.error);setMessages(m=>[...m,{role:'user',text}]);setQuestion('');setBusy(true);
 try{const r=await fetch('/api/perguntar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:text,scope:companyId,orgIds:portfolio.items.map(o=>o.id),orgContext:organizationContext(companyId),history})});const j=await r.json().catch(()=>({}));setMessages(m=>[...m,{role:'assistant',text:r.ok?j.text:(j.error??'Não foi possível responder agora.'),error:!r.ok}]);}
 catch{setMessages(m=>[...m,{role:'assistant',text:'Sem conexão com o servidor. Tente novamente.',error:true}]);}
 finally{setBusy(false);}}
 return <><div className="page-heading chat-heading"><div><p className="eyebrow">CONVERSE COM O SEU CONTEXTO</p><h1>Perguntar à none</h1><p>Uma pergunta. Uma visão mais clara.</p></div><div className="chat-heading-actions"><Badge tone={ai==='conectado'?'green':ai==='checking'?'neutral':'amber'}>{aiStateLabel[ai]}</Badge>{messages.length?<button className="btn-ghost btn-sm" disabled={busy} onClick={()=>setMessages([])}>Nova conversa</button>:null}</div></div><section className="chat-panel"><div className="chat-toolbar"><span><Sparkles size={18}/>none Executive</span><select aria-label="Contexto da conversa" value={companyId} onChange={e=>setCompanyId(e.target.value)}><option value="all">Todo o portfólio</option>{portfolio.items.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></div><div className="chat-messages" role="log" aria-label="Conversa com none" aria-live="polite">{messages.length===0?<div className="chat-welcome"><div className="none-orb">n.</div><h2>Por onde começamos?</h2><p>Explore as prioridades e o contexto das suas empresas.</p><div className="suggestions">{['Como está o caixa das empresas este mês?','Quais recebíveis estão em atraso?','O que tenho na agenda da Integral nos próximos dias?'].map(q=><button key={q} disabled={ai==='nao_configurado'} onClick={()=>ask(q)}>{q}<ArrowUpRight size={17}/></button>)}</div></div>:messages.map((m,i)=><div className={`message ${m.role}`} key={i}>{m.role==='assistant'?<span className="message-avatar">n.</span>:null}<div><small>{m.role==='assistant'?(m.error?'none · aviso':'none · IA'):'Você'}</small><p>{m.text}</p></div></div>)}{busy?<div role="status" className="thinking">Analisando seus dados…</div>:null}<div ref={bottom}/></div><form className="chat-form" onSubmit={e=>{e.preventDefault();ask(question);}}><label className="sr-only" htmlFor="question">Sua pergunta para a none</label><input id="question" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={1000} placeholder={ai==='nao_configurado'?'Configure a chave da IA para perguntar':'Pergunte sobre suas empresas…'} autoComplete="off" disabled={ai==='nao_configurado'}/><button className="send-button" aria-label="Enviar pergunta" disabled={!question.trim()||busy||ai==='nao_configurado'}><ArrowRight size={21}/></button></form><p className="chat-disclaimer">Respostas da IA com base no cadastro, nos sistemas conectados, nos relatórios importados e na agenda do ERP da Integral. Confira números importantes na fonte.</p></section></>;}
