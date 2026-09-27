import { NextRequest, NextResponse } from 'next/server';
import { configured, createSession, cookieName, validKey } from '@/lib/auth';
function sameOrigin(req:NextRequest) { try { const origin=new URL(req.headers.get('origin')??''); return ['http:','https:'].includes(origin.protocol)&&origin.host===req.headers.get('host'); } catch { return false; } }
export async function POST(req:NextRequest) {
 if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
 if(!configured()) return NextResponse.json({error:'Acesso ainda não configurado.'},{status:503});
 let body; try{body=await req.json();}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
 if(!body||typeof body.key!=='string'||body.key.length>256||!validKey(body.key)) { await new Promise(r=>setTimeout(r,700)); return NextResponse.json({error:'Chave inválida. Confira e tente novamente.'},{status:401}); }
 const response=NextResponse.json({ok:true}); response.cookies.set(cookieName,await createSession(),{httpOnly:true,secure:new URL(req.headers.get('origin')!).protocol==='https:',sameSite:'strict',maxAge:28800,path:'/'}); return response;
}
export async function DELETE(req:NextRequest) {if(!sameOrigin(req))return NextResponse.json({error:'Origem inválida.'},{status:403});const r=NextResponse.json({ok:true}); r.cookies.delete(cookieName); return r;}
