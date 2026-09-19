import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const CHAVE = "grupo-conexao:aviso-privacidade";

export const AvisoPrivacidade = () => {
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CHAVE)) setVisivel(true);
    } catch {
      /* armazenamento indisponível */
    }
  }, []);

  if (!visivel) return null;

  const aceitar = () => {
    try {
      localStorage.setItem(CHAVE, new Date().toISOString());
    } catch {
      /* ignora */
    }
    setVisivel(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="container mx-auto max-w-3xl rounded-xl border border-border bg-card shadow-[var(--shadow-soft)] p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          Usamos apenas dados necessários para manter seu acesso e apurar sua pontuação, conforme a
          LGPD. Saiba mais na{" "}
          <Link to="/privacidade" className="text-primary-deep underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <Button variant="premium" size="sm" onClick={aceitar} className="shrink-0">
          Entendi
        </Button>
      </div>
    </div>
  );
};
