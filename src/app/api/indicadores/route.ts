import {NextRequest, NextResponse} from 'next/server';
import {authenticated} from '@/lib/auth';
import {companyIndicators, hasSources} from '@/lib/indicators';

export async function GET(req:NextRequest){
  if(!(await authenticated())) return NextResponse.json({error:'Não autenticado.'},{status:401});
  const empresa = req.nextUrl.searchParams.get('empresa') ?? '';
  if(!hasSources(empresa)) return NextResponse.json({empresa,fontes:[]});
  return NextResponse.json({empresa,fontes:await companyIndicators(empresa)});
}
