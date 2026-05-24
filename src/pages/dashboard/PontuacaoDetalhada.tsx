import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Calendar as CalendarIcon, Download, Building2, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Transacao {
  id: number;
  data: Date;
  empresa: string;
  descricao: string;
  pontos: number;
  tipo: "compra" | "bonus" | "indicacao";
}

const PontuacaoDetalhada = () => {
  const navigate = useNavigate();
  const [dataInicio, setDataInicio] = useState<Date>();
  const [dataFim, setDataFim] = useState<Date>();

  // Mock data - transações de pontos
  const [transacoes] = useState<Transacao[]>([
    {
      id: 1,
      data: new Date(2024, 9, 15),
      empresa: "Construtora ABC",
      descricao: "Compra de materiais - Projeto Residencial São Paulo",
      pontos: 450,
      tipo: "compra"
    },
    {
      id: 2,
      data: new Date(2024, 9, 20),
      empresa: "Materiais Premium",
      descricao: "Compra de acabamentos - Projeto Comercial",
      pontos: 380,
      tipo: "compra"
    },
    {
      id: 3,
      data: new Date(2024, 9, 25),
      empresa: "Construtora ABC",
      descricao: "Bônus por volume de compras",
      pontos: 200,
      tipo: "bonus"
    },
    {
      id: 4,
      data: new Date(2024, 8, 10),
      empresa: "Design & Co",
      descricao: "Compra de móveis planejados",
      pontos: 600,
      tipo: "compra"
    },
    {
      id: 5,
      data: new Date(2024, 8, 15),
      empresa: "Materiais Premium",
      descricao: "Indicação de cliente - Arq. Carlos Silva",
      pontos: 150,
      tipo: "indicacao"
    },
    {
      id: 6,
      data: new Date(2024, 8, 28),
      empresa: "Construtora ABC",
      descricao: "Compra de estruturas metálicas",
      pontos: 520,
      tipo: "compra"
    },
    {
      id: 7,
      data: new Date(2024, 7, 5),
      empresa: "Design & Co",
      descricao: "Compra de revestimentos premium",
      pontos: 400,
      tipo: "compra"
    },
    {
      id: 8,
      data: new Date(2024, 7, 18),
      empresa: "Materiais Premium",
      descricao: "Compra de iluminação LED",
      pontos: 270,
      tipo: "compra"
    },
    {
      id: 9,
      data: new Date(2024, 7, 30),
      empresa: "Construtora ABC",
      descricao: "Bônus trimestral",
      pontos: 680,
      tipo: "bonus"
    },
    {
      id: 10,
      data: new Date(2024, 6, 12),
      empresa: "Materiais Premium",
      descricao: "Compra de pisos e azulejos",
      pontos: 600,
      tipo: "compra"
    },
  ]);

  // Filtrar transações por período
  const transacoesFiltradas = transacoes.filter(transacao => {
    if (dataInicio && transacao.data < dataInicio) return false;
    if (dataFim && transacao.data > dataFim) return false;
    return true;
  });

  // Calcular totais por empresa
  const totaisPorEmpresa = transacoesFiltradas.reduce((acc, transacao) => {
    if (!acc[transacao.empresa]) {
      acc[transacao.empresa] = 0;
    }
    acc[transacao.empresa] += transacao.pontos;
    return acc;
  }, {} as Record<string, number>);

  const totalGeral = transacoesFiltradas.reduce((sum, t) => sum + t.pontos, 0);

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "compra": return "Compra";
      case "bonus": return "Bônus";
      case "indicacao": return "Indicação";
      default: return tipo;
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "compra": return "bg-blue-500/10 text-blue-500";
      case "bonus": return "bg-green-500/10 text-green-500";
      case "indicacao": return "bg-purple-500/10 text-purple-500";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const handleExportar = () => {
    // Função para exportar dados (placeholder)
    console.log("Exportando dados...", transacoesFiltradas);
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/arquiteto")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Button>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Pontuação Detalhada</h1>
              <p className="text-muted-foreground">
                Histórico completo de suas transações de pontos
              </p>
            </div>
            <Button onClick={handleExportar} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle>Filtros de Período</CardTitle>
            <CardDescription>Selecione o período para visualizar as transações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
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
          </CardContent>
        </Card>

        {/* Resumo por Empresa */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-premium border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Total do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                {totalGeral.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-1">pontos acumulados</p>
            </CardContent>
          </Card>

          {Object.entries(totaisPorEmpresa).slice(0, 3).map(([empresa, pontos]) => (
            <Card key={empresa} className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  {empresa}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{pontos.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">pontos</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabela de Transações */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>Histórico de Transações</CardTitle>
            <CardDescription>
              {transacoesFiltradas.length} transação(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Pontos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transacoesFiltradas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma transação encontrada no período selecionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    transacoesFiltradas.map((transacao) => (
                      <TableRow key={transacao.id}>
                        <TableCell className="font-medium">
                          {format(transacao.data, "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>{transacao.empresa}</TableCell>
                        <TableCell className="max-w-md">{transacao.descricao}</TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          +{transacao.pontos}
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

export default PontuacaoDetalhada;
