import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, ChevronLeft, ChevronRight, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { StoryGrupo, useStoriesAtivos } from "./useStories";

const Bolinha = ({ grupo, onClick }: { grupo: StoryGrupo; onClick: () => void }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1.5 w-20 shrink-0 group" aria-label={`Ver stories de ${grupo.nome}`}>
    <div
      className={cn(
        "rounded-full p-[3px] transition-transform group-hover:scale-105",
        grupo.todosVistos ? "bg-background ring-1 ring-border" : "bg-gradient-to-tr from-primary via-accent to-primary-deep",
      )}
    >
      <div className="rounded-full bg-background p-[2px]">
        <div className="h-16 w-16 rounded-full bg-card overflow-hidden flex items-center justify-center">
          {grupo.logo ? (
            <img src={grupo.logo} alt={grupo.nome} className="h-full w-full object-contain p-1" />
          ) : (
            <Building2 className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
      </div>
    </div>
    <span className="text-xs truncate w-full text-center">{grupo.nome}</span>
  </button>
);

export const NovasConexoes = () => {
  const { user } = useAuth();
  const { data: grupos = [] } = useStoriesAtivos(user?.id);
  const [aberto, setAberto] = useState<{ g: number; s: number } | null>(null);

  if (!grupos.length) return null;

  const abrir = (gi: number) => {
    const primeiroNaoVisto = grupos[gi].stories.findIndex((s) => !s.visto);
    setAberto({ g: gi, s: primeiroNaoVisto >= 0 ? primeiroNaoVisto : 0 });
  };

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold mb-4">Stories Conexão</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {grupos.map((g, i) => (
          <Bolinha key={g.chave} grupo={g} onClick={() => abrir(i)} />
        ))}
      </div>
      {aberto && (
        <StoryViewer grupos={grupos} inicio={aberto} onClose={() => setAberto(null)} />
      )}
    </div>
  );
};

const StoryViewer = ({
  grupos, inicio, onClose,
}: { grupos: StoryGrupo[]; inicio: { g: number; s: number }; onClose: () => void }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pos, setPos] = useState(inicio);
  const [progresso, setProgresso] = useState(0);
  const [pausado, setPausado] = useState(false);
  const [midiaCarregada, setMidiaCarregada] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const vistosRef = useRef(new Set<string>());

  const grupo = grupos[pos.g];
  const story = grupo?.stories[pos.s];

  useEffect(() => {
    setMidiaCarregada(false);
    setProgresso(0);
  }, [story?.id]);

  const fechar = useCallback(() => {
    if (vistosRef.current.size) qc.invalidateQueries({ queryKey: ["stories-ativos"] });
    onClose();
  }, [onClose, qc]);

  const proximo = useCallback(() => {
    setProgresso(0);
    setPos((p) => {
      if (p.s + 1 < grupos[p.g].stories.length) return { g: p.g, s: p.s + 1 };
      if (p.g + 1 < grupos.length) return { g: p.g + 1, s: 0 };
      setTimeout(fechar, 0);
      return p;
    });
  }, [grupos, fechar]);

  const anterior = () => {
    setProgresso(0);
    setPos((p) => {
      if (p.s > 0) return { g: p.g, s: p.s - 1 };
      if (p.g > 0) return { g: p.g - 1, s: grupos[p.g - 1].stories.length - 1 };
      return p;
    });
  };

  // marcar visto
  useEffect(() => {
    if (!story || !user || !midiaCarregada || vistosRef.current.has(story.id)) return;
    vistosRef.current.add(story.id);
    supabase.from("story_visualizacoes").upsert({ story_id: story.id, user_id: user.id }).then(() => {});
  }, [story, user, midiaCarregada]);

  // temporizador (imagens; vídeos usam a duração definida também)
  useEffect(() => {
    if (!story || pausado || !midiaCarregada) return;
    const total = story.duracao * 1000;
    const passo = 50;
    const t = setInterval(() => {
      setProgresso((pr) => {
        const n = pr + (passo / total) * 100;
        if (n >= 100) {
          clearInterval(t);
          setTimeout(proximo, 0);
          return 100;
        }
        return n;
      });
    }, passo);
    return () => clearInterval(t);
  }, [story, pausado, midiaCarregada, proximo]);

  useEffect(() => {
    if (!videoRef.current) return;
    pausado ? videoRef.current.pause() : videoRef.current.play().catch(() => {});
  }, [pausado, story]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
      if (e.key === "ArrowRight") proximo();
      if (e.key === "ArrowLeft") anterior();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center">
      <div className="relative h-full w-full max-w-[min(100vw,calc(100vh*9/16))] aspect-[9/16] max-h-screen bg-foreground">
        {/* barras */}
        <div className="absolute top-2 left-2 right-2 z-20 flex gap-1">
          {grupo.stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 rounded bg-background/30 overflow-hidden">
              <div
                className="h-full bg-background"
                style={{ width: i < pos.s ? "100%" : i === pos.s ? `${progresso}%` : "0%" }}
              />
            </div>
          ))}
        </div>
        {/* cabeçalho */}
        <div className="absolute top-5 left-3 right-3 z-20 flex items-center gap-2 text-background">
          <div className="h-8 w-8 rounded-full bg-background overflow-hidden flex items-center justify-center">
            {grupo.logo ? <img src={grupo.logo} alt="" className="h-full w-full object-contain p-0.5" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
          </div>
          <span className="text-sm font-semibold flex-1 truncate">{grupo.nome}</span>
          <button onClick={fechar} aria-label="Fechar" className="p-1"><X className="h-6 w-6" /></button>
        </div>

        {story.tipo === "video" ? (
          <video key={story.id} ref={videoRef} src={story.url} autoPlay playsInline onCanPlay={() => setMidiaCarregada(true)} className="h-full w-full object-cover" />
        ) : (
          <img key={story.id} src={story.url} alt="" onLoad={() => setMidiaCarregada(true)} className="h-full w-full object-cover" />
        )}

        {!midiaCarregada && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-background/30 border-t-background" aria-label="Carregando story" />
          </div>
        )}

        {story.botao_texto && story.botao_link && (
          <Button asChild variant="secondary" className="absolute bottom-8 left-1/2 z-30 max-w-[calc(100%-3rem)] -translate-x-1/2 shadow-lg">
            <a href={story.botao_link} target="_blank" rel="noopener noreferrer" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()}>
              <span className="truncate">{story.botao_texto}</span><ExternalLink className="ml-2 h-4 w-4 shrink-0" />
            </a>
          </Button>
        )}

        {/* áreas de toque */}
        <div
          className="absolute inset-0 z-10 flex"
          onPointerDown={() => setPausado(true)}
          onPointerUp={() => setPausado(false)}
          onPointerLeave={() => setPausado(false)}
        >
          <button className="w-1/3 h-full" onClick={anterior} aria-label="Anterior" />
          <button className="w-2/3 h-full" onClick={proximo} aria-label="Próximo" />
        </div>

        <button onClick={anterior} className="hidden md:flex absolute -left-14 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/80 items-center justify-center" aria-label="Anterior"><ChevronLeft /></button>
        <button onClick={proximo} className="hidden md:flex absolute -right-14 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-background/80 items-center justify-center" aria-label="Próximo"><ChevronRight /></button>
      </div>
    </div>
  );
};
