import { Logo } from "@/components/brand/Logo";
import { WavePattern } from "@/components/brand/WavePattern";

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-card mt-24">
      <div className="container mx-auto px-4 pt-10 pb-8">
        <WavePattern className="h-8 mb-8" opacity={0.35} />
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="label-tag-muted">
            © 2026 Grupo Conexão · Programa de fidelidade editorial
          </p>
        </div>
      </div>
    </footer>
  );
};
