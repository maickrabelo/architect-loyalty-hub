import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Target, Gift, Trophy, MapPin } from "lucide-react";
import { SectionLabel } from "@/components/brand/SectionLabel";
import { WavePattern } from "@/components/brand/WavePattern";
import { PointsBadge } from "@/components/brand/PointsBadge";

const About = () => {
  const benefits = [
    { icon: Target, title: "Pontuação por Projeto", description: "Cada projeto realizado com empresas parceiras gera pontos para o arquiteto." },
    { icon: Trophy, title: "Níveis e Conquistas", description: "Bronze, Prata, Ouro e Platinum — quanto mais pontos, melhores os destinos." },
    { icon: MapPin, title: "Destinos Exclusivos", description: "Viagens nacionais e internacionais para hospedagens premium selecionadas." },
    { icon: Gift, title: "Premiações Especiais", description: "Além das viagens, bônus e benefícios exclusivos para os melhores colocados." },
  ];

  const levels = [
    { name: "Bronze", points: 999, range: "0 — 999 pontos", destination: "Destinos Nacionais" },
    { name: "Prata", points: 2999, range: "1.000 — 2.999 pontos", destination: "América Latina" },
    { name: "Ouro", points: 5999, range: "3.000 — 5.999 pontos", destination: "América do Norte e Europa" },
    { name: "Platinum", points: 6000, range: "6.000+ pontos", destination: "Destinos Premium Mundiais" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-32 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-20 animate-fade-in max-w-3xl">
            <SectionLabel className="mb-4">Sobre o Programa</SectionLabel>
            <h1 className="text-display text-5xl md:text-7xl text-foreground mb-6">
              Reconhecimento que<br />vira experiência.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              O Grupo Conexão é um programa de fidelidade exclusivo que reconhece a excelência dos arquitetos
              através de um sistema de pontuação conectado às empresas parceiras.
            </p>
          </div>

          <WavePattern variant="divider" className="mb-16" />

          <section className="mb-20 animate-fade-in">
            <SectionLabel className="mb-4">Como Funciona</SectionLabel>
            <h2 className="text-display text-4xl mb-8 text-foreground">A mecânica do programa</h2>
            <Card className="bg-card border border-border rounded-[1.25rem] p-10">
              <p className="text-base text-muted-foreground leading-relaxed mb-4">
                As empresas parceiras lançam pontos para os arquitetos cadastrados a cada projeto finalizado.
                Quanto maior o valor ou complexidade do projeto, mais pontos são atribuídos.
              </p>
              <p className="text-base text-muted-foreground leading-relaxed">
                Os arquitetos acumulam pontos e progridem através de níveis, desbloqueando acesso a destinos
                de viagem cada vez mais exclusivos e premiações especiais.
              </p>
            </Card>
          </section>

          <section className="mb-20 animate-fade-in">
            <SectionLabel className="mb-4">Benefícios</SectionLabel>
            <h2 className="text-display text-4xl mb-8 text-foreground">O que está incluído</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {benefits.map((benefit, index) => (
                <Card key={index} className="bg-card border border-border rounded-[1.25rem] p-8 hover:shadow-[var(--shadow-soft)] transition-all">
                  <div className="h-12 w-12 rounded-full border border-primary-deep/40 flex items-center justify-center mb-5">
                    <benefit.icon className="h-5 w-5 text-primary-deep" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-display text-2xl mb-3 text-foreground">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{benefit.description}</p>
                </Card>
              ))}
            </div>
          </section>

          <section className="animate-fade-in">
            <SectionLabel className="mb-4">Níveis</SectionLabel>
            <h2 className="text-display text-4xl mb-8 text-foreground">Patamares de conquista</h2>
            <div className="space-y-5">
              {levels.map((level, index) => (
                <Card key={index} className="bg-card border border-border rounded-[1.25rem] p-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                    <PointsBadge value={level.points} label={level.name.toUpperCase()} size="md" variant={index === 3 ? "mocha" : "terracotta"} />
                    <div className="flex-1">
                      <SectionLabel variant="muted" className="mb-2">{level.range}</SectionLabel>
                      <h3 className="text-display text-3xl text-foreground mb-1">{level.name}</h3>
                      <p className="text-muted-foreground">{level.destination}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
