import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {aiConfigured, claude, MODEL} from '@/lib/claude';
import {googleConfigured, googleCookie} from '@/lib/google';
import {companyIndicators} from '@/lib/indicators';
import {errorCode, pingReportsDb, reportsConfigured} from '@/lib/reports-db';

// Live status of every none OS connection, checked on the server.
export type ConnectionStatus = 'conectado'|'desconectado'|'nao_configurado'|'erro'|'previsto'|'manual';
export type Connection = {id:string; name:string; kind:string; purpose:string; status:ConnectionStatus; detail:string};

let aiCache:{at:number; ok:boolean; detail:string}|null = null;
async function checkAi():Promise<Pick<Connection,'status'|'detail'>>{
  if(!aiConfigured()) return {status:'nao_configurado', detail:'Adicione ANTHROPIC_API_KEY na Vercel.'};
  if(aiCache && Date.now()-aiCache.at < 10*60*1000) return {status:aiCache.ok?'conectado':'erro', detail:aiCache.detail};
  try{
    // Reading the model metadata validates key and workspace without spending tokens.
    const m = await claude().models.retrieve(MODEL);
    aiCache = {at:Date.now(), ok:true, detail:`${m.display_name} · Perguntar, agentes, decisões, BrainStorm, checklists e relatórios`};
  }catch(e){
    console.error('[conexoes] ai check failed:', errorCode(e));
    aiCache = {at:Date.now(), ok:false, detail:'A chave não foi aceita. Verifique a chave e o workspace no console da Anthropic.'};
  }
  return {status:aiCache.ok?'conectado':'erro', detail:aiCache.detail};
}

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  const [ai, integral, mcl, reurb, db] = await Promise.all([
    checkAi(),
    companyIndicators('integral'), companyIndicators('mcl'), companyIndicators('reurb'),
    reportsConfigured() ? pingReportsDb().then(()=>true).catch(e=>{console.error('[conexoes] db:',errorCode(e));return false;}) : Promise.resolve(null)
  ]);
  const google:Pick<Connection,'status'|'detail'> = !googleConfigured()
    ? {status:'nao_configurado', detail:'Credenciais do Google ausentes no servidor.'}
    : req.cookies.get(googleCookie)?.value
      ? {status:'conectado', detail:'Conectado neste navegador · leitura e criação de eventos'}
      : {status:'desconectado', detail:'Conecte para ver sua agenda e agendar itens do checklist.'};
  const supa = (company:string, r:Awaited<ReturnType<typeof companyIndicators>>) => r.map(f=>({
    id:'supabase-'+f.fonte, name:f.fonte, kind:'Supabase · '+company, purpose:'Indicadores somente leitura',
    status:(f.status==='ok'?'conectado':f.status==='nao_configurado'?'nao_configurado':'erro') as ConnectionStatus,
    detail:f.status==='ok' ? `${f.indicadores.length} indicadores · atualizado ${new Date(f.gerado_em).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})}` : f.mensagem
  }));
  const connections:Connection[] = [
    {id:'claude', name:'Claude (Anthropic)', kind:'Inteligência artificial', purpose:'Perguntar à none, rascunhos dos agentes, análise de decisões, BrainStorm, checklists e leitura de relatórios', ...ai},
    {id:'google', name:'Google Agenda', kind:'Agenda', purpose:'Compromissos e agendamento do checklist', ...google},
    ...supa('Integral', integral), ...supa('Minha Casa Legal', mcl), ...supa('REURB.Software', reurb),
    {id:'erp-agenda', name:'Agenda do ERP Integral', kind:'Supabase · Integral', purpose:'Eventos públicos, prazos de metas e do Radar',
      status:integral.some(f=>f.fonte==='ERP INTEGRAL Interno' && f.status==='ok')?'conectado':'erro', detail:'Somente leitura · aparece em Hoje e no calendário do checklist'},
    {id:'none-db', name:'Base do none OS', kind:'Supabase · base central', purpose:'Sincroniza organizações, decisões, notas, checklists e agentes entre dispositivos; guarda os relatórios lidos pela IA',
      status:db===null?'nao_configurado':db?'conectado':'erro', detail:db?'Schema none_os · acesso apenas por funções, com histórico de versões':db===null?'Adicione NONE_DB_APP na Vercel.':'Não foi possível conectar agora.'},
    {id:'nextfit', name:'Next Fit', kind:'CT Diego Silva', purpose:'Sem API: relatórios exportados e lidos pela IA', status:'manual', detail:'Envie relatórios em Organizações → CT Diego Silva'},
    {id:'whatsapp', name:'WhatsApp', kind:'Comunicação', purpose:'Conversas com clientes', status:'previsto', detail:'Integração prevista'},
    {id:'chatwoot', name:'Chatwoot', kind:'Atendimento', purpose:'Conversas e relacionamento', status:'previsto', detail:'Integração prevista'},
    {id:'gmail', name:'Gmail', kind:'Comunicação', purpose:'E-mails e contexto de decisões', status:'previsto', detail:'Integração prevista'},
    {id:'social', name:'Redes sociais', kind:'Comunicação', purpose:'Pautas e publicações para revisão', status:'previsto', detail:'Contas a definir'}
  ];
  return NextResponse.json({connections, checkedAt:new Date().toISOString()});
}
