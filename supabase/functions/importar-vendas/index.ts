import { createClient } from "npm:@supabase/supabase-js@2";
import dados from "./dados.json" with { type: "json" };
Deno.serve(async (req) => {
  if (req.headers.get("x-run-token") !== "8f5f1f0b2d8175cff7f95f9f815f9e27") return new Response("forbidden", { status: 403 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const del = await db.from("vendas").delete({ count: "exact" }).in("observacao", ["Importação Excel", "Planilha de vendas"]);
  if (del.error) return new Response("del: " + del.error.message, { status: 500 });
  const rows = dados as any[]; let ins = 0;
  for (let i = 0; i < rows.length; i += 300) {
    const { error } = await db.from("vendas").insert(rows.slice(i, i + 300));
    if (error) return new Response(JSON.stringify({ apagadas: del.count, ins, erro: error.message }), { status: 500 });
    ins += Math.min(300, rows.length - i);
  }
  return new Response(JSON.stringify({ apagadas: del.count, inseridas: ins }));
});
