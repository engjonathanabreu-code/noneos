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
