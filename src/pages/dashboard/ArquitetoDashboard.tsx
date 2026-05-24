import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, TrendingUp, MapPin, Building2, LogOut, Star, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { DestinoCard } from "@/components/DestinoCard";

const ArquitetoDashboard = () => {
  const navigate = useNavigate();
  
  // Mock data - agora com valores de vendas ao invés de pontos diretos
  const [arquitetoData] = useState({
    nome: "Ana Silva",
    vendasTotais: 4250000, // R$ 4.250.000 = 4250 pontos
    nivelAtual: "Ouro",
    proximoNivel: "Platinum",
    pontosProximoNivel: 6000,
    empresas: [
      { nome: "Construtora ABC", vendas: 1850000 }, // R$ 1.850.000 = 1850 pontos
      { nome: "Materiais Premium", vendas: 1400000 }, // R$ 1.400.000 = 1400 pontos
      { nome: "Design & Co", vendas: 1000000 }, // R$ 1.000.000 = 1000 pontos
    ],
  });

  // Função para calcular pontos baseado em valor de vendas (R$ 1.000 = 1 ponto)
  const calcularPontos = (valorVendas: number) => {
    return Math.floor(valorVendas / 1000);
  };

  const pontosTotais = calcularPontos(arquitetoData.vendasTotais);

  // Buscar premiações do banco ordenadas por pontos
  const { data: destinos = [] } = useQuery({
    queryKey: ['premiacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('premiacoes')
        .select('*')
        .eq('ativa', true)
        .order('pontos_necessarios', { ascending: true });
      
      if (error) throw error;
      
      // Mapear para o formato esperado
      return (data || []).map(p => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao || '',
        pontos: p.pontos_necessarios,
        imagem: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
        nivel: p.pontos_necessarios >= 6000 ? "Platinum" : "Ouro"
      }));
    },
  });

  // Ordenar destinos por pontos para calcular nível atual e próximo
  const destinosOrdenados = [...destinos].sort((a, b) => a.pontos - b.pontos);
  
  // Encontrar o último destino conquistado
  const destinosConquistados = destinosOrdenados.filter(d => pontosTotais >= d.pontos);
  const ultimoDestinoConquistado = destinosConquistados[destinosConquistados.length - 1];
  
  // Encontrar o próximo destino
  const proximoDestino = destinosOrdenados.find(d => d.pontos > pontosTotais);
  
  const nivelAtual = ultimoDestinoConquistado?.nome || "Iniciante";
  const proximoNivel = proximoDestino?.nome || "Máximo";
  const pontosProximoNivel = proximoDestino?.pontos || pontosTotais;

  const progressPercent = (pontosTotais / pontosProximoNivel) * 100;

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-dark p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard do Arquiteto</h1>
            <p className="text-xl text-muted-foreground">Bem-vindo, {arquitetoData.nome}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-premium border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Pontos Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                {pontosTotais.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                R$ {arquitetoData.vendasTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em vendas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Última Conquista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{nivelAtual}</p>
              {ultimoDestinoConquistado && (
                <p className="text-sm text-muted-foreground mt-1">
                  {ultimoDestinoConquistado.pontos.toLocaleString()} pontos
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Empresas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">{arquitetoData.empresas.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Progress to Next Level */}
        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle>Progresso para a Próxima Conquista</CardTitle>
            <CardDescription>
              {proximoDestino ? (
                <>
                  {pontosProximoNivel - pontosTotais} pontos restantes para {proximoNivel}
                </>
              ) : (
                "Você conquistou todos os destinos disponíveis!"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-3" />
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{pontosTotais} pontos</span>
              <span>{pontosProximoNivel} pontos</span>
            </div>
          </CardContent>
        </Card>

        {/* Points by Company */}
        <Card className="bg-card border-border mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Pontuação por Empresa</CardTitle>
                <CardDescription>Distribuição dos seus pontos</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/dashboard/arquiteto/pontuacao")}
              >
                <FileText className="mr-2 h-4 w-4" />
                Ver Detalhes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {arquitetoData.empresas.map((empresa, index) => (
                <div key={index} className="flex flex-col p-4 bg-secondary rounded-lg">
                  <div className="mb-2">
                    <p className="font-semibold">{empresa.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      R$ {empresa.vendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {calcularPontos(empresa.vendas)} pontos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Premium Destinations Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Star className="h-8 w-8 text-primary" />
                Destinos Premium
              </h2>
              <p className="text-muted-foreground mt-1">
                Conquiste pontos e realize a viagem dos seus sonhos
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {destinos.map((destino) => (
              <DestinoCard
                key={destino.id}
                nome={destino.nome}
                descricao={destino.descricao}
                pontos={destino.pontos}
                imagem={destino.imagem}
                pontosArquiteto={pontosTotais}
                showProgress={true}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArquitetoDashboard;
