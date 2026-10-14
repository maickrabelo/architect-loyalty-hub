import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BUCKET = "banners-home";

export function GerenciarBannersHome() {
  const client = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: banners = [], isPending, isError } = useQuery({
    queryKey: ["banners-home-gestor"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners_home").select("*").order("ordem").order("created_at");
      if (error) throw error;
      return Promise.all((data ?? []).map(async (banner) => {
        if (!banner.imagem_path) return { ...banner, src: banner.imagem_url ?? "" };
        const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(banner.imagem_path, 3600);
        if (error) throw error;
        return { ...banner, src: signed.signedUrl };
      }));
    },
  });
  const refresh = async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["banners-home-gestor"] }), client.invalidateQueries({ queryKey: ["banners-home-publicos"] })]);
  };
  const publicar = async () => {
    if (!file || !titulo.trim()) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Escolha uma imagem JPG, PNG ou WebP.");
    if (file.size > 10 * 1024 * 1024) return toast.error("A imagem deve ter até 10 MB.");
    let url: string | null = null;
    if (link.trim()) {
      try { const parsed = new URL(link.trim()); if (!["https:", "http:"].includes(parsed.protocol)) throw new Error(); url = parsed.href; }
      catch { return toast.error("Informe um link começando com https:// ou http://."); }
    }
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
    try {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from("banners_home").insert({ titulo: titulo.trim(), imagem_path: path, link: url, ordem: banners.reduce((max, b) => Math.max(max, b.ordem), -1) + 1 });
      if (error) { await supabase.storage.from(BUCKET).remove([path]); throw error; }
      setFile(null); setTitulo(""); setLink(""); if (fileRef.current) fileRef.current.value = "";
      await refresh(); toast.success("Banner publicado na página inicial.");
    } catch { toast.error("Não foi possível publicar o banner. Tente novamente."); }
    finally { setBusy(false); }
  };
  const toggle = async (banner: (typeof banners)[number]) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("banners_home").update({ ativo: !banner.ativo }).eq("id", banner.id);
      if (error) throw error;
      await refresh();
    } catch { toast.error("Não foi possível alterar o banner."); } finally { setBusy(false); }
  };
  const remove = async (banner: (typeof banners)[number]) => {
    if (!window.confirm(`Remover o banner “${banner.titulo}”?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("banners_home").delete().eq("id", banner.id);
      if (error) throw error;
      if (banner.imagem_path) await supabase.storage.from(BUCKET).remove([banner.imagem_path]);
      await refresh(); toast.success("Banner removido.");
    } catch { toast.error("Não foi possível remover o banner."); } finally { setBusy(false); }
  };
  const move = async (index: number, direction: number) => {
    const reordered = [...banners];
    const other = index + direction;
    if (other < 0 || other >= reordered.length) return;
    [reordered[index], reordered[other]] = [reordered[other], reordered[index]];
    setBusy(true);
    try {
      // Persist sequentially to preserve the explicit ordering.
      for (const [ordem, banner] of reordered.entries()) {
        const { error } = await supabase.from("banners_home").update({ ordem }).eq("id", banner.id);
        if (error) throw error;
      }
      await refresh();
    } catch { toast.error("Não foi possível alterar a ordem."); } finally { setBusy(false); }
  };
  return <section className="space-y-6" aria-label="Gerenciar banners da página inicial">
    <h2 className="font-serif text-2xl">Banners da página inicial</h2>
    <div className="grid gap-4 border-b border-border pb-6 md:grid-cols-2">
      <div className="min-w-0 space-y-2 md:col-span-2">
        <Label htmlFor="home-banner-file">Imagem — recomendado: 1920 × 800 px (JPG, PNG ou WebP; até 10 MB)</Label>
        <Input ref={fileRef} id="home-banner-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-2"><Label htmlFor="home-banner-title">Nome do banner</Label><Input id="home-banner-title" value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Japão" /></div>
      <div className="space-y-2"><Label htmlFor="home-banner-link">Link (opcional)</Label><Input id="home-banner-link" type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." /></div>
      <Button disabled={busy || !file || !titulo.trim()} onClick={publicar} className="md:col-span-2">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Publicar na página inicial</Button>
    </div>
    {isPending && <p className="text-muted-foreground">Carregando banners…</p>}
    {isError && <p className="text-destructive">Não foi possível carregar os banners.</p>}
    {!isPending && !isError && !banners.length && <p className="text-muted-foreground">Nenhum banner cadastrado.</p>}
    <div className="space-y-4">{banners.map((banner, index) => <article key={banner.id} className="grid min-w-0 items-center gap-4 rounded-lg border border-border p-4 md:grid-cols-[220px_minmax(0,1fr)_auto]">
      <img src={banner.src} alt={banner.titulo} className="aspect-[12/5] w-full object-contain" />
      <div className="min-w-0"><h3 className="break-words font-medium">{banner.titulo}</h3><Badge variant={banner.ativo ? "default" : "outline"}>{banner.ativo ? "Ativo" : "Oculto"}</Badge>{banner.link && <p className="mt-2 break-all text-sm text-muted-foreground">{banner.link}</p>}</div>
      <div className="flex flex-wrap gap-2">
        <Button size="icon" variant="outline" title="Mover para cima" aria-label={`Mover ${banner.titulo} para cima`} disabled={busy || index === 0} onClick={() => move(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" title="Mover para baixo" aria-label={`Mover ${banner.titulo} para baixo`} disabled={busy || index === banners.length - 1} onClick={() => move(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" title={banner.ativo ? "Ocultar banner" : "Ativar banner"} aria-label={banner.ativo ? `Ocultar ${banner.titulo}` : `Ativar ${banner.titulo}`} disabled={busy} onClick={() => toggle(banner)}>{banner.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
        <Button size="icon" variant="ghost" title="Remover banner" aria-label={`Remover ${banner.titulo}`} className="text-destructive" disabled={busy} onClick={() => remove(banner)}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </article>)}</div>
  </section>;
}