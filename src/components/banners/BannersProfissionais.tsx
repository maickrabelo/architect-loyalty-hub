import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUCKET = "banners-profissionais";

interface BannerProfissional {
  id: string;
  desktopUrl: string;
  mobileUrl: string;
  link: string | null;
}

async function assinarBanners(paths: string[]) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  if (error) throw error;
  return new Map((data || []).map((item) => [item.path, item.signedUrl]));
}

export const BannersProfissionais = () => {
  const [atual, setAtual] = useState(0);
  const { data: banners = [] } = useQuery({
    queryKey: ["banners-profissionais-ativos"],
    staleTime: 60_000,
    queryFn: async (): Promise<BannerProfissional[]> => {
      const { data, error } = await supabase
        .from("banners_profissionais")
        .select("id, imagem_desktop_path, imagem_mobile_path, link")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      const lista = data || [];
      const urls = await assinarBanners(lista.flatMap((banner) => [banner.imagem_desktop_path, banner.imagem_mobile_path]));
      return lista.map((banner) => ({
        id: banner.id,
        desktopUrl: urls.get(banner.imagem_desktop_path) || "",
        mobileUrl: urls.get(banner.imagem_mobile_path) || "",
        link: banner.link,
      }));
    },
  });

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = window.setInterval(() => setAtual((valor) => (valor + 1) % banners.length), 6000);
    return () => window.clearInterval(interval);
  }, [banners.length]);

  useEffect(() => {
    if (atual >= banners.length) setAtual(0);
  }, [atual, banners.length]);

  if (!banners.length) return null;

  const banner = banners[atual];
  const conteudo = (
    <picture className="block h-full w-full">
      <source media="(max-width: 767px)" srcSet={banner.mobileUrl} />
      <img src={banner.desktopUrl} alt="" className="h-full w-full object-cover" />
    </picture>
  );

  return (
    <section aria-label="Destaques" className="relative overflow-hidden rounded-lg border border-border bg-card">
      <div className="aspect-[4/5] md:aspect-[3/1]">
        {banner.link ? (
          <a href={banner.link} target="_blank" rel="noopener noreferrer" className="group block h-full w-full" aria-label="Abrir destaque">
            {conteudo}
            <span className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-transform group-hover:scale-105">
              <ExternalLink className="h-4 w-4" />
            </span>
          </a>
        ) : conteudo}
      </div>

      {banners.length > 1 && (
        <>
          <Button type="button" size="icon" variant="secondary" className="absolute left-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full" onClick={() => setAtual((atual - 1 + banners.length) % banners.length)} aria-label="Banner anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button type="button" size="icon" variant="secondary" className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full" onClick={() => setAtual((atual + 1) % banners.length)} aria-label="Próximo banner">
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5" aria-label={`${atual + 1} de ${banners.length}`}>
            {banners.map((item, index) => (
              <button key={item.id} type="button" onClick={() => setAtual(index)} aria-label={`Ir para o banner ${index + 1}`} className={cn("h-2 rounded-full bg-background/70 transition-all", index === atual ? "w-6" : "w-2")} />
            ))}
          </div>
        </>
      )}
    </section>
  );
};