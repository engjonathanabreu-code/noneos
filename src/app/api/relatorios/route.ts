import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {ReportExtraction} from '@/lib/report-extract';
import {errorCode, listReports, orgPattern, removeReport, reportsConfigured, saveReport} from '@/lib/reports-db';

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function guard(req:NextRequest, write:boolean){
  if(write && !sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!reportsConfigured()) return NextResponse.json({error:'Base de dados do none OS não configurada no servidor.'},{status:409});
  return null;
}
function failure(tag:string, e:unknown){
  console.error(`[relatorios] ${tag} failed: ${errorCode(e)}`);
  return NextResponse.json({error:'Não foi possível acessar a base do none OS agora.'},{status:502});
}

export async function GET(req:NextRequest){
  const g = await guard(req,false); if(g) return g;
  const org = req.nextUrl.searchParams.get('empresa') ?? '';
  if(!orgPattern.test(org)) return NextResponse.json({error:'Organização inválida.'},{status:400});
  try{return NextResponse.json({status:'ok',reports:await listReports(org)});}
  catch(e){return failure('list',e);}
}

export async function POST(req:NextRequest){
  const g = await guard(req,true); if(g) return g;
  let b:{company?:unknown;fileName?:unknown;extraction?:unknown};
  try{b = await req.json();}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
  const org = typeof b.company==='string' && orgPattern.test(b.company) ? b.company : null;
  const fileName = typeof b.fileName==='string' ? b.fileName.trim().slice(0,200) : '';
  const parsed = ReportExtraction.safeParse(b.extraction);
  if(!org || !fileName || !parsed.success || !parsed.data.indicadores.length || parsed.data.indicadores.length>200) return NextResponse.json({error:'Dados do relatório inválidos.'},{status:400});
  try{return NextResponse.json({status:'ok',id:await saveReport(org,fileName,parsed.data)});}
  catch(e){return failure('save',e);}
}

export async function DELETE(req:NextRequest){
  const g = await guard(req,true); if(g) return g;
  const org = req.nextUrl.searchParams.get('empresa') ?? '', id = req.nextUrl.searchParams.get('id') ?? '';
  if(!orgPattern.test(org) || !uuid.test(id)) return NextResponse.json({error:'Solicitação inválida.'},{status:400});
  try{return NextResponse.json({status:'ok',removed:await removeReport(org,id)});}
  catch(e){return failure('remove',e);}
}
