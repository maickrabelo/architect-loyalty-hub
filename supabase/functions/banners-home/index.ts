import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Public read-only endpoint: only active homepage artwork is exposed.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const headers = { ...corsHeaders, "Content-Type": "application/json" };
  if (!["GET", "POST"].includes(req.method)) {
    return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers });
  }
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data, error } = await db.from("banners_home")
      .select("id,titulo,imagem_path,imagem_url,link,ordem")
      .eq("ativo", true).order("ordem").order("created_at");
    if (error) throw error;
    const banners = await Promise.all((data ?? []).map(async (banner) => {
      let src = banner.imagem_url;
      if (banner.imagem_path) {
        const { data: signed, error: signingError } = await db.storage.from("banners-home").createSignedUrl(banner.imagem_path, 3600);
        if (signingError) throw signingError;
        src = signed.signedUrl;
      }
      return { id: banner.id, titulo: banner.titulo, src, link: banner.link };
    }));
    return new Response(JSON.stringify(banners), { headers: { ...headers, "Cache-Control": "public, max-age=60" } });
  } catch {
    return new Response(JSON.stringify({ error: "Não foi possível carregar os banners." }), { status: 500, headers });
  }
});