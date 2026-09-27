import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {errorCode, readState, saveState, stateConfigured, stateKeyPattern, stateVersions, VersionConflict} from '@/lib/state-db';

// Workspace sync: GET lists versions (or reads ?chaves=a,b), PUT saves one document.
function sameOrigin(req:NextRequest){try{return new URL(req.headers.get('origin')??'').host===req.headers.get('host');}catch{return false;}}
const maxBytes = 4_000_000;

function failure(tag:string, e:unknown){
  console.error(`[estado] ${tag} failed: ${errorCode(e)}`);
  return NextResponse.json({error:'Não foi possível acessar a base do none OS agora.'},{status:502});
}

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!stateConfigured()) return NextResponse.json({configured:false});
  const param = req.nextUrl.searchParams.get('chaves');
  try{
    if(param===null) return NextResponse.json({configured:true, versoes:await stateVersions()});
    const keys = [...new Set(param.split(',').filter(Boolean))];
    if(!keys.length || keys.length>100 || !keys.every(k=>stateKeyPattern.test(k))) return NextResponse.json({error:'Chaves inválidas.'},{status:400});
    return NextResponse.json({configured:true, documentos:await readState(keys)});
  }catch(e){return failure('read',e);}
}

export async function PUT(req:NextRequest){
  if(!sameOrigin(req)) return NextResponse.json({error:'Origem inválida.'},{status:403});
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  if(!stateConfigured()) return NextResponse.json({error:'Base de dados do none OS não configurada no servidor.'},{status:409});
  const raw = await req.text();
  if(raw.length>maxBytes) return NextResponse.json({error:'Documento grande demais para sincronizar.'},{status:413});
  let b:{chave?:unknown;dados?:unknown;versao_base?:unknown};
  try{b = JSON.parse(raw);}catch{return NextResponse.json({error:'Solicitação inválida.'},{status:400});}
  const key = typeof b.chave==='string' && stateKeyPattern.test(b.chave) ? b.chave : null;
  const base = typeof b.versao_base==='number' && Number.isInteger(b.versao_base) && b.versao_base>=0 ? b.versao_base : null;
  if(!key || base===null || !b.dados || typeof b.dados!=='object') return NextResponse.json({error:'Solicitação inválida.'},{status:400});
  try{return NextResponse.json({status:'ok', versao:await saveState(key, b.dados, base)});}
  catch(e){
    if(e instanceof VersionConflict) return NextResponse.json({error:'Os dados foram alterados em outro dispositivo.', conflito:true},{status:409});
    return failure('save',e);
  }
}
