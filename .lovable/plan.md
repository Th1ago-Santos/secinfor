
# Redesign do Dashboard principal (/) + Ficha de Notebooks

Escopo focado no que a imagem representa: rota `/`. O dashboard de chamados (`/chamados/dashboard`) não será alterado, apenas referenciado por link. A ficha de notebooks será alinhada ao padrão visual da etiqueta de chamados.

## 1. Novo cabeçalho do Dashboard

Substituir o cabeçalho atual em `src/pages/Dashboard.tsx` por um bloco compacto:

- Título "Painel de Controle" + subtítulo "Visão geral dos equipamentos, movimentações e chamados"
- Lado direito: timestamp da última atualização, botão **Atualizar** (refetch React Query), seletor de período (7d / 30d / 6m / 12m), menu **Ações rápidas** (Cadastrar notebook, Cadastrar monitor, Abrir chamado, Registrar movimentação, Imprimir ficha)

Período controla apenas o gráfico de Movimentações e KPIs derivados de janela temporal.

## 2. KPIs reorganizados por grupo

Substituir a grade única de 10 cards por 3 grupos com títulos:

- **Equipamentos**: Total notebooks, Disponíveis, Em uso, Em manutenção (monitores entram como zerados até existir a tabela — ver seção Técnica)
- **Chamados**: Abertos, Em atendimento, Aguardando material, Urgentes
- **Pendências**: Sem foto, Sem seção, Sem responsável, Sem patrimônio válido

Cada card: ícone, número grande, título, descrição curta, tooltip, skeleton no loading, `onClick` navegando para a listagem já filtrada (ex.: `/?status=Em uso` no Index de notebooks, `/chamados?status=aberto`).

Novo componente: `src/components/dashboard/KpiGroup.tsx` + `KpiCard.tsx`.

## 3. Painéis "Precisam de atenção"

Refatorar `OperationalInsights`, `SmartRecommendations` e alertas para altura dinâmica:

- Estado vazio compacto (~72px): "Nenhuma pendência encontrada — Todos os equipamentos estão regularizados."
- Com itens: linhas com tipo, equipamento, patrimônio, seção, tempo, badge de severidade, botões **Corrigir** / **Ver**.

## 4. Visão geral dos equipamentos

Nova seção lado a lado (2 colunas em desktop, 1 em mobile) em `src/components/dashboard/EquipmentOverview.tsx`:

- Card **Notebooks**: total, disponíveis, em uso, em manutenção, % disponibilidade (barra de progresso)
- Card **Monitores**: mesmos indicadores. Enquanto a fonte de dados de monitores não existir, o card mostra estado vazio explicativo ("Cadastro de monitores ainda não configurado") em vez de números falsos.

## 5. Gráficos

- **Equipamentos por seção**: converter para `BarChart` horizontal quando >6 seções, ordenado desc, top 8 + "Ver todas" (dialog com lista completa). Clique → `/?secao=<nome>`.
- **Estado dos notebooks**: donut com label central (total + % disponível), legenda customizada com nome + quantidade + %.
- **Movimentações por período**: controlado pelo filtro do cabeçalho; múltiplas séries (Entradas/Saídas/Transferências/Manutenções) por `tipo_evento`. Escala automática do recharts (sem forçar domínio).
- **Resumo de chamados**: card compacto com 4 KPIs + link "Ver dashboard completo de Chamados" → `/chamados/dashboard`.

## 6. Layout desktop (grade 12 colunas)

```text
[ Header + ações rápidas .................. 12 ]
[ KPIs Equipamentos ....................... 12 ]
[ KPIs Chamados 6 ][ KPIs Pendências 6 ......]
[ Precisam de atenção ..................... 12 ]
[ Notebooks 6 ][ Monitores 6 ..............]
[ Equipamentos por seção 8 ][ Estado 4 ....]
[ Movimentações por período ............... 12 ]
[ Últimas movs 4 ][ Últimos cadastros 4 ][ Resumo chamados 4 ]
```

Container `max-w-[1600px]` para aproveitar ultrawide sem esticar demais.

## 7. Últimas movimentações / cadastros

Refatorar `RecentActivity.tsx`:

- Movimentações: ícone por `tipo_evento`, patrimônio/equipamento, seção origem → destino, usuário, data/hora, link para detalhe. Botão "Ver todas" → `/movimentacoes`.
- Cadastros: thumbnail (via `NotebookPhoto`) ou ícone, nome, patrimônio, seção, data. Sem UUIDs. Botão "Ver todos".

## 8. Paleta e contraste

Sem trocar tokens globais. Ajustes locais no dashboard:

- Títulos de seção `text-foreground` com peso 600, subtítulos `text-muted-foreground`
- Cores semânticas: `--info` azul, `--success` verde, `--warning` laranja, `--destructive` vermelho — já existem no `index.css`
- Cards com `border-border/60` + `bg-card`; hover eleva sombra
- Legendas de gráficos usam `hsl(var(--foreground))` com opacidade 80

## 9. Ficha de notebook (impressão)

Substituir `src/pages/PrintView.tsx` e `src/components/CautelaPrint.tsx` pelo padrão da etiqueta de chamados (`TicketLabel.tsx`).

Novos componentes compartilhados em `src/components/print/`:

- `PrintHeader.tsx` — brasão/nome da seção
- `PrintSideStripe.tsx` — tarja lateral colorida por status
- `PrintBadge.tsx`
- `PrintInfoGrid.tsx`
- `PrintQRCode.tsx`
- `PrintFooter.tsx`
- `PrintPreview.tsx` — wrapper com toggle A4 / térmica 90mm

Refatorar `TicketLabel.tsx` para consumir esses componentes (sem quebrar layout atual).

Nova página `src/pages/NotebookLabel.tsx` (rota `/notebooks/:id/ficha`) com:

- Cabeçalho "SEÇÃO DE INFORMÁTICA — FICHA DE IDENTIFICAÇÃO DE EQUIPAMENTO"
- Tarja lateral por status (verde/azul/laranja/vermelho/cinza) com texto do status
- Grid: patrimônio, tipo, marca/modelo, nº série, seção, responsável, situação
- Foto do notebook (via `NotebookPhoto`, oculta se ausente, sem distorção)
- QR Code centralizado com margem branca + texto "Escaneie para consultar este equipamento"
- Rodapé: URL curta pública, data/hora impressão, identificação do sistema
- Modos térmica 90mm e A4 com `@media print`

Botão "Imprimir ficha" em `src/pages/Index.tsx` passa a abrir a nova rota.

## 10. Performance

- Refatorar `fetchDashboardData` para usar `Promise.all` com `head:true` e `count:'exact'` já existente, adicionando agregações por status/seção via RPC quando útil. Para não bloquear entrega, manter agregação client-side atual mas com um único `select('secao,status')` em vez de dois fetches distintos.
- `staleTime` 60s, `refetchOnWindowFocus:true`, botão manual invalida a query.
- Skeletons por bloco (não uma tela cinza única).

## 11. Responsividade

- `<640px`: 2 colunas de KPIs, gráficos largura total, listas empilhadas
- `640-1024`: 3 colunas KPI, grid 6+6
- `1024-1536`: grade 12 conforme layout
- `>1536`: mesma grade com `max-w-[1600px] mx-auto`

## 12. Testes

Via Playwright headless localhost:8080:

1. `/` carrega sem erro no console, todos os blocos renderizam
2. Botão Atualizar refaz fetch (network)
3. Filtro de período muda gráfico de movimentações
4. Click em KPI navega com querystring correta
5. Estado vazio dos alertas ocupa <100px
6. Screenshot desktop 1280, ultrawide 1920, tablet 900, mobile 390
7. `/notebooks/:id/ficha` renderiza A4 e térmica; QR Code visível; sem UUID no rodapé
8. `tsgo` limpo

## Fora de escopo (declarado)

- Criar tabela/CRUD de monitores — não existe hoje; cards de monitores mostrarão estado vazio informativo até haver decisão do usuário sobre a modelagem.
- Alterar `/chamados/dashboard`.
- Refazer tokens globais do tema.

## Detalhes técnicos

Arquivos criados:

- `src/components/dashboard/DashboardHeader.tsx`
- `src/components/dashboard/KpiGroup.tsx`, `KpiCard.tsx`
- `src/components/dashboard/EquipmentOverview.tsx`
- `src/components/dashboard/TicketsSummary.tsx`
- `src/components/dashboard/AttentionPanel.tsx` (unifica alertas/recomendações)
- `src/components/print/{PrintHeader,PrintSideStripe,PrintBadge,PrintInfoGrid,PrintQRCode,PrintFooter,PrintPreview}.tsx`
- `src/pages/NotebookLabel.tsx`

Arquivos alterados:

- `src/pages/Dashboard.tsx` — nova composição + fetch consolidado
- `src/components/dashboard/DashboardCharts.tsx` — bar horizontal, donut com label central, séries múltiplas
- `src/components/dashboard/RecentActivity.tsx` — colunas ricas, botão "Ver todas"
- `src/components/dashboard/OperationalInsights.tsx`, `SmartRecommendations.tsx`, `PriorityMetrics.tsx` — altura dinâmica, estado vazio compacto
- `src/pages/TicketLabel.tsx` — consumir `components/print/*`
- `src/pages/Index.tsx` — botão de ficha aponta para nova rota
- `src/App.tsx` — rota `/notebooks/:id/ficha`

Sem migrações de banco.
