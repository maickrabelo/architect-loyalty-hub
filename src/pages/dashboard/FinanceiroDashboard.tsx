import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { listaMeses, labelMes, mesAtual, useCaixa } from "@/hooks/useFinanceiro";
import FinanceiroResumo from "@/components/financeiro/FinanceiroResumo";
import FinanceiroFaturas from "@/components/financeiro/FinanceiroFaturas";
import FinanceiroSaldo from "@/components/financeiro/FinanceiroSaldo";
import FinanceiroCaixa from "@/components/financeiro/FinanceiroCaixa";
import FinanceiroCobrancas from "@/components/financeiro/FinanceiroCobrancas";
import FinanceiroBloqueios from "@/components/financeiro/FinanceiroBloqueios";
import FinanceiroConfig from "@/components/financeiro/FinanceiroConfig";

const FinanceiroDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading } = useAuth();
  const [mes, setMes] = useState(mesAtual());
  const { data: caixa } = useCaixa(mes);
  const meses = listaMeses(30);

  useEffect(() => {
    if (!loading && (!user || (userRole !== "financeiro" && userRole !== "gestor"))) {
      navigate("/login");
    }
  }, [user, userRole, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-serif text-xl">Gestão Financeira</h1>
              <p className="text-xs text-muted-foreground">Faturamento, caixa e inadimplência do programa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meses.map((m) => <SelectItem key={m} value={m}>{labelMes(m)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/login"); }}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="resumo" className="space-y-6">
          <TabsList className="flex flex-wrap h-auto bg-card/50">
            <TabsTrigger value="resumo">Resumo mensal</TabsTrigger>
            <TabsTrigger value="faturas">Faturas</TabsTrigger>
            <TabsTrigger value="saldo">Saldo de campanha</TabsTrigger>
            <TabsTrigger value="caixa">Fluxo de caixa</TabsTrigger>
            <TabsTrigger value="extras">Cobranças extras</TabsTrigger>
            <TabsTrigger value="bloqueios">Bloqueios</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="resumo"><FinanceiroResumo mes={mes} /></TabsContent>
          <TabsContent value="faturas"><FinanceiroFaturas mes={mes} caixaFechado={caixa?.status === "fechado"} /></TabsContent>
          <TabsContent value="saldo"><FinanceiroSaldo /></TabsContent>
          <TabsContent value="caixa"><FinanceiroCaixa mes={mes} /></TabsContent>
          <TabsContent value="extras"><FinanceiroCobrancas /></TabsContent>
          <TabsContent value="bloqueios"><FinanceiroBloqueios /></TabsContent>
          <TabsContent value="config"><FinanceiroConfig /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FinanceiroDashboard;
