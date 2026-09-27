import {NextRequest, NextResponse} from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {authenticated} from '@/lib/auth';
import {aiConfigured, extractReport} from '@/lib/report-extract';
import {orgPattern} from '@/lib/reports-db';

export const maxDuration = 120;

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}
// Known portfolio context; other organizations use the name sent by the page.
const companies:Record<string,string> = {ct:'CT Diego Silva (academia / centro de treinamento, sistema Next Fit)',bergamota:'Bergamota (confeitaria)',vidas:'Cartão Vidas (clube de vantagens)',integral:'Integral Soluções em Engenharia',mcl:'Minha Casa Legal',reurb:'REURB.Software'};
const MAX = 3_500_000; // ~2.6 MB PDF after base64; Vercel request bodies cap at 4.5 MB

export async function POST(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!aiConfigured()) return NextResponse.json({error:'A IA ainda não está configurada no servidor (ANTHROPIC_API_KEY).'},{status:409});
  let b:{company?:unknown;companyName?:unknown;fileName?:unknown;kind?:unknown;data?:unknown};
  try{b = await req.json();}catch{return NextResponse.json({error:'Arquivo inválido.'},{status:400});}
  const org = typeof b.company==='string' && orgPattern.test(b.company) ? b.company : null;
  const company = org ? companies[org] ?? (typeof b.companyName==='string' && b.companyName.trim() ? b.companyName.trim().slice(0,150) : undefined) : undefined;
  const fileName = typeof b.fileName==='string' ? b.fileName.slice(0,200) : '';
  if(!company || !fileName || (b.kind!=='pdf' && b.kind!=='text') || typeof b.data!=='string' || !b.data) return NextResponse.json({error:'Arquivo inválido.'},{status:400});
  if(b.data.length > MAX) return NextResponse.json({error:'Arquivo grande demais. Exporte um período menor.'},{status:413});
  try{
    const result = await extractReport(b.kind==='pdf' ? {company,fileName,kind:'pdf',base64:b.data} : {company,fileName,kind:'text',text:b.data});
    return NextResponse.json({status:'ok',result});
  }catch(e){
    if(e instanceof Anthropic.RateLimitError) return NextResponse.json({error:'A IA está ocupada. Tente em instantes.'},{status:429});
    if(e instanceof Anthropic.AuthenticationError) return NextResponse.json({error:'Chave da IA inválida no servidor.'},{status:502});
    if(e instanceof Anthropic.BadRequestError){
      // The API message describes the request problem (never the report contents).
      console.error('[relatorios] extract 400:', e.message.slice(0,500));
      if(/credit balance/i.test(e.message)) return NextResponse.json({error:'A conta da IA está sem créditos. Adicione créditos em console.anthropic.com → Billing.'},{status:402});
      return NextResponse.json({error:'A IA não conseguiu ler este arquivo. Tente exportar em PDF ou Excel.'},{status:422});
    }
    console.error('[relatorios] extract failed:', e instanceof Anthropic.APIError ? e.status : (e as Error).message);
    return NextResponse.json({error:'Não foi possível analisar o relatório agora.'},{status:502});
  }
}
