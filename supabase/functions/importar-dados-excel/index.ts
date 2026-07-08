import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import dados from "./dados.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type EmpresaMap = { nome: string; email: string; senha: string };
type ProfMap = { nome: string; email: string; senha: string };
type Venda = { empresa: string; profissional: string; data: string; valor: number };
type Prem = { empresa: string; profissional: string; vendas: number; pontos: number; categoria_premio: number; custo: number };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // Auth
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Não autorizado");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) throw new Error("Não autorizado");

    // Bootstrap: se ainda não existir nenhum gestor, promove o chamador
    const { count: gestorCount } = await admin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "gestor");
    if (!gestorCount || gestorCount === 0) {
      await admin.from("user_roles").upsert(
        { user_id: userData.user.id, role: "gestor" },
        { onConflict: "user_id,role" },
      );
    }

    const { data: role } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "gestor").maybeSingle();
    if (!role) throw new Error("Apenas gestores podem importar");

    const empresasMap = dados.empresas_map as EmpresaMap[];
    const profsMap = dados.profissionais_map as ProfMap[];
    const vendas = dados.vendas_mensais as Venda[];
    const premiacoes = dados.premiacoes as Prem[];

    const log: string[] = [];
    const credenciais: any[] = [];
    const empresaIds = new Map<string, string>(); // nome -> empresas.id
    const profIds = new Map<string, string>(); // nome -> profiles.id

    // Helper: get or create user
    async function getOrCreate(email: string, senha: string, nome: string): Promise<string> {
      const { data: existing } = await admin
        .from("profiles").select("id").eq("email", email).maybeSingle();
      if (existing?.id) return existing.id;
      // Tenta encontrar user existente em auth
      let userId: string | undefined;
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = list?.users?.find((u) => u.email === email);
      if (found) {
        userId = found.id;
      } else {
        const { data: created, error } = await admin.auth.admin.createUser({
          email, password: senha, email_confirm: true, user_metadata: { nome },
        });
        if (error || !created.user) throw new Error(`createUser ${email}: ${error?.message}`);
        userId = created.user.id;
      }
      // Garante profile
      await admin.from("profiles").upsert({ id: userId, email, nome }, { onConflict: "id" });
      return userId!;
    }

    // Concurrency runner
    async function runPool<T>(items: T[], limit: number, fn: (t: T) => Promise<void>) {
      let i = 0;
      const workers = Array.from({ length: limit }, async () => {
        while (i < items.length) {
          const idx = i++;
          try { await fn(items[idx]); } catch (e) { log.push(`erro: ${(e as Error).message}`); }
        }
      });
      await Promise.all(workers);
    }

    // 1) Empresas — em paralelo (concorrência 8)
    await runPool(empresasMap, 8, async (e) => {
      const { data: existing } = await admin
        .from("empresas").select("id").eq("nome", e.nome).maybeSingle();
      if (existing?.id) { empresaIds.set(e.nome, existing.id); return; }
      const userId = await getOrCreate(e.email, e.senha, e.nome);
      await admin.from("user_roles").delete().eq("user_id", userId).eq("role", "arquiteto");
      await admin.from("user_roles").upsert({ user_id: userId, role: "empresa" }, { onConflict: "user_id,role" });
      const { data: emp, error: eErr } = await admin
        .from("empresas").insert({
          user_id: userId, nome: e.nome, email: e.email, ativa: true,
          cidade: "Uberaba", estado: "MG",
        }).select("id").single();
      if (eErr) throw new Error(`empresa ${e.nome}: ${eErr.message}`);
      empresaIds.set(e.nome, emp.id);
      credenciais.push({ tipo: "lojista", nome: e.nome, email: e.email, senha: e.senha });
    });

    // 2) Profissionais — em paralelo (concorrência 10)
    await runPool(profsMap, 10, async (p) => {
      const { data: existing } = await admin
        .from("profiles").select("id").eq("email", p.email).maybeSingle();
      if (existing?.id) { profIds.set(p.nome, existing.id); return; }
      const userId = await getOrCreate(p.email, p.senha, p.nome);
      await admin.from("profiles").update({
        nome_divulgacao: p.nome, profissao: "Arquiteto(a)",
        cidade: "Uberaba", estado: "MG",
      }).eq("id", userId);
      await admin.from("user_roles").upsert({ user_id: userId, role: "arquiteto" }, { onConflict: "user_id,role" });
      profIds.set(p.nome, userId);
      credenciais.push({ tipo: "profissional", nome: p.nome, email: p.email, senha: p.senha });
    });

    // 3) Vendas — apaga existentes das empresas importadas e reinsere
    const empresaIdList = [...empresaIds.values()];
    if (empresaIdList.length) {
      await admin.from("vendas").delete().in("empresa_id", empresaIdList);
    }
    const vendaRows = vendas
      .map((v) => {
        const eId = empresaIds.get(v.empresa);
        const pId = profIds.get(v.profissional);
        if (!eId || !pId) return null;
        return {
          empresa_id: eId, arquiteto_id: pId,
          valor_venda: v.valor, pontos_calculados: Math.floor(v.valor / 1000),
          data_venda: v.data, observacao: "Importação Excel",
        };
      })
      .filter(Boolean) as any[];
    // insere em lotes de 500
    for (let i = 0; i < vendaRows.length; i += 500) {
      const chunk = vendaRows.slice(i, i + 500);
      const { error } = await admin.from("vendas").insert(chunk);
      if (error) throw new Error(`vendas lote ${i}: ${error.message}`);
    }
    log.push(`vendas inseridas: ${vendaRows.length}`);

    // 4) Premiações snapshot
    await admin.from("premiacoes_snapshot").delete().in("empresa_id", empresaIdList);
    const premRows = premiacoes
      .map((p) => {
        const eId = empresaIds.get(p.empresa);
        const pId = profIds.get(p.profissional);
        if (!eId || !pId) return null;
        return {
          empresa_id: eId, arquiteto_id: pId,
          vendas: p.vendas, pontos: p.pontos,
          categoria_premio: p.categoria_premio, custo: p.custo,
        };
      })
      .filter(Boolean) as any[];
    for (let i = 0; i < premRows.length; i += 500) {
      const { error } = await admin.from("premiacoes_snapshot")
        .upsert(premRows.slice(i, i + 500), { onConflict: "empresa_id,arquiteto_id" });
      if (error) throw new Error(`premiacoes lote ${i}: ${error.message}`);
    }
    log.push(`premiacoes: ${premRows.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          empresas: empresaIds.size,
          profissionais: profIds.size,
          vendas: vendaRows.length,
          premiacoes: premRows.length,
        },
        credenciais,
        log,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
