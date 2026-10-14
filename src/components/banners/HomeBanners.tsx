import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface HomeBanner { id: string; titulo: string; src: string; link: string | null }

export function HomeBanners() {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const { data: banners = [] } = useQuery({
    queryKey: ["banners-home-publicos"],
    staleTime: 60_000,
    refetchInterval: 600_000,
    queryFn: async (): Promise<HomeBanner[]> => {
      const { data, error } = await supabase.functions.invoke("banners-home");
      if (error) throw error;
      return data;
    },
  });
  const current = index < banners.length ? index : 0;
  const banner = banners[current];
  const change = (next: number) => { setLoaded(false); setIndex(next); };
  useEffect(() => {
    if (banners.length < 2 || !loaded) return;
    const timeout = window.setTimeout(() => { setLoaded(false); setIndex((i) => (i + 1) % banners.length); }, 5000);
    return () => window.clearTimeout(timeout);
  }, [banners.length, current, loaded]);
  if (!banner) return null;
  const image = <img key={banner.id} src={banner.src} alt={banner.titulo} onLoad={() => setLoaded(true)} fetchPriority="high" className="block h-full w-full object-contain" />;
  return (
    <section aria-label="Banners da página inicial" className="relative w-full bg-background">
      <div className="aspect-[12/5] w-full">
        {banner.link ? <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block h-full w-full">{image}</a> : image}
      </div>
      {banners.length > 1 && <>
        <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" aria-label="Banner anterior" onClick={() => change((current - 1 + banners.length) % banners.length)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" aria-label="Próximo banner" onClick={() => change((current + 1) % banners.length)}><ChevronRight className="h-4 w-4" /></Button>
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
          {banners.map((item, i) => <Button key={item.id} size="icon" variant={i === current ? "default" : "secondary"} className="h-6 w-6 rounded-full text-xs" aria-label={`Banner ${i + 1}: ${item.titulo}`} aria-pressed={i === current} onClick={() => change(i)}>{i + 1}</Button>)}
        </div>
      </>}
    </section>
  );
}