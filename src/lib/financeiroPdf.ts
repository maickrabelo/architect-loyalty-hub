import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/integrations/supabase/client';
import { deliverFile } from '@/lib/download';
import { anonimizarRelatorio, calcularRelatorio, type FaturaRelatorio, type MovimentoRelatorio, type ContaRelatorio } from './financeiroRelatorioDados';
import logo from '@/assets/logo-conexao.png';
import regularUrl from '@/assets/fonts/inter-regular.ttf?url';
import boldUrl from '@/assets/fonts/inter-semibold.ttf?url';
import headingUrl from '@/assets/fonts/cormorant-semibold.ttf?url';

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
const stamp = (value: Date) => value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const numeric = (value: number) => value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function base64(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar os arquivos do relatório.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  let result = '';
  for (let i = 0; i < bytes.length; i += 8192) result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
}

export async function gerarFinanceiroPdf(mes: string) {
  // Fresh reads on every click: never export the dashboard's cached snapshot.
  const [faturasResult, movimentosResult, contasResult, caixaResult, fonts, artwork] = await Promise.all([
    supabase.from('faturas').select('mes,pontos,custo_pontos_total,valor_pontos_mes,valor_mensalidade,valor_extras,valor_total,valor_pago,vencimento,status,empresas!inner(nome,demo)').lte('mes', mes).order('vencimento'),
    supabase.from('movimentacoes_financeiras').select('mes,data,tipo,descricao,valor,empresas(nome,demo)').eq('mes', mes).order('data'),
    supabase.from('contas_bancarias').select('banco,conta,saldo_conta,saldo_aplicado,atualizado_em').order('conta'),
    supabase.from('caixas_mensais').select('status,fechado_em').eq('mes', mes).maybeSingle(),
    Promise.all([base64(regularUrl), base64(boldUrl), base64(headingUrl)]), base64(logo),
  ]);
  for (const result of [faturasResult, movimentosResult, contasResult, caixaResult]) if (result.error) throw result.error;
  const generated = new Date();
  const contas = (contasResult.data ?? []) as ContaRelatorio[];
  const anonimos = anonimizarRelatorio((faturasResult.data ?? []) as FaturaRelatorio[], (movimentosResult.data ?? []) as MovimentoRelatorio[]);
  const values = calcularRelatorio(mes, anonimos.faturas, anonimos.movimentos, contas);
  const css = getComputedStyle(document.documentElement);
  const token = (name: string) => {
    const [h, s, l] = css.getPropertyValue(name).trim().split(/\s+/).map(parseFloat);
    const saturation = s / 100, lightness = l / 100;
    const a = saturation * Math.min(lightness, 1 - lightness);
    const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)] as [number, number, number];
  };
  const ink = token('--foreground'), paper = token('--card'), mocha = token('--primary-deep'), border = token('--border'), muted = token('--muted-foreground');
  const doc = new jsPDF({ compress: true });
  for (const [i, name] of ['Body', 'Bold', 'Heading'].entries()) { doc.addFileToVFS(`${name}.ttf`, fonts[i]); doc.addFont(`${name}.ttf`, name, 'normal'); }
  doc.setProperties({ title: `Grupo Conexão — Fechamento de caixa ${mes}`, author: 'Grupo Conexão' });
  let y = 69;
  const note = (content: string) => {
    doc.setFont('Body'); doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(content, 178);
    ensure(lines.length * 4.4 + 7);
    doc.setFont('Body'); doc.setFontSize(8.5); doc.setTextColor(...muted);
    doc.text(lines, 16, y); y += lines.length * 4.4 + 7;
  };
  const ensure = (height: number) => { if (y + height > 276) { doc.addPage(); y = 69; } };
  const section = (title: string) => { ensure(20); doc.setFont('Heading'); doc.setFontSize(17); doc.setTextColor(...mocha); doc.text(title, 16, y); y += 8; };
  const table = (head: string[], body: string[][], small = false) => {
    ensure(22);
    autoTable(doc, {
      startY: y, head: [head], body, theme: 'plain', margin: { top: 69, bottom: 23, left: 16, right: 16 },
      styles: { font: 'Body', fontStyle: 'normal', fontSize: small ? 7.3 : 8.5, textColor: ink, cellPadding: small ? 2.5 : 3.2, overflow: 'linebreak', lineColor: border, lineWidth: { bottom: 0.15 } },
      headStyles: { font: 'Bold', fontStyle: 'normal', textColor: mocha, fillColor: paper },
      columnStyles: Object.fromEntries(head.slice(1).map((_, i) => [i + 1, { halign: 'right' }])),
      rowPageBreak: 'avoid',
      didDrawPage: data => { y = data.cursor?.y ?? y; },
    });
    y += 10;
  };
  note(`Competência ${mes.split('-').reverse().join('/')} • valores consultados em ${stamp(generated)} (Brasília). ${caixaResult.data?.status === 'fechado' ? 'Caixa fechado no sistema.' : 'Fechamento simulado: caixa não fechado no sistema.'} Este PDF não altera registros nem presume pagamentos.`);
  section('01 | Resultado operacional do mês');
  table(['Indicador', 'Valor'], [['Recebimentos no fluxo de caixa', brl(values.recebimentos)], ['Pagamentos no fluxo de caixa', brl(values.pagamentos)], ['Saldo operacional do mês', brl(values.saldo)]]);
  section('02 | Posição bancária atual');
  table(['Banco / conta', 'Em conta', 'Aplicado', 'Total'], [...contas.map(c => [`${c.banco} • ${c.conta}`, brl(Number(c.saldo_conta)), brl(Number(c.saldo_aplicado)), brl(Number(c.saldo_conta) + Number(c.saldo_aplicado))]), ['TOTAL BANCÁRIO', brl(contas.reduce((s, c) => s + Number(c.saldo_conta), 0)), brl(contas.reduce((s, c) => s + Number(c.saldo_aplicado), 0)), brl(values.totalBanco)]]);
  note(`Saldos bancários separados do resultado mensal; não foram somados novamente como recebimentos. ${contas.map(c => `Conta ${c.conta}: atualização ${stamp(new Date(c.atualizado_em))}.`).join(' ')}`);
  section('03 | Faturamento e valores a receber');
  table(['Indicador', 'Valor'], [['Faturas do mês — total emitido', brl(values.faturado)], ['Recebido nas faturas do mês', brl(values.recebidoFaturas)], ['Em aberto nas faturas do mês', brl(values.aberto)]]);
  note('Valores faturados e ainda não pagos não são dinheiro disponível. Faturas antigas zeradas e quitadas não são contabilizadas novamente como entradas. Contas de demonstração são excluídas. Todas as empresas e descrições são anonimizadas para preservar o sigilo da inadimplência.');
  section('04 | Pendências de competências anteriores');
  table(['Empresa / competência', 'Vencimento', 'Status', 'Em aberto'], values.anteriores.length ? values.anteriores.map(f => [`${f.empresas?.nome} • ${f.mes}`, date(f.vencimento), f.status, brl(Number(f.valor_total) - Number(f.valor_pago))]) : [['Nenhuma pendência anterior', '—', '—', brl(0)]]);
  section('05 | Demonstrativo por empresa');
  table(['Empresa', 'Pontos', 'Pontos / R$', 'Mensal. / R$', 'Extras / R$', 'Total / R$'], [...values.doMes.map(f => [f.empresas?.nome ?? '—', Number(f.pontos).toLocaleString('pt-BR'), numeric(Number(f.valor_pontos_mes)), numeric(Number(f.valor_mensalidade)), numeric(Number(f.valor_extras)), numeric(Number(f.valor_total))]), ['TOTAL', values.pontos.toLocaleString('pt-BR'), numeric(values.cobradoPontos), numeric(values.mensalidades), numeric(values.extras), numeric(values.faturado)]], true);
  section('06 | Composição e reserva da campanha');
  table(['Indicador', 'Valor'], [['Custo total dos pontos do mês', brl(values.custoPontos)], ['Parte dos pontos cobrada no mês', brl(values.cobradoPontos)], ['Parte diferida dos pontos (fora do caixa mensal)', brl(values.diferido)], ['Cobranças extras do mês', brl(values.extras)]]);
  note('A parte diferida dos pontos é uma obrigação futura da campanha, não um saldo bancário adicional. O recebimento de faturas e o fluxo de caixa são apresentados separadamente conforme os registros atuais.');
  section('07 | Situação das faturas');
  table(['Empresa', 'Vencimento', 'Status', 'Pago', 'Em aberto'], values.doMes.map(f => [f.empresas?.nome ?? '—', date(f.vencimento), f.status, brl(Number(f.valor_pago)), brl(Math.max(0, Number(f.valor_total) - Number(f.valor_pago)))]), true);
  if (values.fluxo.length) { section('08 | Movimentações do mês'); table(['Data / tipo', 'Descrição', 'Empresa', 'Valor'], values.fluxo.map(m => [`${date(m.data)} • ${m.tipo}`, m.descricao, m.empresas?.nome ?? '—', brl(Number(m.valor))]), true); }
  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.addImage(`data:image/png;base64,${artwork}`, 'PNG', 16, 13, 23, 23);
    doc.setFont('Bold'); doc.setFontSize(10); doc.setTextColor(...mocha); doc.text('GRUPO CONEXÃO', 45, 20);
    doc.setFont('Body'); doc.setFontSize(8); doc.setTextColor(...muted); doc.text(`RELATÓRIO FINANCEIRO • ${mes.split('-').reverse().join('/')}`, 45, 28);
    doc.setFont('Heading'); doc.setFontSize(24); doc.setTextColor(...ink); doc.text('Fechamento de caixa', 16, 51);
    doc.setDrawColor(...border); doc.line(16, 38, 194, 38); doc.line(16, 282, 194, 282);
    doc.setFont('Body'); doc.setFontSize(7); doc.setTextColor(...muted); doc.text(`Valores atuais • ${stamp(generated)} • sem alteração no sistema`, 16, 289); doc.text(`${page} / ${count}`, 194, 289, { align: 'right' });
  }
  await deliverFile(doc.output('blob'), `fechamento-caixa-${mes}-${generated.getTime()}.pdf`);
}