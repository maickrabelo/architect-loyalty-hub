import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Award, LogOut, Plus, Calendar as CalendarIcon, DollarSign, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useEmpresaData } from "@/hooks/useEmpresaData";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const EmpresaDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, loading: authLoading } = useAuth();
  const { empresa, arquitetos, vendas, vendasTotaisMes, totalArquitetos, isLoading } = useEmpresaData();
  const queryClient = useQueryClient();
  
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();
  const [selectedArquiteto, setSelectedArquiteto] = useState("");
  const [valorVenda, setValorVenda] = useState("");
  const [cliente, setCliente] = useState("");

  // Redirect if not empresa
  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'empresa')) {
      navigate('/login');
    }
  }, [user, userRole, authLoading, navigate]);

  // Função para calcular pontos baseado em valor de vendas (R$ 1.000 = 1 ponto)
  const calcularPontos = (valorVendas: number) => {
    return Math.floor(valorVendas / 1000);
  };

  // Mutation para lançar venda
  const lancarVendaMutation = useMutation({
    mutationFn: async (data: { arquiteto_id: string; valor_venda: number; observacao: string }) => {
      if (!empresa) throw new Error("Empresa não encontrada");

      const pontos = calcularPontos(data.valor_venda);

      const { error } = await supabase
        .from('vendas')
        .insert({
          empresa_id: empresa.id,
          arquiteto_id: data.arquiteto_id,
          valor_venda: data.valor_venda,
          pontos_calculados: pontos,
          observacao: data.observacao,
          data_venda: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendas'] });
      toast.success("Venda lançada com sucesso!");
      setSelectedArquiteto("");
      setValorVenda("");
      setCliente("");
    },
    onError: (error: any) => {
      toast.error("Erro ao lançar venda: " + error.message);
    },
  });

  const handleLancarVenda = () => {
    if (!selectedArquiteto || !valorVenda || !cliente) {
      toast.error("Preencha todos os campos");
      return;
    }

    const valor = parseFloat(valorVenda);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Valor inválido");
      return;
    }

    lancarVendaMutation.mutate({
      arquiteto_id: selectedArquiteto,
      valor_venda: valor,
      observacao: cliente,
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Filter sales by period
  const vendasFiltradas = vendas.filter(venda => {
    const dataVenda = new Date(venda.data_venda);
    if (dataInicio && dataVenda < dataInicio) return false;
    if (dataFim && dataVenda > dataFim) return false;
    return true;
  });

  const totalVendasFiltradas = vendasFiltradas.reduce((sum, v) => sum + Number(v.valor_venda), 0);
  const totalPontosFiltrados = calcularPontos(totalVendasFiltradas);

  // Calculate investment per architect in period
  const calcularInvestimentoPorArquiteto = () => {
    const investimentoPorArquiteto: { [key: string]: number } = {};
    
    arquitetos.forEach(arq => {
      const vendasArquiteto = vendasFiltradas.filter(v => v.arquiteto_id === arq.id);
      const vendasNoPeriodo = vendasArquiteto.reduce((sum, v) => sum + Number(v.valor_venda), 0);
      const pontosNoPeriodo = calcularPontos(vendasNoPeriodo);
      
      if (pontosNoPeriodo > 0) {
        investimentoPorArquiteto[arq.id] = arq.ultimaPremiacaoConquistada;
      } else {
        investimentoPorArquiteto[arq.id] = 0;
      }
    });
    
    return investimentoPorArquiteto;
  };

  const investimentoPorArquiteto = calcularInvestimentoPorArquiteto();
  const totalInvestimento = Object.values(investimentoPorArquiteto).reduce((sum, val) => sum + val, 0);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Empresa não encontrada</CardTitle>
            <CardDescription>
              Você precisa criar um registro de empresa primeiro.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard da Empresa</h1>
            <p className="text-xl text-muted-foreground">{empresa.nome}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Profissionais

              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{totalArquitetos}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-premium border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Vendas do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                R$ {vendasTotaisMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {calcularPontos(vendasTotaisMes)} pontos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Launch Sales */}
        <Card className="mb-8 bg-gradient-premium border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Lançar Venda
            </CardTitle>
            <CardDescription>
              Registre o valor da venda do profissional (R$ 1.000 = 1 ponto)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={selectedArquiteto} onValueChange={setSelectedArquiteto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />

                  </SelectTrigger>
                  <SelectContent>
                    {arquitetos.map((arq) => (
                      <SelectItem key={arq.id} value={arq.id}>
                        {arq.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Valor da Venda (R$)</Label>
                <Input
                  type="number"
                  placeholder="Ex: 50000"
                  value={valorVenda}
                  onChange={(e) => setValorVenda(e.target.value)}
                  className="bg-secondary"
                  disabled={lancarVendaMutation.isPending}
                />
                {valorVenda && (
                  <p className="text-xs text-muted-foreground">
                    = {calcularPontos(parseFloat(valorVenda) || 0)} pontos
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input
                  placeholder="Nome do cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="bg-secondary"
                  disabled={lancarVendaMutation.isPending}
                />
              </div>
            </div>
            
            <Button 
              variant="premium" 
              className="w-full md:w-auto mt-4"
              onClick={handleLancarVenda}
              disabled={lancarVendaMutation.isPending}
            >
              {lancarVendaMutation.isPending ? "Lançando..." : "Lançar Venda"}
            </Button>
          </CardContent>
        </Card>

        {/* Architects List */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <CardTitle>Profissionais Cadastrados</CardTitle>
            <CardDescription>Desempenho e pontuação dos profissionais</CardDescription>
          </CardHeader>
          <CardContent>
            {arquitetos.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum profissional cadastrado ainda

              </p>
            ) : (
              <div className="space-y-4">
                {arquitetos.map((arquiteto) => (
                  <div 
                    key={arquiteto.id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-secondary rounded-lg gap-4"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{arquiteto.nome}</p>
                      <p className="text-sm text-muted-foreground">{arquiteto.ultimoCliente}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          R$ {arquiteto.vendasTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {calcularPontos(arquiteto.vendasTotal)} pontos
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Investimento por Arquiteto */}
        <Card className="mb-8 bg-gradient-premium border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Investimento por Profissional no Período
            </CardTitle>
            <CardDescription>
              Baseado na última premiação conquistada (R$ 1.000 em vendas = 1 ponto)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filtros de Período */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Data Inicial</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Data Final</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDataInicio(undefined);
                    setDataFim(undefined);
                  }}
                >
                  Limpar Filtros
                </Button>
              </div>
            </div>

            <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-1">Total Investido no Período</p>
              <p className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                R$ {totalInvestimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-3">
              {arquitetos.map((arquiteto) => {
                const investimento = investimentoPorArquiteto[arquiteto.id] || 0;
                const percentual = totalInvestimento > 0 
                  ? ((investimento / totalInvestimento) * 100).toFixed(1)
                  : 0;
                
                return (
                  <div 
                    key={arquiteto.id}
                    className="p-4 bg-secondary/50 rounded-lg border border-border"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold">{arquiteto.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          Premiação conquistada: {arquiteto.ultimaPremiacaoConquistada} pontos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">
                          R$ {investimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">{percentual}%</p>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-gold h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Histórico de Vendas */}
        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>Vendas lançadas no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total de Vendas no Período</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {totalVendasFiltradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pontos no Período</p>
                  <p className="text-2xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                    {totalPontosFiltrados} pontos ({vendasFiltradas.length} vendas)
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendasFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhuma venda no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendasFiltradas.map((venda) => (
                      <TableRow key={venda.id}>
                        <TableCell>
                          {format(new Date(venda.data_venda), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          {arquitetos.find(a => a.id === venda.arquiteto_id)?.nome || 'N/A'}
                        </TableCell>
                        <TableCell>{venda.observacao}</TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {Number(venda.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="bg-gradient-gold bg-clip-text text-transparent font-bold">
                            {venda.pontos_calculados} pts
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmpresaDashboard;
