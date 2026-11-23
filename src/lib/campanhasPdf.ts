import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { deliverFile } from "./download";
import { compararCampanhas, MESES_CAMPANHA, totalComparavel, variacaoMensal, type MesCampanha } from "./campanhasComparativo";
import logo from "@/assets/logo-conexao.png";
import regularUrl from "@/assets/fonts/inter-regular.ttf?url";
import boldUrl from "@/assets/fonts/inter-semibold.ttf?url";
import headingUrl from "@/assets/fonts/cormorant-semibold.ttf?url";

interface FonteCampanha { ano: number; fonte: string; resumo: unknown }
const moeda = (v: number | null) => v === null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const percent = (v: number | null) => v === null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
async function carregarArquivo(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar os arquivos do PDF.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  let text = "";
  for (let i = 0; i < bytes.length; i += 8192) text += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(text);
}

export async function gerarCampanhasPdf(dados: { meses: MesCampanha[]; campanhas: FonteCampanha[] }, base: number, comparada: number) {
  const generated = new Date();
  const [regular, bold, heading, artwork] = await Promise.all([regularUrl, boldUrl, headingUrl, logo].map(carregarArquivo));
  const css = getComputedStyle(document.documentElement);
  const token = (name: string): [number, number, number] => {
    const [h, s, l] = css.getPropertyValue(name).trim().split(/\s+/).map(parseFloat);
    const a = s / 100 * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => { const k = (n + h / 30) % 12; return Math.round(255 * (l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return [f(0), f(8), f(4)];
  };
  const ink = token("--foreground"), muted = token("--muted-foreground"), accent = token("--primary-deep"), border = token("--border"), paper = token("--card");
  const doc = new jsPDF({ compress: true });
  for (const [name, content] of [["Body", regular], ["Bold", bold], ["Heading", heading]]) {
    doc.addFileToVFS(`${name}.ttf`, content); doc.addFont(`${name}.ttf`, name, "normal");
  }
  doc.setProperties({ title: `Grupo Conexão — Comparativo ${base} × ${comparada}`, author: "Grupo Conexão" });
  const linhas = compararCampanhas(dados.meses, base, comparada);
  const total = totalComparavel(linhas);
  let y = 65;
  const note = (text: string, compact = false) => {
    doc.setFont("Body"); doc.setFontSize(compact ? 7.5 : 8.5);
    const lines = doc.splitTextToSize(text, 178);
    const lineHeight = compact ? 3.8 : 4.4;
    if (y + lines.length * lineHeight > 274) { doc.addPage(); y = 65; }
    doc.setTextColor(...muted); doc.text(lines, 16, y); y += lines.length * lineHeight + (compact ? 3 : 6);
  };
  const table = (head: string[], body: string[][]) => {
    autoTable(doc, {
      startY: y, head: [head], body, theme: "plain", margin: { top: 65, bottom: 24, left: 16, right: 16 },
      styles: { font: "Body", fontStyle: "normal", fontSize: 8, cellPadding: 2.5, textColor: ink, lineColor: border, lineWidth: { bottom: 0.15 }, overflow: "linebreak" },
      headStyles: { font: "Bold", fontStyle: "normal", textColor: accent, fillColor: paper },
      columnStyles: { 0: { cellWidth: 30 }, 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      rowPageBreak: "avoid", didDrawPage: data => { y = data.cursor?.y ?? y; },
    });
    y += 9;
  };
  note("Vendas registradas em cada campanha anual, sem somar ou transferir pontos entre anos. Comparação do mesmo mês nos dois anos; total apenas dos meses disponíveis em ambos.");
  if ([base, comparada].includes(generated.getFullYear())) note(`${generated.getFullYear()}: campanha em andamento; mês atual parcial e meses futuros sem dados. Vendas de demonstração excluídas.`);
  table(["Mês", `${base} · R$`, `${comparada} · R$`, "Diferença · R$", "Variação"], [
    ...linhas.map(l => [MESES_CAMPANHA[l.mes - 1], moeda(l.base), moeda(l.comparada), moeda(l.base !== null && l.comparada !== null ? l.comparada - l.base : null), percent(l.variacao)]),
    [`Total comparável\n${total.meses} meses`, moeda(total.base), moeda(total.comparada), moeda(total.meses ? total.comparada - total.base : null), percent(total.variacao)],
  ]);
  note(`Variação entre campanhas: (${comparada} ÷ ${base} − 1) × 100. “—” indica ausência de dados ou base zero para o percentual; não significa venda zero.`);

  doc.addPage(); y = 65;
  note("Evolução em relação ao mês imediatamente anterior, calculada separadamente em cada campanha. Janeiro não é comparado com dezembro de outro ano.");
  const variacaoBase = variacaoMensal(linhas, "base"), variacaoComparada = variacaoMensal(linhas, "comparada");
  table(["Mês", `${base} · R$`, "Mês anterior · %", `${comparada} · R$`, "Mês anterior · %"], linhas.map((l, i) => [MESES_CAMPANHA[l.mes - 1], moeda(l.base), percent(variacaoBase[i]), moeda(l.comparada), percent(variacaoComparada[i])]));
  note("Variação mensal: (vendas do mês ÷ vendas do mês anterior − 1) × 100. Sem cálculo em janeiro, quando falta um dos meses ou quando o mês anterior tem valor zero.");
  for (const fonte of dados.campanhas.filter(c => c.ano === base || c.ano === comparada)) {
    note(`Fonte ${fonte.ano}: ${fonte.fonte}`, true);
    const resumo = fonte.resumo as { observacoes?: string[] } | null;
    for (const observacao of resumo?.observacoes ?? []) note(`${fonte.ano}: ${observacao}`, true);
  }
  const count = doc.getNumberOfPages();
  const stamp = generated.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.addImage(`data:image/png;base64,${artwork}`, "PNG", 16, 12, 23, 23);
    doc.setFont("Bold"); doc.setFontSize(10); doc.setTextColor(...accent); doc.text("GRUPO CONEXÃO", 45, 20);
    doc.setFont("Body"); doc.setFontSize(9); doc.setTextColor(...muted); doc.text(`CAMPANHAS ${base} × ${comparada}`, 45, 28);
    doc.setDrawColor(...border); doc.line(16, 39, 194, 39);
    doc.setFont("Heading"); doc.setFontSize(22); doc.setTextColor(...ink);
    doc.text(page === 1 ? "Comparativo mensal de campanhas" : "Evolução mês a mês", 16, 53);
    doc.line(16, 282, 194, 282); doc.setFont("Body"); doc.setFontSize(7); doc.setTextColor(...muted);
    doc.text(`Consulta em ${stamp} (Brasília) · campanhas independentes`, 16, 289);
    doc.text(`${page} / ${count}`, 194, 289, { align: "right" });
  }
  await deliverFile(doc.output("blob"), `comparativo-campanhas-${base}-${comparada}-${generated.getTime()}.pdf`);
}