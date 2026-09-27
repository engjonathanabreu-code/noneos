import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import {betaZodOutputFormat} from '@anthropic-ai/sdk/helpers/beta/zod';
import {z} from 'zod';

// Reads a report exported from a company's management system (e.g. Next Fit)
// and returns aggregated indicators only. Personal data never leaves as output.
export const ReportExtraction = z.object({
  relatorio: z.string().describe('Nome do relatório identificado, ex.: "Receita", "Clientes", "Contas a receber em atraso"'),
  periodo_inicio: z.string().nullable().describe('Início do período coberto, YYYY-MM-DD, se constar no relatório'),
  periodo_fim: z.string().nullable().describe('Fim do período coberto, YYYY-MM-DD, se constar no relatório'),
  indicadores: z.array(z.object({
    grupo: z.enum(['Financeiro','Clientes','Operação','Comercial']),
    rotulo: z.string(),
    valor: z.number(),
    formato: z.enum(['int','brl','pct']),
    nota: z.string().nullable()
  })),
  observacoes: z.string().describe('Até 2 frases sobre limitações da leitura; vazio se nenhuma')
});
export type ReportExtraction = z.infer<typeof ReportExtraction>;

const system = `Você extrai indicadores gerenciais de relatórios exportados de sistemas de gestão das empresas de uma holding. O relatório pertence à empresa informada.

Regras:
- Devolva apenas números que estejam no relatório ou que sejam contagem/soma direta das linhas dele. Não estime, não projete, não complete lacunas.
- Nunca devolva nomes, CPF, telefone, e-mail ou qualquer dado de uma pessoa. Só totais agregados.
- Valores em reais usam formato "brl" (número puro, sem símbolo); quantidades usam "int"; percentuais "pct".
- Quando o indicador corresponder a um destes, use exatamente o rótulo, para que relatórios diferentes se somem na mesma visão: "Clientes ativos", "Novos clientes no período", "Clientes que saíram no período", "Clientes em risco de abandono", "Contratos a vencer", "Acessos no período", "Receita no período", "Vendas no período", "Contas a receber em aberto", "Contas a receber em atraso", "Contas a pagar em aberto", "Saldo do caixa no período", "Recorrências negadas", "Check-ins Wellhub no período", "Validações TotalPass no período". Para outros, crie um rótulo curto e claro em português.
- Use "nota" para contexto útil curto (ex.: "37 parcelas", "média de 12 por dia"); caso contrário null.
- Se o arquivo não for um relatório gerencial reconhecível, devolva indicadores vazios e explique em observacoes.`;

type Input = {company:string; fileName:string} & ({kind:'pdf'; base64:string} | {kind:'text'; text:string});

export async function extractReport(input:Input):Promise<ReportExtraction>{
  const client = new Anthropic();
  const file:Anthropic.Beta.BetaContentBlockParam = input.kind==='pdf'
    ? {type:'document', source:{type:'base64', media_type:'application/pdf', data:input.base64}, title:input.fileName}
    : {type:'document', source:{type:'text', media_type:'text/plain', data:input.text}, title:input.fileName};
  const response = await client.beta.messages.parse({
    model:'claude-opus-5',
    max_tokens:16000,
    betas:['server-side-fallback-2026-07-01'],
    fallbacks:'default',
    output_config:{effort:'medium', format:betaZodOutputFormat(ReportExtraction)},
    system,
    messages:[{role:'user', content:[file, {type:'text', text:`Empresa: ${input.company}. Arquivo: ${input.fileName}. Extraia os indicadores deste relatório.`}]}]
  });
  if(response.stop_reason === 'refusal') throw new Error('refusal');
  if(!response.parsed_output) throw new Error('unparsed');
  return response.parsed_output;
}

export function aiConfigured(){return !!process.env.ANTHROPIC_API_KEY;}
