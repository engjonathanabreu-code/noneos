# none OS · UI Style Guide

Guia visual do none OS. Os tokens e componentes base estão em `src/app/ui.css` (carregado por último no `layout.tsx`). Tela nova usa estes tokens e classes; não crie cor, tamanho de botão ou raio novos dentro de um componente.

## Princípios
1. **Calma e clareza.** Workspace de decisão: fundo claro, pouco ruído, números em destaque.
2. **Hierarquia pela variante, não pelo tamanho.** Ações que convivem têm a mesma altura; a importância vem da cor/peso.
3. **Dado real ou nada.** Sem números inventados. Toda métrica mostra fonte e período.
4. **Um caminho principal por tela.**

## Tokens

### Cor
| Token | Valor | Uso |
|---|---|---|
| `--green` | `#08785d` | Marca, ação primária, links de ação, foco |
| `--green-strong` | `#065f4a` | Hover da ação primária |
| `--green-soft` | `#edf6ef` | Fundo de ícone, hover de ghost, avisos neutros |
| `--ink` | `#192b28` | Texto principal e títulos |
| `--ink-2` | `#334c3d` | Texto de itens de lista |
| `--muted` | `#6d7c77` | Texto secundário, legendas |
| `--subtle` | `#9ba59c` | Metadados de baixa prioridade |
| `--line` / `--line-strong` | `#e7ece9` / `#dce5df` | Divisórias / bordas de controle |
| `--surface` / `--paper` | `#fff` / `#f7f9f8` | Cartões / fundo da página |
| `--ok` `--warn` `--danger` `--info` | verde, âmbar, vermelho, azul | Só para status, nunca decoração |

**Cores das empresas** (`src/lib/brand.ts`, `companyPalette`): identificam a empresa (ícone do checklist, iniciais). Não usar para botões nem para status.

**Fontes de agenda:** azul `#2563eb` = Google Agenda; `#0f766e` = ERP Integral.

### Espaçamento
Base 4px: `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 20 · `--s-6` 24 · `--s-8` 32.
Cartões: padding 24 (16 no celular). Entre cartões: 12–18. Entre seções: 26–32.

### Raio
`--r-control` 8px (botões, campos) · `--r-card` 13px (cartões/painéis) · `--r-pill` (pílulas).

### Tipografia
- Títulos: **Manrope** (`--font-display`). Texto: **DM Sans** (`--font-sans`).
- `h1` página (clamp 28–38px, 650) · `h2` seção · `h3` 16px/600.
- Corpo 14px (`--t-base`); controles 13px (`--t-md`); legendas 12px (`--t-sm`); eyebrow 11px caixa-alta com espaçamento (`.eyebrow`).
- Números de indicador: peso 650, `tabular-nums`.

## Botões

| Variante | Classe | Quando usar |
|---|---|---|
| **Primário** | `.primary` | A ação principal da tela ou do painel. **No máximo um visível por área.** Ex.: "Nova organização", "Confirmar e salvar", "Importar relatório". |
| **Secundário** | `.btn-secondary` (ou `.outline`) | Caminho principal dentro de um cartão; alternativas ao primário. Ex.: "Ver áreas da operação", "Cancelar". |
| **Ghost** | `.btn-ghost` | Ação complementar ao lado de um secundário. Ex.: "Enviar relatório" no cartão da empresa. |
| **Texto** | `.text-button` | Ação dentro de texto ou de baixa ênfase. Ex.: "Detalhes", "Tentar novamente", "Arquivados". |
| **Ícone** | `.icon-button` | Ações repetidas por item (editar, arquivar, remover). Sempre com `aria-label` e `title`. |

Tamanhos: padrão 40px (`--h-md`); `.btn-sm` 32px para ações dentro de cartões e listas. No celular o padrão sobe para 44px (alvo de toque).

**Regras**
- Botões lado a lado têm o **mesmo tamanho**. Nunca destaque uma ação só por ser maior.
- Ordem: principal primeiro (à esquerda), complementar depois. Ação destrutiva é a última e fica afastada.
- Rótulo: verbo no infinitivo + objeto curto ("Enviar relatório", "Conectar Google Agenda"). Sem "Clique aqui".
- Ícone opcional, 14px no `.btn-sm` e 16px no padrão; sempre antes do texto, exceto seta de navegação (depois).
- Carregando: trocar o texto ("Analisando…", "Salvando…") e desabilitar; não esconder o botão.

### Cartões
- Estrutura: cabeçalho (identidade + status) → título → metadados → descrição → detalhes → **`.card-actions`** (rodapé com divisória, alinhado na base do cartão).
- O rodapé tem no máximo **uma** ação secundária e **uma** ghost. Edição fica como `.icon-button` no canto.
- Exemplo (cartão de organização): `Ver áreas da operação` (secundário) + `Enviar relatório` (ghost). Organizações sem áreas usam `Enviar relatório` como secundário.

## Indicadores
- Cartão `.panel.metric`: rótulo (12px, muted) → valor (grande, 650) → nota (fonte, período, contexto).
- Sempre dizer a origem: "Fonte: ERP INTEGRAL Interno · atualizado 27/09 14:30 · somente leitura" ou "Receita, 01/09/2026 a 26/09/2026".
- Moeda `R$ 18.450` (sem centavos em painéis), inteiros com separador de milhar pt-BR.

## Estados e mensagens
- Carregando: texto curto ("Carregando indicadores…"), sem spinner decorativo.
- Vazio: diga o que falta e o próximo passo ("Importe relatórios do Next Fit na página da empresa.").
- Erro: o que aconteceu + o que fazer ("A conta da IA está sem créditos. Adicione créditos em…"). Nunca mostrar erro técnico cru.
- Avisos neutros: `.gcal-notice` (fundo `--green-soft`). Confirmações de sucesso: uma frase, sem exclamação.

## Formulários
Rótulo visível acima do campo; campos 16px no celular (evita zoom no iOS); foco verde (`--focus`). Seleção de ícone/cor: grade de botões com `aria-pressed`.

## Acessibilidade
Contraste AA; foco visível em todo controle; `aria-label` em botões só de ícone; alvo de toque ≥ 44px no celular; não comunicar só por cor (dots do calendário têm legenda).
