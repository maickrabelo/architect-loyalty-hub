import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Award, TrendingUp, Building2, LogOut, Star, FileText,
  Trophy, Medal, Crown, Flame, Sparkles, Target, MapPin, Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DestinoCard } from "@/components/DestinoCard";

const calcularPontos = (valorVendas: number) => Math.floor((valorVendas || 0) / 1000);

const ArquitetoDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  /* ----------- Perfil ----------- */
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("nome, nome_divulgacao, imagem_profissional, profissao, cidade, estado, apresentacao")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  /* ----------- Vendas do arquiteto + por empresa ----------- */
  const { data: minhasVendas = [] } = useQuery({
    queryKey: ["minhas-vendas", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendas")
        .select("valor_venda, data_venda, empresa_id, empresas(nome)")
        .eq("arquiteto_id", user!.id);
      if (error) throw error;
      return data || [];
    },
  });

  /* ----------- Ranking (todos os arquitetos) ----------- */
  const { data: ranking = [] } = useQuery({
    queryKey: ["ranking-arquitetos", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ranking_arquitetos");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        arquiteto_id: r.arquiteto_id,
        total: Number(r.total) || 0,
        mes: Number(r.mes) || 0,
        ano: Number(r.ano) || 0,
      }));
    },
  });

  /* ----------- Destinos ----------- */
  const { data: destinos = [] } = useQuery({
    queryKey: ["premiacoes", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premiacoes")
        .select("*")
        .eq("ativa", true)
        .order("pontos_necessarios", { ascending: true });
      if (error) throw error;
      return (data || []).map((p) => ({
        id: p.id,
        nome: p.nome,
        descricao: p.descricao || "",
        pontos: p.pontos_necessarios,
        imagem:
          p.imagem_url ||
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop",
      }));
    },
  });

  /* ----------- Cálculos ----------- */
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioAno = new Date(now.getFullYear(), 0, 1);

  const vendasTotais = minhasVendas.reduce((s, v) => s + (Number(v.valor_venda) || 0), 0);
  const vendasMes = minhasVendas
    .filter((v) => new Date(v.data_venda) >= inicioMes)
    .reduce((s, v) => s + (Number(v.valor_venda) || 0), 0);
  const vendasAno = minhasVendas
    .filter((v) => new Date(v.data_venda) >= inicioAno)
    .reduce((s, v) => s + (Number(v.valor_venda) || 0), 0);

  const pontosTotais = calcularPontos(vendasTotais);
  const pontosMes = calcularPontos(vendasMes);
  const pontosAno = calcularPontos(vendasAno);

  // Empresas agregadas
  const empresasMap = new Map<string, { nome: string; vendas: number }>();
  for (const v of minhasVendas) {
    const nome = (v as any).empresas?.nome || "Empresa";
    const e = empresasMap.get(v.empresa_id) || { nome, vendas: 0 };
    e.vendas += Number(v.valor_venda) || 0;
    empresasMap.set(v.empresa_id, e);
  }
  const empresas = Array.from(empresasMap.values()).sort((a, b) => b.vendas - a.vendas);

  // Ranking posição
  const minhaPosicao = ranking.findIndex((r) => r.arquiteto_id === user?.id) + 1;
  const totalArquitetos = Math.max(ranking.length, 1);
  const acimaDeMim = minhaPosicao > 1 ? ranking[minhaPosicao - 2] : null;
  const faltaParaSubir = acimaDeMim
    ? Math.max(0, calcularPontos(acimaDeMim.total) - pontosTotais + 1)
    : 0;

  // Top do mês / ano
  const topMes = [...ranking].sort((a, b) => b.mes - a.mes)[0];
  const topAno = [...ranking].sort((a, b) => b.ano - a.ano)[0];
  const souTopMes = topMes?.arquiteto_id === user?.id && topMes?.mes > 0;
  const souTopAno = topAno?.arquiteto_id === user?.id && topAno?.ano > 0;

  // Destinos
  const destinosOrdenados = [...destinos].sort((a, b) => a.pontos - b.pontos);
  const conquistados = destinosOrdenados.filter((d) => pontosTotais >= d.pontos);
  const ultimoConquistado = conquistados[conquistados.length - 1];
  const proximoDestino = destinosOrdenados.find((d) => d.pontos > pontosTotais);
  const nivelAtual = ultimoConquistado?.nome || "Iniciante";
  const proximoNivel = proximoDestino?.nome || "Máximo";
  const progressPercent = proximoDestino
    ? Math.min(100, (pontosTotais / proximoDestino.pontos) * 100)
    : 100;

  const nomeExibicao = profile?.nome_divulgacao || profile?.nome || user?.email || "Arquiteto";
  const iniciais = nomeExibicao
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* ============ HERO / CAPA ============ */}
      <div className="relative">
        <div className="h-48 md:h-64 bg-gradient-to-br from-primary/30 via-primary-deep/20 to-secondary overflow-hidden relative">
          <div className="absolute inset-0 opacity-30"
               style={{ backgroundImage: "radial-gradient(circle at 20% 30%, hsl(var(--primary)/0.4), transparent 50%), radial-gradient(circle at 80% 70%, hsl(var(--primary-deep)/0.3), transparent 50%)" }} />
          <div className="absolute top-4 right-4">
            <Button variant="outline" size="sm" onClick={handleLogout} className="backdrop-blur-sm bg-background/60">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-20 md:-mt-24 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
            {/* Foto grande */}
            <div className="relative">
              <Avatar className="h-36 w-36 md:h-44 md:w-44 border-4 border-card shadow-[var(--shadow-soft)] ring-4 ring-primary/20">
                <AvatarImage src={profile?.imagem_profissional || undefined} alt={nomeExibicao} />
                <AvatarFallback className="text-4xl font-serif bg-gradient-terracotta text-primary-foreground">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
              {minhaPosicao > 0 && minhaPosicao <= 3 && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-gold rounded-full p-3 shadow-lg">
                  <Crown className="h-6 w-6 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Identidade */}
            <div className="flex-1 pb-2">
              <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
                {nomeExibicao}
              </h1>
              <div className="flex flex-wrap gap-3 items-center mt-2 text-muted-foreground">
                {profile?.profissao && <span>{profile.profissao}</span>}
                {(profile?.cidade || profile?.estado) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile?.cidade}{profile?.estado ? ` / ${profile.estado}` : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge className="bg-gradient-terracotta text-primary-foreground border-0 text-sm px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> {nivelAtual}
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Trophy className="h-3.5 w-3.5 mr-1" />
                  #{minhaPosicao || "—"} de {totalArquitetos}
                </Badge>
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Award className="h-3.5 w-3.5 mr-1" />
                  {pontosTotais.toLocaleString("pt-BR")} pts
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* ============ RANKING DESTAQUE ============ */}
        <Card className="bg-gradient-premium border-primary/30 overflow-hidden">
          <CardContent className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-6 items-center">
              <div className="text-center md:text-left">
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Sua posição</p>
                <p className="font-serif text-6xl md:text-7xl font-bold bg-gradient-gold bg-clip-text text-transparent">
                  #{minhaPosicao || "—"}
                </p>
                <p className="text-muted-foreground mt-1">de {totalArquitetos} arquitetos</p>
              </div>

              <div className="text-center border-y md:border-y-0 md:border-x border-border py-4 md:py-0">
                <Target className="h-8 w-8 mx-auto text-primary mb-2" />
                {acimaDeMim ? (
                  <>
                    <p className="text-3xl font-bold">{faltaParaSubir.toLocaleString("pt-BR")}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      pontos para subir para <strong className="text-foreground">#{minhaPosicao - 1}</strong>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold">🏆</p>
                    <p className="text-sm text-muted-foreground mt-1">Você está no topo!</p>
                  </>
                )}
              </div>

              <div className="text-center md:text-right">
                <p className="text-sm uppercase tracking-widest text-muted-foreground mb-1">Próxima conquista</p>
                <p className="font-serif text-2xl font-bold">{proximoNivel}</p>
                {proximoDestino && (
                  <p className="text-sm text-muted-foreground mt-1">
                    em {(proximoDestino.pontos - pontosTotais).toLocaleString("pt-BR")} pts
                  </p>
                )}
                <Progress value={progressPercent} className="h-2 mt-3" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ============ BADGES / MEDALHAS ============ */}
        <div>
          <h2 className="font-serif text-2xl font-bold mb-4 flex items-center gap-2">
            <Medal className="h-6 w-6 text-primary" /> Suas medalhas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <BadgeCard
              icon={<Flame className="h-7 w-7" />}
              titulo="Top do Mês"
              ativo={souTopMes}
              descricao={souTopMes ? "Você é o destaque!" : `Faltam ${Math.max(0, calcularPontos((topMes?.mes || 0) - vendasMes + 1000))} pts`}
              accent="from-primary to-primary-deep"
            />
            <BadgeCard
              icon={<Calendar className="h-7 w-7" />}
              titulo="Top do Ano"
              ativo={souTopAno}
              descricao={souTopAno ? "Líder do ano!" : `${pontosAno.toLocaleString("pt-BR")} pts no ano`}
              accent="from-primary-deep to-primary"
            />
            <BadgeCard
              icon={<Trophy className="h-7 w-7" />}
              titulo="Top 3 Geral"
              ativo={minhaPosicao > 0 && minhaPosicao <= 3}
              descricao={minhaPosicao <= 3 && minhaPosicao > 0 ? `Pódio #${minhaPosicao}` : "Continue subindo"}
              accent="from-primary to-primary-deep"
            />
            <BadgeCard
              icon={<Star className="h-7 w-7" />}
              titulo="Conquistas"
              ativo={conquistados.length > 0}
              descricao={`${conquistados.length} de ${destinos.length} destinos`}
              accent="from-primary-deep to-primary"
            />
          </div>
        </div>

        {/* ============ STATS RÁPIDAS ============ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatMini label="Pontos no mês" valor={pontosMes.toLocaleString("pt-BR")} icon={<Flame className="h-4 w-4" />} />
          <StatMini label="Pontos no ano" valor={pontosAno.toLocaleString("pt-BR")} icon={<Calendar className="h-4 w-4" />} />
          <StatMini label="Pontos totais" valor={pontosTotais.toLocaleString("pt-BR")} icon={<Award className="h-4 w-4" />} />
          <StatMini label="Empresas parceiras" valor={empresas.length.toString()} icon={<Building2 className="h-4 w-4" />} />
        </div>

        {/* ============ EMPRESAS ============ */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-serif">Pontuação por Empresa</CardTitle>
                <CardDescription>Suas vendas em cada parceiro</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/arquiteto/pontuacao")}>
                <FileText className="mr-2 h-4 w-4" /> Detalhes
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {empresas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma venda registrada ainda. Continue construindo parcerias!
              </p>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {empresas.map((empresa, i) => (
                  <div key={i} className="p-4 bg-secondary/60 rounded-lg border border-border/50 hover:border-primary/40 transition-colors">
                    <p className="font-semibold truncate">{empresa.nome}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      R$ {empresa.vendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-2xl font-bold text-primary mt-2 font-serif">
                      {calcularPontos(empresa.vendas).toLocaleString("pt-BR")} pts
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============ DESTINOS ============ */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-3xl font-bold flex items-center gap-2">
                <Star className="h-7 w-7 text-primary" /> Destinos Premium
              </h2>
              <p className="text-muted-foreground mt-1">
                Conquiste experiências selecionadas conforme sua pontuação.
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

/* ===== Subcomponentes ===== */
const BadgeCard = ({
  icon, titulo, descricao, ativo, accent,
}: {
  icon: React.ReactNode; titulo: string; descricao: string; ativo: boolean; accent: string;
}) => (
  <div
    className={`relative p-5 rounded-2xl border transition-all ${
      ativo
        ? "bg-gradient-to-br " + accent + " text-primary-foreground border-transparent shadow-[var(--shadow-glow)]"
        : "bg-card border-border opacity-70 hover:opacity-100"
    }`}
  >
    <div className={`inline-flex p-2 rounded-xl mb-3 ${ativo ? "bg-background/20" : "bg-muted"}`}>
      {icon}
    </div>
    <p className="font-serif text-lg font-bold leading-tight">{titulo}</p>
    <p className={`text-xs mt-1 ${ativo ? "opacity-90" : "text-muted-foreground"}`}>{descricao}</p>
    {ativo && (
      <Sparkles className="absolute top-3 right-3 h-4 w-4 opacity-80 animate-pulse" />
    )}
  </div>
);

const StatMini = ({ label, valor, icon }: { label: string; valor: string; icon: React.ReactNode }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        {icon} {label}
      </div>
      <p className="text-2xl md:text-3xl font-bold font-serif mt-2">{valor}</p>
    </CardContent>
  </Card>
);

export default ArquitetoDashboard;
