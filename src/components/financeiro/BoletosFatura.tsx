import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, ExternalLink, AlertTriangle } from "lucide-react";
import { formatBRL } from "@/hooks/useFinanceiro";

const dataBR = (d?: string | null) => (d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—");
const hojeISO = () => new Date().toISOString().slice(0, 10);
const vencido = (d?: string | null) => !!d && d < hojeISO();

export const invokeBB = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("bb-boletos", { body });
  if (error) {
    let msg = error.message;
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* noop */ }
    throw new Error(typeof msg === "string" ? msg : "Erro no Banco do Brasil");
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

export const statusBoleto = (s: string) =>
  ({
    pago: "bg-primary/15 text-primary border-primary/30",
    emitido: "bg-secondary text-secondary-foreground",
    erro: "bg-destructive/15 text-destructive border-destructive/30",
    baixado: "bg-muted text-muted-foreground",
  } as Record<string, string>)[s] ?? "bg-muted text-muted-foreground";

const TIPOS = [
  { tipo: "mensalidade", label: "Mensalidade", valor: (f: any) => f.valor_mensalidade, venc: (f: any) => f.vencimento_mensalidade ?? f.vencimento },
  { tipo: "pontos", label: "Pontos (50%)", valor: (f: any) => f.valor_pontos_mes, venc: (f: any) => f.vencimento },
  { tipo: "extras", label: "Extras", valor: (f: any) => f.valor_extras, venc: (f: any) => f.vencimento_extras ?? f.vencimento },
];

export const LinhaBoleto = ({ b }: { b: any }) => (
  <div className="space-y-1 text-xs">
    {b.linha_digitavel && (
      <button
        className="flex items-center gap-1 font-mono break-all text-left hover:text-primary"
        onClick={() => { navigator.clipboard.writeText(b.linha_digitavel); toast.success("Linha digitável copiada"); }}
      >
        <Copy className="h-3 w-3 shrink-0" /> {b.linha_digitavel}
      </button>
    )}
    {b.qr_code && (
      <button className="flex items-center gap-1 hover:text-primary" onClick={() => { navigator.clipboard.writeText(b.qr_code); toast.success("Pix copia e cola copiado"); }}>
        <Copy className="h-3 w-3" /> Copiar Pix copia e cola
      </button>
    )}
    {b.url_imagem && (
      <a href={b.url_imagem} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary">
        <ExternalLink className="h-3 w-3" /> Abrir boleto
      </a>
    )}
  </div>
);

const BoletosFatura = ({ fatura, onClose }: { fatura: any | null; onClose: () => void }) => {
  const qc = useQueryClient();
  const [reemitir, setReemitir] = useState<{ tipo: string; label: string } | null>(null);
  const [novaData, setNovaData] = useState("");
  const { data: boletos = [] } = useQuery({
    queryKey: ["boletos", fatura?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("boletos").select("*").eq("fatura_id", fatura.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!fatura,
  });

  const acao = useMutation({
    mutationFn: invokeBB,
    onSuccess: () => {
      toast.success("Operação concluída no Banco do Brasil");
      qc.invalidateQueries({ queryKey: ["boletos"] });
      qc.invalidateQueries({ queryKey: ["faturas"] });
    },
    onError: (e: any) => {
      const msg: string = e.message ?? "";
      if (msg.startsWith("VENCIDO:") && reemitir) {
        toast.error(msg.slice(8));
      } else {
        toast.error(msg);
      }
      qc.invalidateQueries({ queryKey: ["boletos"] });
    },
  });

  const emitir = (tipo: string, label: string, venc: string | null) => {
    if (vencido(venc)) {
      setNovaData("");
      setReemitir({ tipo, label });
      return;
    }
    acao.mutate({ action: "emitir", fatura_id: fatura.id, tipo });
  };

  const confirmarReemissao = () => {
    if (!reemitir) return;
    if (!novaData || novaData < hojeISO()) {
      toast.error("Escolha uma data de vencimento futura");
      return;
    }
    acao.mutate({ action: "emitir", fatura_id: fatura.id, tipo: reemitir.tipo, novo_vencimento: novaData });
    setReemitir(null);
  };

  return (
    <Dialog open={!!fatura} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Boletos — {fatura?.empresas?.nome}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {fatura && TIPOS.map((t) => {
            const valor = Number(t.valor(fatura));
            const ativo = boletos.find((b: any) => b.tipo === t.tipo && ["pendente", "emitido", "pago"].includes(b.status));
            const ultimo = ativo ?? boletos.find((b: any) => b.tipo === t.tipo);
            return (
              <div key={t.tipo} className="rounded-lg border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(valor)} · vence {dataBR(t.venc(fatura))}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ultimo && <Badge variant="outline" className={statusBoleto(ultimo.status)}>{ultimo.status}</Badge>}
                    {!ativo && (
                      <Button size="sm" disabled={!(valor > 0) || acao.isPending}
                        onClick={() => emitir(t.tipo, t.label, t.venc(fatura))}>
                        {acao.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Emitir boleto
                      </Button>
                    )}
                    {ativo?.status === "emitido" && (
                      <>
                        <Button size="sm" variant="outline" disabled={acao.isPending} onClick={() => acao.mutate({ action: "consultar", boleto_id: ativo.id })}>Atualizar status</Button>
                        <Button size="sm" variant="ghost" disabled={acao.isPending} onClick={() => confirm("Cancelar (baixar) este boleto no banco?") && acao.mutate({ action: "baixar", boleto_id: ativo.id })}>Cancelar</Button>
                      </>
                    )}
                  </div>
                </div>
                {ultimo?.status === "erro" && <p className="text-xs text-destructive">{ultimo.erro}</p>}
                {ativo && <LinhaBoleto b={ativo} />}
              </div>
            );
          })}
        </div>
      </DialogContent>

      <Dialog open={!!reemitir} onOpenChange={(o) => !o && setReemitir(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Pagamento vencido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O vencimento de <strong>{reemitir?.label}</strong> já passou. Para reemitir o boleto,
              defina uma nova data de vencimento.
            </p>
            <div className="space-y-2">
              <Label htmlFor="nova-data">Nova data de vencimento</Label>
              <Input
                id="nova-data"
                type="date"
                min={hojeISO()}
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReemitir(null)}>Cancelar</Button>
              <Button onClick={confirmarReemissao} disabled={acao.isPending}>
                {acao.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Reemitir boleto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default BoletosFatura;
