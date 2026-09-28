import {NextRequest, NextResponse} from 'next/server';
import {betaZodOutputFormat} from '@anthropic-ai/sdk/helpers/beta/zod';
import {z} from 'zod';
import {authenticated} from '@/lib/auth';
import {aiConfigured, aiErrorMessage, claude, MODEL, withFallback} from '@/lib/claude';
import {orgPattern} from '@/lib/reports-db';

export const maxDuration = 120;

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}
const str = (v:unknown, max:number) => typeof v==='string' ? v.trim().slice(0,max) : '';

// Recognizes which company (or the partner's personal life) each calendar event belongs to.
// Only the title, place, calendar name, source and time go to the AI.
export async function POST(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!aiConfigured()) return NextResponse.json({status:'nao_configurado'},{status:409});
  let b:{events?:unknown;companies?:unknown};
  try{b = await req.json();}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
  const companies = (Array.isArray(b.companies)?b.companies:[]).slice(0,40).map(c=>{const x=c as Record<string,unknown>;return {id:str(x.id,60), nome:str(x.name,160), setor:str(x.sector,160), sobre:str(x.description,400)};}).filter(c=>orgPattern.test(c.id));
  const events = (Array.isArray(b.events)?b.events:[]).slice(0,40).map(e=>{const x=e as Record<string,unknown>;return {chave:str(x.key,300), titulo:str(x.title,300), local:str(x.location,200)||undefined, agenda:str(x.calendar,120)||undefined, origem:x.source==='erp'?'ERP da Integral':'Google Agenda', quando:str(x.start,40)};}).filter(e=>e.chave && e.titulo);
  if(!events.length || !companies.length) return NextResponse.json({error:'Nada para classificar.'},{status:400});
  const ids = new Set(companies.map(c=>c.id));

  const Result = z.object({eventos:z.array(z.object({
    chave:z.string(),
    empresa:z.string().nullable().describe('id da empresa, "personal" para compromisso pessoal do sócio, ou null se não for possível saber'),
  }))});
  const system = [
    'Você classifica compromissos da agenda do sócio Jonathan David de Abreu, dono da holding none, pelas empresas do portfólio (lista EMPRESAS) ou como pessoais.',
    'Use o título, o local, o nome da agenda e a origem. Eventos do ERP da Integral costumam ser da Integral, mas podem citar outra empresa (ex.: REURB, Minha Casa Legal).',
    '"personal" para saúde, família, academia, lazer, viagens pessoais e assuntos particulares. Quando não houver pista clara, responda null: é melhor não classificar do que errar.',
    'Responda com a chave exata de cada evento recebido.'
  ].join('\n');
  const client = claude();
  try{
    const response = await withFallback(extra=>client.beta.messages.parse({
      model:MODEL, max_tokens:4000, output_config:{effort:'low', format:betaZodOutputFormat(Result)}, system,
      messages:[{role:'user', content:JSON.stringify({EMPRESAS:companies, EVENTOS:events})}],
      ...extra
    }));
    const out = response.parsed_output?.eventos ?? [];
    const keys = new Set(events.map(e=>e.chave));
    const result = Object.fromEntries(out.filter(o=>keys.has(o.chave)).map(o=>[o.chave, o.empresa && (o.empresa==='personal' || ids.has(o.empresa)) ? o.empresa : null]));
    return NextResponse.json({status:'ok', result});
  }catch(e){
    const {status,error} = aiErrorMessage(e);
    return NextResponse.json({error},{status});
  }
}
