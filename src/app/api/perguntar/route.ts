import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {aiConfigured, aiErrorMessage, claude, MODEL, withFallback} from '@/lib/claude';
import {companyIndicators, erpAgenda, hasSources} from '@/lib/indicators';
import {listReports, orgPattern, reportsConfigured} from '@/lib/reports-db';

export const maxDuration = 120;

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}

const system = `Você é a none, assistente executiva da holding de investimentos "none", conversando com o sócio Jonathan David de Abreu.

Responda em português do Brasil, de forma direta e útil para decisão: comece pela resposta, depois o detalhe que a sustenta.

Use apenas os dados do CONTEXTO desta mensagem (cadastro das empresas, indicadores lidos dos sistemas, relatórios importados e agenda do ERP). Ao citar um número, diga de onde ele vem e o período (ex.: "Financeiro MCL, setembro" ou "relatório Receita, 01/09 a 26/09"). Se o dado necessário não estiver no contexto, diga claramente que não há essa informação conectada e sugira como obtê-la (ex.: importar um relatório). Não invente valores, projeções nem nomes de pessoas.

Mantenha os dados de cada empresa separados; só compare empresas quando o sócio pedir. Formate valores em reais como R$ 12.345. Use listas curtas quando ajudarem; evite respostas longas sem necessidade.`;

type Msg = {role:'user'|'assistant'; text:string};

export async function POST(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!aiConfigured()) return NextResponse.json({error:'A IA ainda não está configurada no servidor.'},{status:409});
  let b:{question?:unknown;scope?:unknown;orgIds?:unknown;orgContext?:unknown;history?:unknown};
  try{b = await req.json();}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
  const question = typeof b.question==='string' ? b.question.trim().slice(0,2000) : '';
  const scope = typeof b.scope==='string' && (b.scope==='all' || orgPattern.test(b.scope)) ? b.scope : null;
  const orgIds = Array.isArray(b.orgIds) ? b.orgIds.filter((x):x is string=>typeof x==='string' && orgPattern.test(x)).slice(0,30) : [];
  const orgContext = typeof b.orgContext==='string' ? b.orgContext.slice(0,30000) : '';
  const history:Msg[] = Array.isArray(b.history) ? b.history.filter((m):m is Msg=>!!m && (m.role==='user'||m.role==='assistant') && typeof m.text==='string').slice(-10).map(m=>({role:m.role,text:m.text.slice(0,4000)})) : [];
  if(!question || !scope) return NextResponse.json({error:'Pergunta inválida.'},{status:400});

  const ids = scope==='all' ? orgIds : [scope];
  const now = new Date();
  const [live, reports, agenda] = await Promise.all([
    Promise.all(ids.filter(hasSources).map(async id=>({id, fontes:await companyIndicators(id)}))),
    reportsConfigured() ? Promise.all(ids.map(async id=>({id, relatorios:await listReports(id).catch(()=>[])}))) : Promise.resolve([]),
    ids.includes('integral') ? erpAgenda(now.toISOString(), new Date(now.getTime()+14*864e5).toISOString()).catch(()=>null) : Promise.resolve(null)
  ]);

  const context = {
    hoje: now.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'full'}),
    escopo: scope==='all' ? 'todo o portfólio' : scope,
    cadastro_das_empresas: orgContext,
    indicadores_dos_sistemas: live.map(l=>({empresa:l.id, fontes:l.fontes.map(f=>f.status==='ok' ? {fonte:f.fonte, atualizado_em:f.gerado_em, indicadores:f.indicadores} : {fonte:f.fonte, indisponivel:f.mensagem})})),
    relatorios_importados: reports.filter(r=>r.relatorios.length).map(r=>({empresa:r.id, relatorios:r.relatorios.slice(0,8).map(x=>({relatorio:x.relatorio, periodo:[x.periodo_inicio,x.periodo_fim], importado_em:x.importedAt, indicadores:x.indicadores}))})),
    minha_agenda_erp_integral_14_dias: agenda ? agenda.map(a=>({titulo:a.titulo, inicio:a.inicio, tipo:a.tipo, agenda:a.agenda})) : undefined
  };

  const client = claude();
  try{
    const response = await withFallback(extra=>client.beta.messages.create({
      model:MODEL,
      max_tokens:16000,
      output_config:{effort:'medium'},
      system,
      messages:[
        ...history.map(m=>({role:m.role, content:m.text})),
        {role:'user', content:`<contexto>\n${JSON.stringify(context)}\n</contexto>\n\n${question}`}
      ],
      ...extra
    }));
    if(response.stop_reason==='refusal') return NextResponse.json({error:'A IA não respondeu a esta pergunta. Tente reformular.'},{status:422});
    const text = response.content.flatMap(c=>c.type==='text' ? [c.text] : []).join('\n').trim();
    return NextResponse.json({status:'ok', text: text || 'Não consegui formar uma resposta com os dados disponíveis.'});
  }catch(e){
    const {status,error} = aiErrorMessage(e);
    return NextResponse.json({error},{status});
  }
}
