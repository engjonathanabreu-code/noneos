# Integração futura: holding e investimentos

O Supabase não está implementado nesta versão. Adicionar variáveis não ativa sincronização. Não execute SQL copiado sem definir permissões e testar em desenvolvimento.

## Projeto central none OS
Implementar Supabase Auth com usuários individuais; modelar organizações, membros, notas, pastas, itens recorrentes e conclusões por período. Criar migrations versionadas, RLS em cada tabela exposta e políticas por usuário/organização; logos em bucket privado com políticas e URLs assinadas. Migrar dados locais com prévia, backup e deduplicação. Testar isolamento entre usuários antes de produção.

## Bases das empresas
Cada projeto mantém seu banco e operação. Criar adaptadores no servidor para consultas autorizadas de cada investimento. Usar credenciais distintas, acesso mínimo e preferencialmente somente leitura. Não colocar chaves secretas no navegador. Chaves secretas bypassam RLS; por isso não são um substituto para autorização e não são credenciais limitadas de leitura. Preferir APIs/roles/views específicas com permissões restritas. Não presumir login ou tabelas compartilhadas entre projetos.

Mapear cada organization_id da holding para o projeto/fonte correspondente. Normalizar dados com origem, data de atualização e identificador externo. Não misturar valores de empresas distintas nem substituir o ERP. Testar cada conexão isoladamente e só depois habilitar sincronização.

## Variáveis futuras (não utilizadas pelo código atual)
NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY para o projeto central após implementar cliente/Auth/RLS. Segredos de conectores apenas no servidor, sem prefixo NEXT_PUBLIC_. Não preencher .env.example com chaves reais.

Fontes oficiais consultadas: https://supabase.com/docs/guides/getting-started/api-keys e https://supabase.com/docs/guides/database/postgres/row-level-security

## Implementado: indicadores somente leitura (set/2026)
Em cada projeto abaixo existe o schema `none_os` com a função `none_os.resumo()` (security definer) que devolve apenas totais agregados em JSON. O papel `none_reader` (NOLOGIN até receber senha) só tem USAGE no schema e EXECUTE nessa função — nenhum acesso a tabelas.

| Empresa | Projeto Supabase | Variável na Vercel |
|---|---|---|
| Integral | CRM INTEGRAL OFICIAL (oxjqcpkvaseqhjjtsxmd) | NONE_DB_INTEGRAL_CRM |
| Integral | ERP INTEGRAL Interno (ycdsyilyvaxslkwbkxyo) | NONE_DB_INTEGRAL_ERP |
| Minha Casa Legal | Financeiro MCL (jeuecmmnxvlzpruyoraw) | NONE_DB_MCL |
| REURB.Software | Matricula.IA (lnuoakuzkpyqilatxgkz) | NONE_DB_MATRICULAIA |

O servidor (`src/lib/indicators.ts`, rota `/api/indicadores`, exige sessão) lê essas funções com cache de 5 minutos. Para mudar um indicador, altere a função no projeto de origem; a tela renderiza qualquer item `{grupo, rotulo, valor, formato, nota}`.

## Implementado: base central do none OS (set/2026)
Relatórios analisados pela IA ficam no schema `none_os` do projeto **Financas Pessoais Casa** (esuvvrbpcbehnqpqczbg), separado das tabelas pessoais (`public`) e fora da Data API.

- `none_os.relatorios` e `none_os.indicadores`: cada linha pertence a uma organização (`organizacao_id`). Uma chave estrangeira composta `(relatorio_id, organizacao_id)` impede que um indicador aponte para relatório de outra empresa.
- O papel `none_app` (variável `NONE_DB_APP` na Vercel) não tem acesso às tabelas; só executa `salvar_relatorio(org, dados)`, `relatorios_da_organizacao(org)` e `remover_relatorio(org, id)`, sempre filtradas pela organização informada.
- Rotas: `/api/relatorios/extrair` (IA lê o arquivo, nada é salvo) e `/api/relatorios` (GET/POST/DELETE por empresa, exige sessão).
