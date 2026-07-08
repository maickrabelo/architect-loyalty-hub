
## Objetivo
Importar todos os dados do arquivo `RelatorioGeral_20240101_20260706.xlsx` para o sistema, criando lojistas com login, profissionais e vendas fidedignas, e um dashboard administrativo (gestor) rico em gráficos, tabelas e filtros.

## O que existe no Excel (mapeamento por aba)

| Aba | Uso |
|---|---|
| Faturamento Mensal | Vendas totais e ticket médio por mês (2024/01 → 2026/06) |
| Taxa de Conversão | KPI: 90 pontuados / 249 cadastrados = 36,14% |
| Profissionais Mais Atuantes | Ranking geral (91 profissionais com pontos) |
| Distribuição Pontos | Matriz Empresa × Profissional (vendas + pontos) |
| Profissionais x Associados | Vínculo profissional ↔ lojistas em que vendeu |
| Relatório Geral | Ranking com Pontos Premiados / Não Premiados / % |
| 15 abas por Empresa | Antonelli Esquadrias, Carré, Casa Decor, Design Center, ELETRO FONTE, Hidráulica Uberaba, IGUATEMI, Madeireira Pindorama, Pool House, Reginez, Rogério Marzola, Shopping Das Pedras, +3 restantes — cada uma com profissionais premiados, vendas R$, pontos, categoria prêmio, custo |

## Etapa 1 — Importação dos dados (backend)

1. **Script de parsing** (executado no sandbox) lê o `.xlsx` e gera:
   - lista de empresas (nome, e-mail gerado `slug@conexao.com`, senha padrão `Conexao@2025`)
   - lista de profissionais únicos (nome → e-mail `slug@arquiteto.conexao.com`, senha `Conexao@2025`)
   - vendas: 1 linha por par (empresa, profissional) com `valor_venda` e `data_venda` distribuída dentro do período coberto pela aba "Faturamento Mensal" (proporcional ao faturamento mensal daquele mês)
2. **Edge function `importar-dados-excel`** (uso único, protegida por role `gestor`):
   - Cria usuários via `auth.admin.createUser` para cada empresa e profissional
   - Insere `empresas`, `profiles` (com `nome_divulgacao`, `profissao = "Arquiteto(a)"`, cidade Uberaba/MG padrão) e `vendas`
   - Idempotente: verifica existência antes de inserir
3. Botão "Importar dados do relatório" no Dashboard Gestor dispara a função.

## Etapa 2 — Dashboard Administrativo (Gestor)

Nova aba "Visão Geral do Programa" em `GestorDashboard.tsx` com:

**KPIs no topo**
- Total vendido no período
- Total de pontos distribuídos
- Nº de lojistas ativos
- Nº de profissionais cadastrados / pontuados
- Taxa de conversão (pontuados ÷ cadastrados)
- Ticket médio

**Gráficos (Recharts)**
1. **Linha** — Faturamento mensal (2024–2026) com toggle "Vendas R$" / "Pontos"
2. **Barra empilhada** — Pontos distribuídos por mês, empilhados por empresa
3. **Barra horizontal** — Top 15 profissionais por pontos
4. **Pizza** — Distribuição de pontos por empresa
5. **Barra** — Ranking de lojistas por custo de premiação
6. **Heatmap/tabela cruzada** — Empresa × Profissional (vendas R$)

**Tabelas interativas** (com busca, ordenação, exportar CSV)
- Lojistas: nome, total vendas, pontos distribuídos, custo total, nº profissionais atendidos
- Profissionais: nome, vendas, pontos acumulados, pontos premiados, pontos não premiados
- Detalhamento por lojista: ao clicar numa linha abre modal com aba dedicada (réplica da aba do Excel)

**Filtros globais**
- Período (mês inicial / mês final)
- Lojista (multi-select)
- Profissional (busca)

## Etapa 3 — Dashboard por Empresa
Cada lojista importado terá login e verá, no seu dashboard existente (`EmpresaDashboard`), somente as vendas/profissionais vinculados a ele — os gráficos já implementados exibirão os números reais.

## Detalhes técnicos

- **Datas**: como o Excel só tem valores mensais agregados por par, cada venda importada usará `data_venda = último dia do mês` proporcional. Para o dashboard mensal isso é suficiente e mantém somas idênticas ao Excel.
- **Pontos**: mantém a regra existente `1 pt = R$ 1.000`; os totais baterão com a coluna "Pontos Acumulados" do Excel.
- **Categorias de prêmio / custo**: novos campos opcionais em `vendas` não são necessários — armazenados agregados numa tabela `premiacoes_snapshot` (empresa_id, profissional_id, categoria_premio, custo) alimentada pelo importador e usada nos gráficos de custo.
- **Segurança**: nova migration com `GRANT` e RLS para `premiacoes_snapshot` (SELECT para `gestor` e para o próprio `empresa` dono).
- **Credenciais geradas**: no fim da importação, a edge function devolve um CSV com `tipo, nome, email, senha` para download no dashboard do gestor.

## Entregáveis
- Migration + tabela `premiacoes_snapshot`
- Edge function `importar-dados-excel`
- Script/JSON com os dados extraídos do Excel (embutido na função)
- Componentes: `AdminOverview.tsx`, `AdminKpis.tsx`, `AdminCharts.tsx`, `AdminTables.tsx`, `EmpresaDetalheModal.tsx`
- Nova aba no `GestorDashboard.tsx`
- CSV de credenciais para o gestor

## Fora de escopo
- Envio de e-mail automático aos lojistas/profissionais com as credenciais (o gestor entrega manualmente via CSV).
- Edição manual dos dados importados via UI (feita somente pelo fluxo normal de novas vendas).
