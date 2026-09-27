import 'server-only';
import postgres from 'postgres';
import type {CompanyId} from './domain';

// Each company's Supabase project exposes only none_os.resumo(), an aggregated,
// read-only summary. The none_reader role has no table grants.
export type Indicator = {grupo:string; rotulo:string; valor:number; formato:'int'|'brl'|'pct'; nota?:string};
export type SourceResult =
  | {fonte:string; status:'ok'; gerado_em:string; indicadores:Indicator[]}
  | {fonte:string; status:'nao_configurado'|'erro'; mensagem:string};

const sources:Partial<Record<CompanyId,{fonte:string;env:string}[]>> = {
  integral:[{fonte:'CRM INTEGRAL OFICIAL',env:'NONE_DB_INTEGRAL_CRM'},{fonte:'ERP INTEGRAL Interno',env:'NONE_DB_INTEGRAL_ERP'}],
  mcl:[{fonte:'Financeiro MCL',env:'NONE_DB_MCL'}],
  reurb:[{fonte:'Matricula.IA',env:'NONE_DB_MATRICULAIA'}]
};

export function hasSources(id:string):id is CompanyId {return id in sources;}

const TTL = 5*60*1000;
const cache = new Map<string,{at:number;result:SourceResult}>();
const clients = new Map<string,postgres.Sql>();

function client(url:string){
  let sql = clients.get(url);
  if(!sql){sql = postgres(url,{prepare:false,max:1,idle_timeout:20,connect_timeout:8,ssl:'require'});clients.set(url,sql);}
  return sql;
}

async function read(fonte:string,env:string):Promise<SourceResult>{
  const url = process.env[env];
  if(!url) return {fonte,status:'nao_configurado',mensagem:'Conexão ainda não configurada no servidor.'};
  const hit = cache.get(env);
  if(hit && Date.now()-hit.at < TTL) return hit.result;
  try{
    const [row] = await client(url)`select none_os.resumo() as r`;
    const r = row.r as {gerado_em:string;indicadores:Indicator[]};
    const result:SourceResult = {fonte,status:'ok',gerado_em:r.gerado_em,indicadores:r.indicadores.map(i=>({...i,valor:Number(i.valor)}))};
    cache.set(env,{at:Date.now(),result});
    return result;
  }catch(e){
    // Never forward driver errors: they can contain host or role details. Log only the code.
    console.error(`[indicators] ${env} failed: ${errorCode(e)}`);
    return {fonte,status:'erro',mensagem:'Não foi possível ler a fonte agora.'};
  }
}

function errorCode(e:unknown){const x=e as {code?:string;errno?:string;name?:string};return x?.code??x?.errno??x?.name??'unknown';}

// ERP Integral agenda: public events, goal deadlines, process SLAs and Radar deadlines.
export type ErpAgendaItem = {id:string;tipo:'evento'|'meta'|'processo'|'radar';titulo:string;inicio:string;fim:string;dia_todo:boolean;agenda:string|null};
export async function erpAgenda(from:string,to:string):Promise<ErpAgendaItem[]|null>{
  const url = process.env.NONE_DB_INTEGRAL_ERP;
  if(!url) return null;
  try{
    const [row] = await client(url)`select none_os.agenda(${from}::timestamptz, ${to}::timestamptz) as r`;
    return row.r as ErpAgendaItem[];
  }catch(e){
    console.error(`[erp-agenda] failed: ${errorCode(e)}`);
    throw e;
  }
}

export async function companyIndicators(id:CompanyId){
  return Promise.all((sources[id]??[]).map(s=>read(s.fonte,s.env)));
}
