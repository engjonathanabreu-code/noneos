# Auditoria de dispositivos — 26/09/2026

## Escopo e resultado
Revisão do código responsivo e compilação de produção. Build Next.js e verificação TypeScript aprovados. Esta é uma revisão técnica, não uma certificação de compatibilidade Safari.

## Ajustes incluídos
- viewport-fit=cover e espaçamento com safe-area para barra inferior, avisos e botão de IA no iPhone.
- Campos de formulário com 16px em telas pequenas para reduzir zoom automático do Safari.
- Controles compactos de notas, edição de organizações e checklists com área mínima de 44px em dispositivos de toque.
- Barra de ferramentas com rolagem horizontal e altura das notas baseada em viewport dinâmico.
- Preservadas as regras existentes de layout móvel, tablet e desktop; preferência por movimento reduzido respeitada.
- Node 22/24 declarado e instruções de publicação e armazenamento atualizadas.

## Limites da verificação
O servidor de produção iniciou normalmente. A tentativa de abrir o navegador de testes retornou navegador indisponível; portanto não foi possível confirmar visualmente as alterações nesta sessão. Não foram executados testes em iPhone, iPad ou macOS físicos, Safari, teclado virtual ou orientações reais. Não há medição de Lighthouse/Core Web Vitals nesta entrega.

Antes de uso definitivo, validar no Safari: iPhone retrato/paisagem, iPad com teclado e Split View, Mac com teclado/trackpad; login, navegação, criação/edição de nota, painel IA, checklist, formulário de empresa e exportação. Confirmar ausência de rolagem horizontal da página e campos visíveis com teclado aberto.

## Publicação e dados
O pacote compila e contém os arquivos necessários para GitHub/Vercel. Não contém credenciais ou dados salvos no navegador. As seis empresas iniciais permanecem. O acesso atual é por chave compartilhada; falta login individual e limitação distribuída de tentativas para ampliar o uso.

Dados permanecem no localStorage, sem sincronização entre dispositivos e sem Supabase ativo. Faça backup em Conexões antes de trocar domínio ou navegador. Integrações e IA continuam desconectadas. Consulte SUPABASE.md para a etapa posterior de implementação.
