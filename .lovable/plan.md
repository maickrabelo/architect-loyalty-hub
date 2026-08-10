# Módulo Financeiro

Novo papel **gestor financeiro** com dashboard próprio, faturamento mensal por lojista, fluxo de caixa, fechamento de caixa e bloqueio de empresas inadimplentes.

## Regras de negócio

- 1 ponto distribuído = R$ 10,00 de custo para o lojista.
- Fatura mensal da empresa = mensalidade (1 salário mínimo, valor global configurável) + 50% do custo dos pontos do mês + cobranças extras ativas no mês.
- Os outros 50% acumulam como "saldo de campanha", cobrado no fim da campanha (período configurável pelo financeiro, com data de vencimento do saldo).
- **Cobranças extras**: o financeiro cria uma cobrança (ex.: "Realização do evento Y") com valor mensal (ex.: R$ 1.500,00), mês inicial e quantidade de meses. Pode ser aplicada a uma, várias ou todas as empresas, com valor ajustável por empresa. Entra automaticamente como linha separada na fatura de cada mês vigente e pode ser cancelada/encerrada antecipadamente (faturas já geradas não mudam).
- Empresa com fatura vencida e não paga fica **travada** automaticamente e não consegue lançar novas vendas/pontos.
- O financeiro pode travar/liberar manualmente, sempre com justificativa obrigatória, gerando histórico.

## Estrutura de dados (novas tabelas)

- `configuracoes_financeiras`: valor do salário mínimo, valor por ponto (padrão 10), % cobrado no mês (padrão 50), início/fim da campanha, vencimento do saldo final.
- `caixas_mensais`: mês de referência, status (aberto/fechado), data de fechamento, quem fechou, totais consolidados.
- `faturas`: empresa, mês, pontos do mês, valor mensalidade, valor pontos do mês (50%), valor de extras, valor total, vencimento, status (aberta/paga/parcial/vencida/cancelada), data de pagamento.
- `cobrancas_extras`: descrição, valor mensal padrão, mês inicial, quantidade de meses, ativa/cancelada.
- `cobrancas_extras_empresas`: vínculo cobrança ↔ empresa com valor mensal específico (sobrescreve o padrão).
- `fatura_itens`: linhas da fatura (mensalidade, pontos, cada cobrança extra) para detalhamento e histórico imutável.
- `saldo_campanha`: acumulado dos 50% diferidos por empresa e ano de campanha, com status de quitação.
- `movimentacoes_financeiras`: lançamentos de recebimento e pagamento (data, tipo, categoria, descrição, valor, empresa opcional, fatura opcional, caixa do mês).
- `bloqueios_empresa`: histórico de travamento/liberação com justificativa, autor, data, origem (automático/manual).
- Campo `bloqueada` em `empresas` (+ motivo atual).

Todas com GRANTs e RLS: financeiro/gestor acessam tudo; a empresa lê apenas as próprias faturas/saldo e o relatório do mês fechado.

## Backend

- Novo valor `financeiro` no enum `app_role` e função `is_financeiro()`.
- RLS de `vendas`: bloquear INSERT/UPDATE quando a empresa estiver travada.
- Função `gerar_faturas_mes(mes)`: calcula pontos do mês por empresa, aplica as cobranças extras vigentes naquele mês e cria/atualiza as faturas (com itens) + saldo de campanha.
- Função `fechar_caixa(mes)`: valida movimentações, consolida totais e trava o mês.
- Job diário para marcar faturas vencidas e travar empresas automaticamente.
- Função `get_relatorio_financeiro_empresa(empresa, mes)`: dados do mês fechado para a empresa — seus valores, total geral esperado do programa e total de inadimplência agregado (sem identificar devedores).

## Telas

**/dashboard/financeiro** (papel financeiro, gestor também acessa)
- KPIs: faturado no mês, recebido, em aberto, inadimplência, saldo de campanha acumulado.
- Aba **Resumo mensal**: tabela por empresa (pontos, custo total, 50% do mês, mensalidade, total da fatura, status) + gráficos de pontos e receita por mês.
- Aba **Faturas**: geração das faturas do mês, marcação de pago/parcial, filtros e exportação CSV.
- Aba **Saldo de campanha**: quanto cada empresa deve no fechamento do ano.
- Aba **Fluxo de caixa**: lançamento de recebimentos e pagamentos, saldo do período, botão "Fechar caixa" com revisão das movimentações.
- Aba **Bloqueios**: travar/liberar empresa com justificativa obrigatória + histórico completo.
- Aba **Configurações**: salário mínimo, valor do ponto, % mensal, período da campanha.

**Dashboard da empresa**
- Banner vermelho em destaque quando houver fatura em aberto: "Você possui uma fatura em aberto, entre em contato com o gestor financeiro para regularizar sua situação."
- Bloqueio de lançamento de vendas quando travada, com aviso.
- Nova aba **Financeiro**: faturas do mês, saldo de campanha e relatório dos meses já fechados (com total esperado do programa e inadimplência agregada anônima).

## Fora de escopo
- Integração com gateway de pagamento/boleto (marcação de pagamento é manual).
- Envio automático de e-mail de cobrança.
