import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const secret = Deno.env.get("RESEND_API_KEY_CONEXAO");
  if (req.method !== "POST" || !secret || req.headers.get("x-operation-token") !== secret) {
    return new Response("Não autorizado", { status: 403 });
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const id = "68a0a0cd-8713-41d5-a3bf-8ae83972cc54";
  const email = "antonio.lilianandrade@gmail.com";
  const { error: authError } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true });
  if (authError) return Response.json({ success: false, stage: "acesso", error: authError.message }, { status: 400 });
  const { error: profileError } = await admin.from("profiles").update({ email }).eq("id", id);
  if (profileError) return Response.json({ success: false, stage: "cadastro", error: profileError.message }, { status: 400 });
  return Response.json({ success: true, email });
});