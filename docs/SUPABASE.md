# Supabase no none OS

As seções "Implementado" no fim deste arquivo descrevem o que está em produção. As demais são o plano para a evolução (usuários individuais e Auth). Não execute SQL copiado sem definir permissões e testar em desenvolvimento.

## Evolução planejada: usuários individuais
Implementar Supabase Auth com usuários individuais; modelar organizações, membros, notas, pastas, itens recorrentes e conclusões por período. Criar migrations versionadas, RLS em cada tabela exposta e políticas por usuário/organização; logos em bucket privado com políticas e URLs assinadas. Migrar dados locais com prévia, backup e deduplicação. Testar isolamento entre usuários antes de produção.

## Bases das empresas
Cada projeto mantém seu banco e operação. Criar adaptadores no servidor para consultas autorizadas de cada investimento. Usar credenciais distintas, acesso mínimo e preferencialmente somente leitura. Não colocar chaves secretas no navegador. Chaves secretas bypassam RLS; por isso não são um substituto para autorização e não são credenciais limitadas de leitura. Preferir APIs/roles/views específicas com permissões restritas. Não presumir login ou tabelas compartilhadas entre projetos.

Mapear cada organization_id da holding para o projeto/fonte correspondente. Normalizar dados com origem, data de atualização e identificador externo. Não misturar valores de empresas distintas nem substituir o ERP. Testar cada conexão isoladamente e só depois habilitar sincronização.

## Variáveis para a evolução com Auth (não utilizadas pelo código atual)
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

## Implementado: sincronização do workspace (set/2026)
Organizações, logos, decisões, BrainStorm, checklists e agentes deixam de existir só no navegador. Ficam em `none_os.documentos_estado` (mesmo projeto **Financas Pessoais Casa**), um documento JSON por chave: `organizacoes`, `logo:<organização>`, `brainstorm`, `checklists`, `agentes`, `decisoes`.

- Cada gravação informa a versão em que se baseou. `estado_salvar` recusa gravações antigas (`conflito_de_versao`), arquiva a versão anterior em `documentos_estado_historico` (últimas 30 por chave) e ignora gravações sem mudança.
- O papel `none_app` só executa `estado_versoes()`, `estado_ler(chaves)`, `estado_salvar(chave, dados, versao_base)`, `estado_remover(chave)` e `estado_historico(chave)`. RLS ligado e nenhuma política: as tabelas não são acessíveis diretamente.
- Rota `/api/estado` (sessão obrigatória; PUT exige mesma origem, até 4 MB por documento).
- No navegador, `src/components/workspace-sync.tsx` baixa as versões novas antes de abrir o cockpit, envia as alterações locais (1,2 s após salvar), verifica de novo ao voltar à aba e a cada 2 minutos. Se o mesmo dado mudou em dois dispositivos, a versão do servidor vence e a cópia local é guardada em `none-sync-conflito-*`, incluída na exportação em Conexões.
- Sem `NONE_DB_APP`, o workspace continua funcionando só no navegador, e a barra do topo mostra "Salvo neste navegador".

## Agenda do ERP da Integral: somente do sócio (set/2026)
`none_os.agenda(de, ate, email)` devolve só os eventos que a pessoa criou ou para os quais foi convidada (exceto os recusados), as metas que criou e os processos em que é responsável. Radar e itens de outras pessoas ficam de fora. O e-mail vem de `NONE_ERP_EMAIL` (padrão: o do sócio).

## Auditoria de investimento (set/2026)
O none auditoria (antes um app separado, none-auditoria-confeitaria) virou a aba Auditoria. Cada auditoria fica em `auditoria:<id>` em `none_os.documentos_estado`, ligada a uma empresa. Backups exportados pelo app antigo são importados sem mudança de formato. `companyAudits()` (src/lib/state-db.ts) resume as auditorias (sem as anotações à mão) para os agentes Executivo e Financeiro, a análise de Decisões e Perguntar à none.

## Base de conhecimento · MBA FGV (set/2026)
O material do MBA (OneDrive/Pós Graduação FGV, 149 arquivos) foi extraído localmente com `scripts/kb-extract.mjs` e carregado em `none_os.conhecimento` (3.672 trechos, busca em português, RLS sem políticas). O papel `none_app` só executa `conhecimento_buscar(consulta, limite)` e `conhecimento_status()`; a função de carga foi removida após o uso. O agente Executivo usa a base na entrega "Nova consultoria" (vários temas + achados das auditorias) e, de forma focada, nas demais entregas do Executivo e do Financeiro.
