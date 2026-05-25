import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Award, TrendingUp, Globe, Users, Building2, Shield, ArrowRight } from "lucide-react";
import { SectionLabel } from "@/components/brand/SectionLabel";
import { WavePattern } from "@/components/brand/WavePattern";
import { PointsBadge } from "@/components/brand/PointsBadge";
import heroImg from "@/assets/home-hero.jpg";
import destino1 from "@/assets/home-destino-1.jpg";
import destino2 from "@/assets/home-destino-2.jpg";
import destino3 from "@/assets/home-destino-3.jpg";
import destino4 from "@/assets/home-destino-4.jpg";
import arquitetoImg from "@/assets/home-arquiteto.jpg";

const features = [
  { icon: Award, title: "Programa de Pontos", description: "Acumule pontos a cada projeto e conquiste experiências selecionadas." },
  { icon: Globe, title: "Destinos Editorial", description: "Hospedagens premium curadas com a precisão de um catálogo de arquitetura." },
  { icon: TrendingUp, title: "Níveis de Progressão", description: "Evolua através de patamares e desbloqueie benefícios exclusivos." },
  { icon: Users, title: "Para Profissionais", description: "Acompanhe pontuação, conquistas e próximos destinos em tempo real." },
  { icon: Building2, title: "Para Empresas", description: "Reconheça profissionais e gerencie vendas com elegância." },
  { icon: Shield, title: "Gestão Completa", description: "Painel curado para gestores acompanharem todo o ecossistema." },
];

const stats = [
  { value: "2026", label: "Edição" },
  { value: "+120", label: "Profissionais" },
  { value: "32", label: "Empresas" },
  { value: "8", label: "Destinos" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const } },
};

const heroSlides = [
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-CLUBMED.png", alt: "Club Med" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-BUENOS.png", alt: "Buenos Aires" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-FASANO.png", alt: "Fasano" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-AMZONIA.png", alt: "Amazônia" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-FERNANDO.png", alt: "Fernando de Noronha" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-ATACAMA.png", alt: "Atacama" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-PORTUGAL.png", alt: "Portugal" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-EGITO.png", alt: "Egito" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-AFRICA.png", alt: "África" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-TAILANDIA.png", alt: "Tailândia" },
  { src: "https://conexao.arq.br/content/images/campanha2026/BANNER-CONEX%C3%83O-2026-JAPAO.png", alt: "Japão" },
];


const Home = () => {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlideIdx((i) => (i + 1) % heroSlides.length), 5000);
    return () => clearInterval(id);
  }, []);

  const showcaseRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: showcaseProgress } = useScroll({
    target: showcaseRef,
    offset: ["start end", "end start"],
  });
  const img1Y = useTransform(showcaseProgress, [0, 1], ["-10%", "15%"]);
  const img2Y = useTransform(showcaseProgress, [0, 1], ["10%", "-15%"]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />

      {/* Hero slider — full width images, no overlay text */}
      <section className="relative w-full">
        <div className="relative h-[60vh] md:h-[78vh] w-full overflow-hidden">
          <AnimatePresence mode="sync">
            <motion.img
              key={slideIdx}
              src={heroSlides[slideIdx].src}
              alt={heroSlides[slideIdx].alt}

              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 h-full w-full object-contain bg-background"
            />
          </AnimatePresence>

          {/* Soft bottom fade into background */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent pointer-events-none" />

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {heroSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setSlideIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === slideIdx ? "w-8 bg-primary-foreground" : "w-1.5 bg-primary-foreground/50"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Text content below slider */}
        <div className="container mx-auto px-4 pt-16 pb-20">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="grid md:grid-cols-[1fr_auto] gap-12 items-end mb-10"
            >
              <div>
                <SectionLabel className="mb-6">Programa de Fidelidade · 2026</SectionLabel>
                <h1 className="text-display text-6xl md:text-8xl lg:text-9xl text-foreground mb-2 leading-[0.95]">
                  Grupo<br />Conexão
                </h1>
                <p className="text-display text-2xl md:text-3xl italic text-primary-deep mt-6">
                  Reconhecendo a excelência<br />dos profissionais da arquitetura,<br />design e decoração.
                </p>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <PointsBadge value={2026} label="EDIÇÃO" size="lg" variant="mocha" className="hidden md:flex" />
              </motion.div>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="max-w-2xl text-lg text-foreground/80 leading-relaxed mb-10"
            >
              Um programa editorial que conecta empresas parceiras a arquitetos por meio de pontos,
              níveis e viagens curadas para destinos premium ao redor do mundo.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Link to="/login">
                <Button size="lg" variant="premium" className="text-base px-10 group">
                  Acessar Sistema
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/sobre">
                <Button size="lg" variant="hero" className="text-base px-10">
                  Sobre o Programa
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Stats marquee */}
      <section className="border-y border-border bg-card/50">
        <div className="container mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="text-center md:border-r last:border-r-0 border-border"
              >
                <div className="text-display text-5xl md:text-6xl text-primary-deep">{s.value}</div>
                <div className="text-[0.7rem] tracking-[0.3em] uppercase text-muted-foreground mt-2">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Showcase split with parallax images */}
      <section ref={showcaseRef} className="py-28 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <SectionLabel className="mb-6">Editorial · Destinos</SectionLabel>
              <h2 className="text-display text-5xl md:text-6xl text-foreground mb-6 leading-[1]">
                Cada conquista,<br />
                <span className="italic text-primary-deep">um destino.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
                Descubra hospedagens cuidadosamente selecionadas em locais únicos.
                De villas mediterrâneas a refúgios contemporâneos, cada viagem é
                pensada como uma obra de design.
              </p>
              <Link to="/sobre">
                <Button variant="premium" size="lg" className="group">
                  Conhecer destinos
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>

            <div className="relative h-[520px]">
              <motion.div
                style={{ y: img1Y }}
                className="absolute top-0 right-0 w-[70%] h-[60%] rounded-[2rem] overflow-hidden shadow-[var(--shadow-soft)]"
              >
                <img src={destino1} alt="Villa mediterrânea" className="h-full w-full object-cover" loading="lazy" />
              </motion.div>
              <motion.div
                style={{ y: img2Y }}
                className="absolute bottom-0 left-0 w-[65%] h-[55%] rounded-[2rem] overflow-hidden shadow-[var(--shadow-soft)] border-4 border-background"
              >
                <img src={destino2} alt="Suíte luxuosa minimalista" className="h-full w-full object-cover" loading="lazy" />
              </motion.div>
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute top-[42%] left-[38%] z-10"
              >
                <PointsBadge value={1500} label="PONTOS" size="md" variant="terracotta" />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative bg-card/40">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="max-w-3xl mb-16"
          >
            <SectionLabel className="mb-4">Como Funciona</SectionLabel>
            <h2 className="text-display text-5xl md:text-6xl text-foreground">
              Um sistema completo<br />
              <span className="italic text-primary-deep">de reconhecimento.</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
              >
                <Card className="h-full bg-card border border-border rounded-[1.25rem] p-8 hover:shadow-[var(--shadow-soft)] transition-all duration-500">
                  <div className="h-12 w-12 rounded-full border border-primary-deep/40 flex items-center justify-center mb-6">
                    <feature.icon className="h-5 w-5 text-primary-deep" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-display text-2xl mb-3 text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed text-sm">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Editorial split — Arquiteto */}
      <section className="py-28 relative overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-[480px] rounded-[2rem] overflow-hidden order-2 md:order-1"
            >
              <img src={arquitetoImg} alt="Arquiteto em estúdio" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-deep/30 to-transparent" />
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="order-1 md:order-2"
            >
              <SectionLabel className="mb-6">Para Profissionais</SectionLabel>
              <h2 className="text-display text-5xl md:text-6xl text-foreground mb-6 leading-[1]">
                Sua trajetória<br />
                <span className="italic text-primary-deep">em destaque.</span>
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6 max-w-md">
                Acompanhe pontos em tempo real, visualize sua evolução pelos níveis e descubra
                as próximas conquistas. Tudo no seu painel, com a clareza de uma revista.
              </p>
              <ul className="space-y-3 mb-8 text-foreground/80">
                {["Pontuação detalhada por produto", "Histórico de conquistas", "Notificações em tempo real"].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <span className="h-px w-8 bg-primary-deep" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cadastro">
                <Button variant="premium" size="lg" className="group">
                  Quero participar
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9 }}
          >
            <Card className="bg-card border border-border rounded-[1.5rem] overflow-hidden relative">
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <img src={heroImg} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
              <div className="relative p-12 md:p-16 grid md:grid-cols-[1fr_auto] gap-10 items-center bg-gradient-to-r from-card via-card/95 to-card/70">
                <div>
                  <SectionLabel className="mb-4">Comece agora</SectionLabel>
                  <h2 className="text-display text-4xl md:text-5xl mb-4 text-foreground">
                    Pronto para sua<br /><span className="italic text-primary-deep">próxima conquista?</span>
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-xl leading-relaxed">
                    Acesse o sistema e acompanhe pontos, conquistas e destinos com a precisão de um catálogo editorial.
                  </p>
                  <Link to="/login">
                    <Button size="lg" variant="premium" className="px-10 group">
                      Fazer Login
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                </div>
                <PointsBadge value={800} label="PONTOS" size="lg" variant="mocha" className="hidden md:flex" />
              </div>
              <WavePattern className="h-6" opacity={0.4} />
            </Card>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
