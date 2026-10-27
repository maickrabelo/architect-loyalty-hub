import { useQuery } from "@tanstack/react-query";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { gerarProfissionaisCsv } from "@/lib/profissionaisCsv";
import { deliverFile } from "@/lib/download";

export function ExportarProfissionais() {
  const { user, userRole } = useAuth();
  const permitido = userRole === "gestor" || userRole === "empresa";
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["contatos-profissionais-exportacao", user?.id],
    enabled: Boolean(user) && permitido,
    gcTime: 0,
    queryFn: async () => {
      const { data: contatos, error } = await supabase.rpc("exportar_contatos_profissionais");
      if (error) throw error;
      return new Blob([gerarProfissionaisCsv(contatos ?? [])], { type: "text/csv;charset=utf-8" });
    },
  });

  if (!permitido) return null;

  return (
    <Button
      variant="outline"
      className="w-full md:w-auto shrink-0"
      disabled={isPending}
      onClick={() => {
        if (isError) {
          void refetch();
          return;
        }
        if (!data) return;
        const hoje = new Date().toLocaleDateString("en-CA");
        void deliverFile(data, `profissionais-${hoje}.csv`).catch(() => {
          toast.error("Não foi possível exportar os profissionais. Tente novamente.");
        });
      }}
    >
      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isError ? <RefreshCw className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
      {isPending ? "Carregando contatos..." : isError ? "Tentar exportação novamente" : "Exportar profissionais"}
    </Button>
  );
}