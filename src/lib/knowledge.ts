import 'server-only';
import {client, errorCode} from './db';
import {reportsConfigured} from './reports-db';

// Private knowledge base: the partner's FGV MBA course material (none_os.conhecimento),
// searched in Portuguese. The none_app role can only call the two functions below.
export type Passage = {disciplina:string;arquivo:string;trecho:string};
const sql = () => client(process.env.NONE_DB_APP!);

export async function knowledgeStatus():Promise<{disciplinas:number;trechos:number}|null>{
  if(!reportsConfigured()) return null;
  try{const [r] = await sql()`select disciplinas, trechos from none_os.conhecimento_status()`;return {disciplinas:Number(r.disciplinas), trechos:Number(r.trechos)};}
  catch(e){console.error(`[conhecimento] status failed: ${errorCode(e)}`);return null;}
}

// Runs several focused searches and keeps the best distinct passages within a character budget.
export async function knowledgeSearch(queries:string[], budget=24000, perQuery=6):Promise<Passage[]>{
  if(!reportsConfigured()) return [];
  try{
    const results = await Promise.all(queries.filter(q=>q.trim()).map(q=>sql()`select disciplina, arquivo, trecho from none_os.conhecimento_buscar(${q.slice(0,4000)}, ${perQuery})`));
    const out:Passage[] = [], seen = new Set<string>();
    let used = 0;
    // Round-robin across queries so every theme gets represented.
    for(let i=0;i<perQuery;i++) for(const rows of results){
      const r = rows[i]; if(!r) continue;
      const key = r.arquivo+'|'+String(r.trecho).slice(0,80);
      if(seen.has(key) || used+String(r.trecho).length>budget) continue;
      seen.add(key); used += String(r.trecho).length;
      out.push({disciplina:r.disciplina, arquivo:r.arquivo, trecho:r.trecho});
    }
    return out;
  }catch(e){
    console.error(`[conhecimento] search failed: ${errorCode(e)}`);
    return [];
  }
}
