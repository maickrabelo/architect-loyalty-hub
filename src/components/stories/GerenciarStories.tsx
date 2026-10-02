import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Upload, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { assinar } from "./useStories";

const LIMITE_EMPRESA = 3;
const STORY_LARGURA = 1080;
const STORY_ALTURA = 1920;

const lerDimensoes = (file: File): Promise<{ w: number; h: number; tipo: "imagem" | "video" }> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => { resolve({ w: v.videoWidth, h: v.videoHeight, tipo: "video" }); URL.revokeObjectURL(url); };
      v.onerror = () => reject(new Error("Vídeo inválido"));
      v.src = url;
    } else {
      const img = new Image();
      img.onload = () => { resolve({ w: img.naturalWidth, h: img.naturalHeight, tipo: "imagem" }); URL.revokeObjectURL(url); };
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.src = url;
    }
  });

const otimizarImagemStory = (arquivo: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = STORY_LARGURA;
      canvas.height = STORY_ALTURA;
      const contexto = canvas.getContext("2d", { alpha: false });
      if (!contexto) {
        URL.revokeObjectURL(url);
        reject(new Error("Não foi possível otimizar esta imagem."));
        return;
      }
      contexto.drawImage(img, 0, 0, STORY_LARGURA, STORY_ALTURA);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) {
          reject(new Error("Não foi possível otimizar esta imagem."));
          return;
        }
        const nomeBase = arquivo.name.replace(/\.[^.]+$/, "") || "story";
        resolve(new File([blob], `${nomeBase}.webp`, { type: "image/webp", lastModified: Date.now() }));
      }, "image/webp", 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem inválida"));
    };
    img.src = url;
  });

const status = (s: any) => {
  const agora = Date.now();
  if (s.fim && new Date(s.fim).getTime() <= agora) return { t: "Encerrado", v: "outline" as const };
  if (new Date(s.inicio).getTime() > agora) return { t: "Programado", v: "secondary" as const };
  return { t: "No ar", v: "default" as const };
};

export const GerenciarStories = ({ empresaId, logoAtual }: { empresaId?: string; logoAtual?: string | null }) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [duracao, setDuracao] = useState(5);
  const [inicio, setInicio] = useState("");
  const [indefinido, setIndefinido] = useState(true);
  const [fim, setFim] = useState("");
  const [botaoTexto, setBotaoTexto] = useState("");
  const [botaoLink, setBotaoLink] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  const chave = ["stories-gerenciar", empresaId || "gestor"];
  const { data: lista = [] } = useQuery({
    queryKey: chave,
    queryFn: async () => {
      let q = supabase.from("stories").select("*").order("created_at", { ascending: false });
      q = empresaId ? q.eq("empresa_id", empresaId) : q.is("empresa_id", null);
      const { data, error } = await q;
      if (error) throw error;
      const urls = await assinar((data || []).map((s) => s.media_path));
      return (data || []).map((s) => ({ ...s, url: urls[s.media_path] }));
    },
  });

  const { data: logoUrl } = useQuery({
    queryKey: ["logo-empresa", logoAtual],
    enabled: !!logoAtual,
    queryFn: async () => {
      if (!logoAtual) return "";
      return (await assinar([logoAtual]))[logoAtual];
    },
  });

  const ativos = lista.filter((s: any) => !s.fim || new Date(s.fim).getTime() > Date.now()).length;
  const noLimite = !!empresaId && ativos >= LIMITE_EMPRESA;

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: chave });
    qc.invalidateQueries({ queryKey: ["stories-ativos"] });
  };

  const enviar = async () => {
    if (!arquivo || !user) return toast.error("Escolha uma imagem ou vídeo.");
    if (!indefinido && !fim) return toast.error("Defina a data de fim ou marque como indefinido.");
    if ((botaoTexto.trim() && !botaoLink.trim()) || (!botaoTexto.trim() && botaoLink.trim())) return toast.error("Informe o nome e o link do botão juntos.");
    if (botaoLink.trim()) {
      try {
        const url = new URL(botaoLink.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
      } catch {
        return toast.error("O link do botão deve começar com http:// ou https://.");
      }
    }
    setEnviando(true);
    try {
      const { w, h, tipo } = await lerDimensoes(arquivo);
      if (Math.abs(w / h - 9 / 16) > 0.02) {
        throw new Error(`O arquivo precisa estar no formato 1080x1920 (vertical 9:16). Enviado: ${w}x${h}.`);
      }
      const arquivoEnvio = tipo === "imagem" ? await otimizarImagemStory(arquivo) : arquivo;
      const ext = arquivoEnvio.name.split(".").pop()?.toLowerCase() || (tipo === "video" ? "mp4" : "webp");
      const path = `${empresaId || "gestor"}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, arquivoEnvio, { contentType: arquivoEnvio.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("stories").insert({
        empresa_id: empresaId || null,
        media_path: path,
        media_tipo: tipo,
        duracao_segundos: duracao,
        inicio: inicio ? new Date(inicio).toISOString() : new Date().toISOString(),
        fim: indefinido ? null : new Date(fim).toISOString(),
        created_by: user.id,
        botao_texto: botaoTexto.trim() || null,
        botao_link: botaoLink.trim() || null,
      });
      if (error) {
        await supabase.storage.from("stories").remove([path]);
        throw error;
      }
      toast.success("Story publicado.");
      setArquivo(null); setInicio(""); setFim(""); setIndefinido(true); setDuracao(5); setBotaoTexto(""); setBotaoLink("");
      atualizar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível publicar.");
    } finally {
      setEnviando(false);
    }
  };

  const remover = async (s: any) => {
    if (!confirm("Remover este story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    await supabase.storage.from("stories").remove([s.media_path]);
    toast.success("Story removido.");
    atualizar();
  };

  const enviarLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !empresaId) return;
    if (!f.type.startsWith("image/")) return toast.error("Escolha uma imagem.");
    setEnviandoLogo(true);
    try {
      const path = `${empresaId}/logo-${Date.now()}.${f.name.split(".").pop() || "png"}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, f, { contentType: f.type });
      if (upErr) throw upErr;
      const { error } = await supabase.from("empresas").update({ logo_url: path }).eq("id", empresaId);
      if (error) throw error;
      toast.success("Logo atualizada.");
      qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar logo.");
    } finally {
      setEnviandoLogo(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">Stories Conexão</CardTitle>
        <CardDescription>
          Stories exibidos no painel dos profissionais. Formato obrigatório 1080x1920 (vertical). Imagens são otimizadas automaticamente antes da publicação.
          {empresaId && ` Limite de ${LIMITE_EMPRESA} stories ativos ou programados por vez (${ativos}/${LIMITE_EMPRESA}).`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {empresaId && (
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full border bg-card overflow-hidden flex items-center justify-center">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div>
              <p className="text-sm font-medium">Logo da empresa na bolinha</p>
              <input ref={logoRef} type="file" accept="image/*" className="sr-only" onChange={enviarLogo} />
              <Button size="sm" variant="outline" className="mt-1" onClick={() => logoRef.current?.click()} disabled={enviandoLogo}>
                {enviandoLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {logoAtual ? "Trocar logo" : "Enviar logo"}
              </Button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 p-4 rounded-lg border bg-secondary/30">
          <div className="md:col-span-2">
            <Label>Imagem ou vídeo (1080x1920)</Label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="sr-only"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
            <Button variant="outline" className="w-full mt-1 justify-start" onClick={() => fileRef.current?.click()} disabled={noLimite}>
              <Upload className="h-4 w-4 mr-2" /> {arquivo ? arquivo.name : "Escolher arquivo"}
            </Button>
          </div>
          <div>
            <Label>Duração na tela (segundos)</Label>
            <Input type="number" min={2} max={60} value={duracao} onChange={(e) => setDuracao(Math.min(60, Math.max(2, Number(e.target.value) || 5)))} />
          </div>
          <div>
            <Label>Início (vazio = agora)</Label>
            <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="story-botao">Nome do botão (opcional)</Label>
            <Input id="story-botao" maxLength={40} placeholder="Saiba mais" value={botaoTexto} onChange={(e) => setBotaoTexto(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="story-link">Link do botão (opcional)</Label>
            <Input id="story-link" type="url" placeholder="https://..." value={botaoLink} onChange={(e) => setBotaoLink(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={indefinido} onCheckedChange={setIndefinido} id="indef" />
            <Label htmlFor="indef">Sem data de fim (até remover)</Label>
          </div>
          {!indefinido && (
            <div>
              <Label>Fim</Label>
              <Input type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} />
            </div>
          )}
          <div className="md:col-span-2">
            <Button onClick={enviar} disabled={enviando || !arquivo || noLimite} className="w-full">
              {enviando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {noLimite ? "Limite de 3 stories atingido" : "Publicar story"}
            </Button>
          </div>
        </div>

        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum story publicado.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {lista.map((s: any) => {
              const st = status(s);
              return (
                <div key={s.id} className="rounded-lg border overflow-hidden bg-card">
                  <div className="aspect-[9/16] bg-muted">
                    {s.media_tipo === "video"
                      ? <video src={s.url} muted className="h-full w-full object-cover" />
                      : <img src={s.url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="p-2 space-y-1 text-xs">
                    <Badge variant={st.v}>{st.t}</Badge>
                    <p className="text-muted-foreground">{s.duracao_segundos}s · desde {new Date(s.inicio).toLocaleDateString("pt-BR")}</p>
                    <p className="text-muted-foreground">até {s.fim ? new Date(s.fim).toLocaleDateString("pt-BR") : "indefinido"}</p>
                    {s.botao_texto && <p className="truncate font-medium">Botão: {s.botao_texto}</p>}
                    <Button size="sm" variant="ghost" className="w-full text-destructive" onClick={() => remover(s)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Remover
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
