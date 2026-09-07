import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export const POR_PAGINA = 10;

export function usePaginacao<T>(itens: T[], porPagina = POR_PAGINA) {
  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(1);
  }, [itens.length, totalPaginas, pagina]);

  const paginados = useMemo(
    () => itens.slice((pagina - 1) * porPagina, pagina * porPagina),
    [itens, pagina, porPagina],
  );

  return { pagina, setPagina, totalPaginas, paginados };
}

export const PaginacaoControles = ({
  pagina,
  totalPaginas,
  onChange,
}: {
  pagina: number;
  totalPaginas: number;
  onChange: (p: number) => void;
}) => {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(pagina - 1)}
        disabled={pagina <= 1}
      >
        <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
      </Button>
      <span className="text-sm text-muted-foreground">
        Página {pagina} de {totalPaginas}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(pagina + 1)}
        disabled={pagina >= totalPaginas}
      >
        Próxima <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
