import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface RelatorioGestorProps {
  mes: string;
  onMesChange: (mes: string) => void;
  dataArquitetos: any[];
  dataEmpresas: any[];
}

const COLORS = ['hsl(38, 92%, 50%)', 'hsl(38, 92%, 60%)', 'hsl(38, 92%, 70%)', 'hsl(38, 92%, 40%)', 'hsl(38, 92%, 35%)'];

export const RelatorioGestor = ({ mes, onMesChange, dataArquitetos, dataEmpresas }: RelatorioGestorProps) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Select value={mes} onValueChange={onMesChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">Janeiro 2025</SelectItem>
              <SelectItem value="2025-02">Fevereiro 2025</SelectItem>
              <SelectItem value="2025-03">Março 2025</SelectItem>
              <SelectItem value="2025-04">Abril 2025</SelectItem>
              <SelectItem value="2025-05">Maio 2025</SelectItem>
              <SelectItem value="2025-06">Junho 2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="premium" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Relatório
        </Button>
      </div>

      {/* Relatório para impressão */}
      <div className="space-y-8 print:space-y-6">
        <div className="print:block hidden text-center mb-8">
          <h1 className="text-3xl font-bold">Relatório Mensal - Grupo Conexão</h1>
          <p className="text-muted-foreground mt-2">
            Período: {new Date(mes + "-01").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <Card className="bg-card border-border print:shadow-none">
          <CardHeader>
            <CardTitle>Top 5 Arquitetos do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dataArquitetos}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="nome" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="pontos" fill="hsl(38, 92%, 50%)" name="Pontos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border print:shadow-none print:break-before-page">
          <CardHeader>
            <CardTitle>Distribuição de Pontos por Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={dataEmpresas}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ nome, percent }) => `${nome}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="pontos"
                >
                  {dataEmpresas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border print:shadow-none">
          <CardHeader>
            <CardTitle>Ranking de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataEmpresas} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis 
                  dataKey="nome" 
                  type="category" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  width={150}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="pontos" fill="hsl(38, 92%, 50%)" name="Pontos Distribuídos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
