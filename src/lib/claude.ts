import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

// Shared Claude client for none OS server routes.
export const MODEL = 'claude-opus-5';
export function aiConfigured(){return !!process.env.ANTHROPIC_API_KEY;}

export function claude(){
  // Organization-level keys (not scoped to a workspace) must name the workspace on every call.
  const workspace = process.env.ANTHROPIC_WORKSPACE_ID;
  return new Anthropic(workspace ? {defaultHeaders:{'anthropic-workspace-id':workspace}} : {});
}

// Runs a beta request with the server-side refusal fallback; if the account
// rejects that beta (400), retries once without it.
export async function withFallback<T>(run:(extra:{betas?:Anthropic.Beta.AnthropicBeta[];fallbacks?:'default'})=>Promise<T>):Promise<T>{
  try{
    return await run({betas:['server-side-fallback-2026-07-01'], fallbacks:'default'});
  }catch(e){
    if(!(e instanceof Anthropic.BadRequestError) || /credit balance|not scoped to a workspace/i.test(e.message)) throw e;
    console.error('[claude] fallback request rejected, retrying without it:', e.message.slice(0,300));
    return run({});
  }
}

// Friendly message for API failures; never exposes raw errors to the page.
export function aiErrorMessage(e:unknown):{status:number;error:string}{
  if(e instanceof Anthropic.RateLimitError) return {status:429,error:'A IA está ocupada. Tente em instantes.'};
  if(e instanceof Anthropic.AuthenticationError) return {status:502,error:'Chave da IA inválida no servidor.'};
  if(e instanceof Anthropic.BadRequestError){
    console.error('[claude] 400:', e.message.slice(0,500));
    if(/not scoped to a workspace/i.test(e.message)) return {status:502,error:'A chave da IA não está vinculada a um workspace. Crie a chave dentro de um workspace no console da Anthropic ou configure ANTHROPIC_WORKSPACE_ID na Vercel.'};
    if(/credit balance/i.test(e.message)) return {status:402,error:'A conta da IA está sem créditos. Adicione créditos em console.anthropic.com → Billing.'};
    return {status:422,error:'A IA não conseguiu processar esta solicitação.'};
  }
  console.error('[claude] failed:', e instanceof Anthropic.APIError ? e.status : (e as Error)?.message);
  return {status:502,error:'Não foi possível falar com a IA agora.'};
}
