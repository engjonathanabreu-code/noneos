import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {createAllDayEvent, googleConfigured, GoogleNotConnected, listEvents} from '@/lib/google';

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}
const iso = (v:string|null) => v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;

function failure(e:unknown){
  if(e instanceof GoogleNotConnected) return NextResponse.json({status:'desconectado'},{status:409});
  return NextResponse.json({error:'Não foi possível falar com o Google Agenda agora.'},{status:502});
}

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!googleConfigured()) return NextResponse.json({status:'nao_configurado'},{status:409});
  const from = iso(req.nextUrl.searchParams.get('from')), to = iso(req.nextUrl.searchParams.get('to'));
  if(!from || !to || Date.parse(to)-Date.parse(from) > 1000*60*60*24*62 || to<=from) return NextResponse.json({error:'Período inválido.'},{status:400});
  try{return NextResponse.json({status:'ok',events:await listEvents(from,to)});}
  catch(e){return failure(e);}
}

export async function POST(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  let body:{title?:unknown;date?:unknown};
  try{body = await req.json();}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
  const title = typeof body.title==='string' ? body.title.trim() : '';
  const date = typeof body.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : '';
  if(!title || title.length>300 || !date) return NextResponse.json({error:'Informe título e data.'},{status:400});
  try{return NextResponse.json({status:'ok',event:await createAllDayEvent(title,date)});}
  catch(e){return failure(e);}
}
