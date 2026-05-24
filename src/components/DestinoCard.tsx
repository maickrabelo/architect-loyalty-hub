import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PointsBadge } from "@/components/brand/PointsBadge";
import { SectionLabel } from "@/components/brand/SectionLabel";
import { WavePattern } from "@/components/brand/WavePattern";

interface DestinoCardProps {
  nome: string;
  descricao: string;
  pontos: number;
  imagem: string;
  pontosArquiteto?: number;
  showProgress?: boolean;
}

export const DestinoCard = ({
  nome,
  descricao,
  pontos,
  imagem,
  pontosArquiteto = 0,
  showProgress = false,
}: DestinoCardProps) => {
  const progress = Math.min((pontosArquiteto / pontos) * 100, 100);
  const isUnlocked = pontosArquiteto >= pontos;

  return (
    <Card className="group relative overflow-hidden bg-card border border-border rounded-[1.25rem] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-soft)] transition-all duration-500">
      {/* Imagem com máscara orgânica */}
      <div className="relative h-64 overflow-hidden rounded-b-[2rem]">
        <img
          src={imagem}
          alt={nome}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        {/* Selo de pontos sobreposto */}
        <div className="absolute -bottom-6 right-5 z-10">
          <PointsBadge value={pontos} size="sm" variant="mocha" />
        </div>
      </div>

      <div className="p-6 pt-8">
        <SectionLabel variant="muted" className="mb-2">
          {isUnlocked ? "Conquistado" : "Sugestão de Destino"}
        </SectionLabel>
        <h3 className="text-display text-3xl text-foreground mb-3 leading-tight">{nome}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-5">
          {descricao}
        </p>

        {showProgress && (
          <div className="space-y-2 mt-4">
            <Progress value={progress} className="h-1 bg-secondary" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{pontosArquiteto.toLocaleString()} pts</span>
              <span className="font-medium text-primary-deep">
                {isUnlocked ? "Conquistado" : `Faltam ${(pontos - pontosArquiteto).toLocaleString()}`}
              </span>
            </div>
          </div>
        )}

        <WavePattern className="h-3 mt-5" opacity={0.3} />
      </div>
    </Card>
  );
};
