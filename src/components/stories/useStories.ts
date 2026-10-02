import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoConexao from "@/assets/logo-conexao.png";

export interface StoryItem {
  id: string;
  url: string;
  tipo: "imagem" | "video";
  duracao: number;
  visto: boolean;
  created_at: string;
  botao_texto: string | null;
  botao_link: string | null;
}

export interface StoryGrupo {
  chave: string; // "gestor" ou empresa_id
  nome: string;
  logo: string;
  stories: StoryItem[];
  todosVistos: boolean;
}

const BUCKET = "stories";

export async function assinar(paths: string[]) {
  const mapa: Record<string, string> = {};
  const privados = paths.filter((p) => p && !/^https?:\/\//.test(p));
  paths.filter((p) => /^https?:\/\//.test(p)).forEach((p) => (mapa[p] = p));
  if (privados.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(privados, 3600);
    data?.forEach((d) => {
      if (d.path && d.signedUrl) mapa[d.path] = d.signedUrl;
    });
  }
  return mapa;
}

export const useStoriesAtivos = (userId?: string) =>
  useQuery({
    queryKey: ["stories-ativos", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<StoryGrupo[]> => {
      const agora = new Date().toISOString();
      const { data, error } = await supabase
        .from("stories")
        .select("id, empresa_id, media_path, media_tipo, duracao_segundos, created_at, botao_texto, botao_link, empresas(nome, logo_url)")
        .lte("inicio", agora)
        .or(`fim.is.null,fim.gt.${agora}`)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const lista = (data || []) as any[];
      if (!lista.length) return [];

      const { data: vistos } = await supabase
        .from("story_visualizacoes")
        .select("story_id")
        .in("story_id", lista.map((s) => s.id));
      const vistoSet = new Set((vistos || []).map((v) => v.story_id));

      const paths = [
        ...lista.map((s) => s.media_path),
        ...lista.map((s) => s.empresas?.logo_url).filter(Boolean),
      ];
      const urls = await assinar(paths);

      const grupos = new Map<string, StoryGrupo>();
      for (const s of lista) {
        const chave = s.empresa_id || "gestor";
        if (!grupos.has(chave)) {
          grupos.set(chave, {
            chave,
            nome: s.empresa_id ? s.empresas?.nome || "Empresa" : "Grupo Conexão",
            logo: s.empresa_id ? (s.empresas?.logo_url ? urls[s.empresas.logo_url] : "") : logoConexao,
            stories: [],
            todosVistos: true,
          });
        }
        const g = grupos.get(chave)!;
        const visto = vistoSet.has(s.id);
        g.stories.push({
          id: s.id,
          url: urls[s.media_path] || "",
          tipo: s.media_tipo === "video" ? "video" : "imagem",
          duracao: s.duracao_segundos || 5,
          visto,
          created_at: s.created_at,
          botao_texto: s.botao_texto,
          botao_link: s.botao_link,
        });
        if (!visto) g.todosVistos = false;
      }
      const arr = Array.from(grupos.values());
      // Não vistos primeiro, gestor na frente
      return arr.sort((a, b) => {
        if (a.todosVistos !== b.todosVistos) return a.todosVistos ? 1 : -1;
        if (a.chave === "gestor") return -1;
        if (b.chave === "gestor") return 1;
        return 0;
      });
    },
  });
