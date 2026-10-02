import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BUCKET = "banners-profissionais";

const validarLink = (link: string) => {
  if (!link.trim()) return null;
  try {
    const url = new URL(link.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

const extensao = (arquivo: File) => arquivo.name.split(".").pop()?.toLowerCase() || "jpg";

export const GerenciarBanners = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const [desktop, setDesktop] = useState<File | null>(null);
  const [mobile, setMobile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [ordem, setOrdem] = useState(0);
  const [enviando, setEnviando] = useState(false);

  const { data: banners = [] } = useQuery({
    queryKey: ["banners-profissionais-gerenciar"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners_profissionais").select("*").order("ordem").order("created_at", { ascending: false });
      if (error) throw error;
      const lista = data || [];
      const { data: urls, error: urlError } = await supabase.storage.from(BUCKET).createSignedUrls(lista.flatMap((banner) => [banner.imagem_desktop_path, banner.imagem_mobile_path]), 3600);
      if (urlError) throw urlError;
      const mapa = new Map((urls || []).map((item) => [item.path, item.signedUrl]));
      return lista.map((banner) => ({ ...banner, desktopUrl: mapa.get(banner.imagem_desktop_path) || "", mobileUrl: mapa.get(banner.imagem_mobile_path) || "" }));
    },
  });

  const atualizar = () => {
    queryClient.invalidateQueries({ queryKey: ["banners-profissionais-gerenciar"] });
    queryClient.invalidateQueries({ queryKey: ["banners-profissionais-ativos"] });
  };

  const publicar = async () => {
    if (!user || !desktop || !mobile) return toast.error("Escolha as imagens para desktop e celular.");
    if (!desktop.type.startsWith("image/") || !mobile.type.startsWith("image/")) return toast.error("Envie apenas arquivos de imagem.");
    const linkValidado = validarLink(link);
    if (link.trim() && !linkValidado) return toast.error("O link deve começar com http:// ou https://.");

    setEnviando(true);
    const id = crypto.randomUUID();
    const desktopPath = `${id}/desktop.${extensao(desktop)}`;
    const mobilePath = `${id}/mobile.${extensao(mobile)}`;
    try {
      const { error: desktopError } = await supabase.storage.from(BUCKET).upload(desktopPath, desktop, { contentType: desktop.type });
      if (desktopError) throw desktopError;
      const { error: mobileError } = await supabase.storage.from(BUCKET).upload(mobilePath, mobile, { contentType: mobile.type });
      if (mobileError) {
        await supabase.storage.from(BUCKET).remove([desktopPath]);
        throw mobileError;
      }
      const { error } = await supabase.from("banners_profissionais").insert({
        imagem_desktop_path: desktopPath,
        imagem_mobile_path: mobilePath,
        link: linkValidado,
        ordem,
        created_by: user.id,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([desktopPath, mobilePath]);
        throw error;
      }
      setDesktop(null);
      setMobile(null);
      setLink("");
      setOrdem(0);
      toast.success("Banner publicado.");
      atualizar();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível publicar o banner.");
    } finally {
      setEnviando(false);
    }
  };

  const alternar = async (id: string, ativo: boolean) => {
    const { error } = await supabase.from("banners_profissionais").update({ ativo: !ativo, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(ativo ? "Banner ocultado." : "Banner ativado.");
    atualizar();
  };

  const remover = async (banner: (typeof banners)[number]) => {
    if (!confirm("Remover este banner?")) return;
    const { error } = await supabase.from("banners_profissionais").delete().eq("id", banner.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from(BUCKET).remove([banner.imagem_desktop_path, banner.imagem_mobile_path]);
    toast.success("Banner removido.");
    atualizar();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Banners do painel profissional</CardTitle>
        <CardDescription>Publique uma versão horizontal para desktop e uma versão vertical ou quadrada para celular.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 rounded-lg border bg-secondary/30 p-4 md:grid-cols-2">
          <div>
            <Label>Imagem desktop</Label>
            <input ref={desktopRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setDesktop(event.target.files?.[0] || null)} />
            <Button type="button" variant="outline" className="mt-1 w-full justify-start" onClick={() => desktopRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />{desktop?.name || "Escolher imagem desktop"}
            </Button>
          </div>
          <div>
            <Label>Imagem celular</Label>
            <input ref={mobileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setMobile(event.target.files?.[0] || null)} />
            <Button type="button" variant="outline" className="mt-1 w-full justify-start" onClick={() => mobileRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />{mobile?.name || "Escolher imagem celular"}
            </Button>
          </div>
          <div>
            <Label htmlFor="banner-link">Link ao clicar (opcional)</Label>
            <Input id="banner-link" type="url" placeholder="https://..." value={link} onChange={(event) => setLink(event.target.value)} />
          </div>
          <div>
            <Label htmlFor="banner-ordem">Ordem</Label>
            <Input id="banner-ordem" type="number" min={0} value={ordem} onChange={(event) => setOrdem(Math.max(0, Number(event.target.value) || 0))} />
          </div>
          <Button type="button" className="md:col-span-2" onClick={publicar} disabled={enviando || !desktop || !mobile}>
            {enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}Publicar banner
          </Button>
        </div>

        {!banners.length ? <p className="py-4 text-center text-sm text-muted-foreground">Nenhum banner publicado.</p> : (
          <div className="space-y-3">
            {banners.map((banner) => (
              <div key={banner.id} className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_100px_auto]">
                <img src={banner.desktopUrl} alt="" className="aspect-[3/1] w-full rounded object-cover" />
                <img src={banner.mobileUrl} alt="" className="aspect-[4/5] h-24 w-20 rounded object-cover" />
                <div className="flex items-center justify-end gap-2">
                  <Badge variant={banner.ativo ? "default" : "outline"}>{banner.ativo ? "Ativo" : "Oculto"}</Badge>
                  <Button type="button" size="icon" variant="outline" onClick={() => alternar(banner.id, banner.ativo)} aria-label={banner.ativo ? "Ocultar banner" : "Ativar banner"} title={banner.ativo ? "Ocultar banner" : "Ativar banner"}>
                    {banner.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" className="text-destructive" onClick={() => remover(banner)} aria-label="Remover banner" title="Remover banner">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};