import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {erpAgenda} from '@/lib/indicators';
import type {CalendarEvent} from '@/lib/google';

const iso = (v:string|null) => v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null;
function nextDay(date:string){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  const from = iso(req.nextUrl.searchParams.get('from')), to = iso(req.nextUrl.searchParams.get('to'));
  if(!from || !to || to<=from || Date.parse(to)-Date.parse(from) > 1000*60*60*24*62) return NextResponse.json({error:'Período inválido.'},{status:400});
  try{
    const items = await erpAgenda(from,to);
    if(!items) return NextResponse.json({status:'nao_configurado'},{status:409});
    // Same shape as Google events so the UI can merge both. All-day ends are exclusive.
    const events:CalendarEvent[] = items.map(i=>({id:i.id,title:i.titulo,allDay:i.dia_todo,start:i.inicio,end:i.dia_todo?nextDay(i.inicio):i.fim,source:'erp',kind:i.tipo,calendar:i.agenda??undefined}));
    return NextResponse.json({status:'ok',events});
  }catch{
    return NextResponse.json({error:'Não foi possível ler a agenda do ERP agora.'},{status:502});
  }
}
