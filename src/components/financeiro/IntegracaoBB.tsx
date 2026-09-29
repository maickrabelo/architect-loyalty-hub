import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Loader2 } from "lucide-react";
import { invokeBB } from "./BoletosFatura";

const IntegracaoBB = () => {
  const qc = useQueryClient();
  const { data: token } = useQuery({
    queryKey: ["bb-token"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_bb_webhook_token" as any);
      if (error) throw error;
      return data as string;
    },
  });
  const url = token ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/bb-webhook?token=${token}` : "";

  const sync = useMutation({
    mutationFn: () => invokeBB({ action: "sincronizar" }),
    onSuccess: (d: any) => {
      toast.success(`${d.verificados} boletos verificados, ${d.pagos} pagos`);
      qc.invalidateQueries({ queryKey: ["boletos"] });
      qc.invalidateQueries({ queryKey: ["faturas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Banco do Brasil — boletos</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Ambiente de testes. Os pagamentos chegam na hora pelo aviso do banco e o sistema também confere os boletos em aberto às 8h, 13h e 19h.
        </p>
        <div className="space-y-1">
          <p className="font-medium">Endereço do aviso de pagamento (cadastre no portal BB for Developers)</p>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded border bg-muted/50 p-2 text-xs">{url || "Carregando..."}</code>
            <Button size="icon" variant="outline" disabled={!url} onClick={() => { navigator.clipboard.writeText(url); toast.success("Copiado"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Conferir pagamentos agora
        </Button>
      </CardContent>
    </Card>
  );
};

export default IntegracaoBB;
