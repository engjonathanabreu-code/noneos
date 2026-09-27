# none OS

Workspace privado da holding none. Next.js + React + TypeScript.

## Iniciar
1. Instale Node.js 22 ou 24 LTS.
2. Execute npm ci.
3. Copie .env.example para .env.local e preencha NONE_ACCESS_KEY e NONE_SESSION_SECRET com dois segredos diferentes. O segredo de sessão deve ter pelo menos 32 caracteres. Gere cada um com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
4. Execute npm run dev e abra http://127.0.0.1:3000.
5. Para validar: npm run build. Para executar produção local: npm start.

## GitHub e Vercel
Extraia este ZIP. Suba o conteúdo desta pasta na raiz de um repositório privado, incluindo arquivos ocultos .gitignore e .env.example. Não envie .env.local, .vercel, node_modules ou .next.
Na Vercel, importe o repositório, selecione Next.js, Node 22/24 e root directory da pasta que contém package.json. Build: npm run build; install: npm ci; output automático. Cadastre os dois segredos nas variáveis de ambiente do projeto. Não use NEXT_PUBLIC_ para segredos. Faça deploy e confirme login, logout e proteção da página inicial.

## Estado atual
Cadastros, notas, logos, checklists e configurações ficam no localStorage deste navegador/origem. Não sincronizam entre dispositivos. Exporte o backup em Conexões antes de mudar domínio: o novo domínio não verá o armazenamento do anterior. O ZIP contém código, não os dados do seu navegador.
A IA (Claude, variável ANTHROPIC_API_KEY na Vercel) está ligada ao Perguntar à none, à leitura de relatórios e aos Agentes (rota /api/agentes: rascunhos para revisão; nada é enviado, publicado ou agendado). Indicadores das empresas vêm das bases Supabase somente leitura e a agenda do Google Calendar via OAuth. O estado de cada conexão aparece em Conexões. WhatsApp, Chatwoot, Gmail e redes sociais ainda não estão integrados; src/lib/whatsapp-connector.ts é somente um contrato.

Leia docs/SUPABASE.md e docs/AUDITORIA-DISPOSITIVOS.md antes de ampliar o uso.
