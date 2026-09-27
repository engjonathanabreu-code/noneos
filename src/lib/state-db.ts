import 'server-only';
import {client, errorCode} from './db';
import {orgPattern, reportsConfigured} from './reports-db';
import {auditSummary, isAudit} from './audit';

// Workspace documents (organizations, logos, BrainStorm, checklists, agents, decisions, audits) kept in
// none_os.documentos_estado so every device sees the same data. Each save carries the version
// it was based on; the database refuses stale writes and archives the previous version.
export const stateKeyPattern = /^(organizacoes|brainstorm|checklists|agentes|decisoes|logo:(integral|mcl|reurb|ct|bergamota|vidas|org-[a-f0-9-]{36})|auditoria:[a-f0-9-]{36})$/;
export const stateConfigured = reportsConfigured;
export class VersionConflict extends Error {}

const sql = () => client(process.env.NONE_DB_APP!);

export async function stateVersions():Promise<Record<string,number>>{
  const rows = await sql()`select chave, versao from none_os.estado_versoes()`;
  return Object.fromEntries(rows.map(r=>[r.chave as string, Number(r.versao)]));
}

export async function readState(keys:string[]):Promise<{chave:string;dados:unknown;versao:number;atualizado_em:string}[]>{
  const rows = await sql()`select chave, dados, versao, atualizado_em from none_os.estado_ler(${keys}::text[])`;
  return rows.map(r=>({chave:r.chave, dados:r.dados, versao:Number(r.versao), atualizado_em:new Date(r.atualizado_em).toISOString()}));
}

export async function saveState(key:string, data:unknown, baseVersion:number):Promise<number>{
  try{
    const [row] = await sql()`select none_os.estado_salvar(${key}, ${sql().json(data as never)}, ${baseVersion}) as v`;
    return Number(row.v);
  }catch(e){
    if(/conflito_de_versao/.test((e as Error)?.message ?? '')) throw new VersionConflict();
    throw e;
  }
}

export {errorCode, orgPattern};

// Investment audits linked to a company ('all' = every audit), summarized for the AI.
// Failures are swallowed: the AI simply works without them.
export async function companyAudits(org:string, companyName?:(id:string)=>string|undefined){
  if(!stateConfigured()) return [];
  try{
    const keys = Object.keys(await stateVersions()).filter(k=>k.startsWith('auditoria:'));
    if(!keys.length) return [];
    const docs = await readState(keys);
    return docs.map(d=>d.dados).filter(isAudit).filter(a=>org==='all' || a.companyId===org)
      .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).slice(0,5)
      .map(a=>auditSummary(a, companyName?.(a.companyId)));
  }catch(e){
    console.error(`[estado] audits failed: ${errorCode(e)}`);
    return [];
  }
}
