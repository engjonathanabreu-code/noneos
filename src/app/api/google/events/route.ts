import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {createAllDayEvent, createEvent, GoogleApiError, googleConfigured, GoogleNotConnected, listEvents} from '@/lib/google';

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}
const iso = (v:string|null) => v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;

function failure(e:unknown){
  if(e instanceof GoogleNotConnected) return NextResponse.json({status:'desconectado'},{status:409});
  const reason = e instanceof GoogleApiError ? e.reason : '';
  if(!(e instanceof GoogleApiError)) console.error('[google] request failed:', (e as Error)?.message);
  const error = /accessNotConfigured|SERVICE_DISABLED/i.test(reason) ? 'A API do Google Calendar está desativada no projeto do Google Cloud. Ative "Google Calendar API" no console do Google Cloud.'
    : /invalid_client|unauthorized_client/i.test(reason) ? 'As credenciais do Google (GOOGLE_CLIENT_ID/SECRET) no servidor foram recusadas.'
    : /rateLimit|quota/i.test(reason) ? 'O Google limitou as consultas agora. Tente em instantes.'
    : 'Não foi possível falar com o Google Agenda agora.';
  return NextResponse.json({error, motivo:reason||undefined},{status:502});
}

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!googleConfigured()) return NextResponse.json({status:'nao_configurado'},{status:409});
  const from = iso(req.nextUrl.searchParams.get('from')), to = iso(req.nextUrl.searchParams.get('to'));
  if(!from || !to || Date.parse(to)-Date.parse(from) > 1000*60*60*24*62 || to<=from) return NextResponse.json({error:'Período inválido.'},{status:400});
  try{return NextResponse.json({status:'ok',events:await listEvents(from,to)});}
  catch(e){return failure(e);}
}

const str = (v:unknown,max:number) => typeof v==='string' ? v.trim().slice(0,max) : '';
const isDate = (v:string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const isTime = (v:string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

export async function POST(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!googleConfigured()) return NextResponse.json({status:'nao_configurado'},{status:409});
  let body:Record<string,unknown>;
  try{body = await req.json();}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
  const title = str(body.title,300), date = str(body.date,10);
  if(!title || !isDate(date)) return NextResponse.json({error:'Informe título e data.'},{status:400});
  try{
    // Checklist shortcut: {title, date} only → all-day event.
    if(body.allDay===undefined) return NextResponse.json({status:'ok',event:await createAllDayEvent(title,date)});
    const allDay = body.allDay===true, endDate = str(body.endDate,10) || date;
    const startTime = str(body.startTime,5), endTime = str(body.endTime,5), timeZone = str(body.timeZone,64) || 'America/Sao_Paulo';
    if(!isDate(endDate) || endDate<date || !/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(timeZone)) return NextResponse.json({error:'Datas inválidas.'},{status:400});
    if(!allDay && (!isTime(startTime) || !isTime(endTime) || endDate+endTime<=date+startTime)) return NextResponse.json({error:'O término deve ser depois do início.'},{status:400});
    return NextResponse.json({status:'ok',event:await createEvent({title,allDay,date,endDate,startTime,endTime,timeZone,location:str(body.location,300),description:str(body.description,4000)})});
  }catch(e){return failure(e);}
}
