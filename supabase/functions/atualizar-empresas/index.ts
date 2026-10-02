import { createClient } from "npm:@supabase/supabase-js@2";
import dados from "./dados.json" with { type: "json" };
const TOKEN = "560cb7e3a60fc14bccb8ccb680c54808";
Deno.serve(async (req) => {
  if (req.headers.get("x-run-token") !== TOKEN) return new Response("forbidden", { status: 403 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const norm = (s: string) => s.normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const { data: emps } = await db.from("empresas").select("id,nome,user_id");
  const log: any[] = [];
  for (const d of dados as any[]) {
    try {
      const e = (emps ?? []).find((x: any) => norm(x.nome) === norm(d.nome));
      const campos = { nome: d.nome, cnpj: d.cnpj, email: d.email, telefone: d.telefone, telefone2: d.telefone2, contato: d.contato, redes_sociais: d.redes_sociais || null, categoria: d.categoria || null };
      if (e) {
        const { error: ae } = await db.auth.admin.updateUserById(e.user_id, { email: d.email, password: d.cnpj, email_confirm: true });
        if (ae) throw new Error("auth: " + ae.message);
        await db.from("profiles").update({ email: d.email, senha_alterada: false }).eq("id", e.user_id);
        const { error } = await db.from("empresas").update(campos).eq("id", e.id);
        if (error) throw error;
        log.push({ nome: d.nome, ok: "atualizada" });
      } else {
        const { data: u, error: ce } = await db.auth.admin.createUser({ email: d.email, password: d.cnpj, email_confirm: true, user_metadata: { nome: d.nome } });
        if (ce) throw new Error("create: " + ce.message);
        const uid = u.user!.id;
        await db.from("profiles").upsert({ id: uid, email: d.email, nome: d.nome }, { onConflict: "id" });
        await db.from("user_roles").delete().eq("user_id", uid).eq("role", "arquiteto");
        await db.from("user_roles").upsert({ user_id: uid, role: "empresa" }, { onConflict: "user_id,role" });
        const { error } = await db.from("empresas").insert({ ...campos, user_id: uid, ativa: true, cidade: "Uberaba", estado: "MG" });
        if (error) throw error;
        log.push({ nome: d.nome, ok: "criada" });
      }
    } catch (err) { log.push({ nome: d.nome, erro: (err as Error).message }); }
  }
  return new Response(JSON.stringify(log, null, 1), { headers: { "Content-Type": "application/json" } });
});
