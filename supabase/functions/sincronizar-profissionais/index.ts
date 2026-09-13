import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import lista from "./profissionais.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Reg = {
  nome: string;
  doc: string;
  celular: string | null;
  nascimento: string | null;
  email: string;
  pontos: number;
};

function norm(s: string) {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Não autorizado");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData?.user) throw new Error("Não autorizado");

    const { data: role } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "gestor").maybeSingle();
    if (!role) throw new Error("Apenas gestores podem sincronizar profissionais");

    // Índice de perfis existentes por nome normalizado
    const perfilPorNome = new Map<string, { id: string; email: string }>();
    for (let from = 0; from < 5000; from += 1000) {
      const { data } = await admin.from("profiles").select("id, nome, email").range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const p of data) perfilPorNome.set(norm(p.nome ?? ""), { id: p.id, email: p.email ?? "" });
      if (data.length < 1000) break;
    }

    // Índice de contas por e-mail
    const authPorEmail = new Map<string, string>();
    for (let page = 1; page <= 20; page++) {
      const { data: pg } = await admin.auth.admin.listUsers({ page, perPage: 200 });
      const users = pg?.users ?? [];
      for (const u of users) if (u.email) authPorEmail.set(u.email.toLowerCase(), u.id);
      if (users.length < 200) break;
    }

    const registros = lista as Reg[];
    const log: string[] = [];
    let atualizados = 0;
    let criados = 0;

    async function processar(r: Reg) {
      const email = r.email.toLowerCase();
      const senha = r.doc;
      const existente = perfilPorNome.get(norm(r.nome));
      const donoDoEmail = authPorEmail.get(email);

      let userId: string;

      if (existente) {
        userId = existente.id;
        if (!donoDoEmail || donoDoEmail === userId) {
          const { error } = await admin.auth.admin.updateUserById(userId, {
            email,
            password: senha,
            email_confirm: true,
          });
          if (error) {
            log.push(`${r.nome}: conta não atualizada (${error.message})`);
          } else {
            authPorEmail.set(email, userId);
          }
        } else {
          log.push(`${r.nome}: e-mail ${email} já pertence a outra conta; senha atualizada sem trocar e-mail`);
          await admin.auth.admin.updateUserById(userId, { password: senha });
        }
        atualizados++;
      } else if (donoDoEmail) {
        userId = donoDoEmail;
        await admin.auth.admin.updateUserById(userId, { password: senha, email_confirm: true });
        atualizados++;
      } else {
        const { data: novo, error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { nome: r.nome },
        });
        if (error || !novo.user) throw new Error(`criar ${r.nome}: ${error?.message}`);
        userId = novo.user.id;
        authPorEmail.set(email, userId);
        criados++;
      }

      const { error: pErr } = await admin.from("profiles").upsert({
        id: userId,
        nome: r.nome,
        email,
        cnpj_cpf: r.doc,
        celular: r.celular,
        telefone: r.celular,
        nascimento: r.nascimento,
        senha_alterada: false,
      }, { onConflict: "id" });
      if (pErr) throw new Error(`perfil ${r.nome}: ${pErr.message}`);

      await admin.from("user_roles")
        .upsert({ user_id: userId, role: "arquiteto" }, { onConflict: "user_id,role" });

      perfilPorNome.set(norm(r.nome), { id: userId, email });
    }

    let i = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (i < registros.length) {
        const idx = i++;
        try {
          await processar(registros[idx]);
        } catch (e) {
          log.push(`erro: ${(e as Error).message}`);
        }
      }
    }));

    return new Response(
      JSON.stringify({ success: true, total: registros.length, atualizados, criados, log }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 },
    );
  }
});
