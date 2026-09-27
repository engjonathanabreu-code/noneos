import 'server-only';
import {client, errorCode} from './db';
import type {ReportExtraction} from './report-extract';

// none OS central store (schema none_os in the "Financas Pessoais Casa" project).
// The none_app role can only call these three functions; each is scoped to one organization.
export const orgPattern = /^(integral|mcl|reurb|ct|bergamota|vidas|org-[a-f0-9-]{36})$/;
export type StoredReport = ReportExtraction & {id:string;company:string;fileName:string;importedAt:string};

export function reportsConfigured(){return !!process.env.NONE_DB_APP;}
const sql = () => client(process.env.NONE_DB_APP!);

export async function listReports(org:string):Promise<StoredReport[]>{
  const [row] = await sql()`select none_os.relatorios_da_organizacao(${org}) as r`;
  return (row.r as StoredReport[]).map(r=>({...r,indicadores:r.indicadores.map(i=>({...i,valor:Number(i.valor)}))}));
}

export async function saveReport(org:string, fileName:string, data:ReportExtraction){
  const payload = {arquivo:fileName, relatorio:data.relatorio, periodo_inicio:data.periodo_inicio, periodo_fim:data.periodo_fim, observacoes:data.observacoes, indicadores:data.indicadores};
  const [row] = await sql()`select none_os.salvar_relatorio(${org}, ${sql().json(payload)}) as id`;
  return row.id as string;
}

export async function removeReport(org:string, id:string){
  const [row] = await sql()`select none_os.remover_relatorio(${org}, ${id}::uuid) as ok`;
  return row.ok as boolean;
}

export {errorCode};

export async function pingReportsDb(){await sql()`select 1`;}
