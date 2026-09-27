import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {googleConfigured, googleCookie, revoke} from '@/lib/google';

function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  return NextResponse.json({configured:googleConfigured(),connected:!!req.cookies.get(googleCookie)?.value});
}

// Disconnect: revoke at Google and drop the encrypted token cookie.
export async function DELETE(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  await revoke();
  const res = NextResponse.json({ok:true});
  res.cookies.set(googleCookie, '', {maxAge:0, path:'/'});
  return res;
}
