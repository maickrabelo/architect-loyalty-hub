import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Lock, Unlock } from "lucide-react";
import { useEmpresasFinanceiro, useBloqueios } from "@/hooks/useFinanceiro";

const FinanceiroBloqueios = () => {
  const { data: empresas = [] } = useEmpresasFinanceiro();
  const { data: historico = [] } = useBloqueios();
  const queryClient = useQueryClient();
  const [alvo, setAlvo] = useState<{ empresa: any; bloquear: boolean } | null>(null);
  const [justificativa, setJustificativa] = useState("");

  const aplicar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("definir_bloqueio_empresa", {
        _empresa_id: alvo!.empresa.id,
        _bloquear: alvo!.bloquear,
        _justificativa: justificativa,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(alvo?.bloquear ? "Empresa bloqueada" : "Empresa liberada");
      setAlvo(null);
      setJustificativa("");
      queryClient.invalidateQueries({ queryKey: ["empresas-financeiro"] });
      queryClient.invalidateQueries({ queryKey: ["bloqueios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Situação das empresas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Motivo atual</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresas.map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={e.bloqueada ? "bg-destructive/15 text-destructive border-destructive/30" : "bg-emerald-600/15 text-emerald-700"}>
                      {e.bloqueada ? "bloqueada" : "liberada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-sm">{e.motivo_bloqueio ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={e.bloqueada ? "outline" : "secondary"}
                      onClick={() => { setAlvo({ empresa: e, bloquear: !e.bloqueada }); setJustificativa(""); }}
                    >
                      {e.bloqueada ? <><Unlock className="h-4 w-4 mr-2" /> Liberar</> : <><Lock className="h-4 w-4 mr-2" /> Bloquear</>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de bloqueios e liberações</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Justificativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum registro.</TableCell></TableRow>
              )}
              {historico.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{h.empresas?.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={h.acao === "bloqueio" ? "bg-destructive/15 text-destructive" : "bg-emerald-600/15 text-emerald-700"}>
                      {h.acao}
                    </Badge>
                  </TableCell>
                  <TableCell>{h.origem}</TableCell>
                  <TableCell className="max-w-md text-sm">{h.justificativa}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!alvo} onOpenChange={(o) => !o && setAlvo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{alvo?.bloquear ? "Bloquear" : "Liberar"} {alvo?.empresa?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Justificativa (obrigatória)</Label>
            <Textarea rows={4} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} placeholder="Descreva o motivo desta decisão" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlvo(null)}>Cancelar</Button>
            <Button disabled={justificativa.trim().length < 5 || aplicar.isPending} onClick={() => aplicar.mutate()}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceiroBloqueios;
