import 'server-only';
import postgres from 'postgres';

// One small pooled client per Supavisor connection string (transaction mode, so no prepared statements).
const clients = new Map<string,postgres.Sql>();

export function client(url:string){
  let sql = clients.get(url);
  if(!sql){sql = postgres(url,{prepare:false,max:1,idle_timeout:20,connect_timeout:8,ssl:'require'});clients.set(url,sql);}
  return sql;
}

export function errorCode(e:unknown){const x=e as {code?:string;errno?:string;name?:string};return x?.code??x?.errno??x?.name??'unknown';}
