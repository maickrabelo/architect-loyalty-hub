import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail, layout, SITE_URL } from '../_shared/email.ts'

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { email, origem } = await req.json().catch(() => ({}))
    const e = String(email ?? '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 255) return json({ error: 'E-mail inválido' }, 400)
    const base = typeof origem === 'string' && /^https?:\/\/[^\s/]+$/.test(origem) ? origem : SITE_URL
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await db.auth.admin.generateLink({ type: 'recovery', email: e, options: { redirectTo: `${base}/redefinir-senha` } })
    // Resposta sempre igual para não revelar quais e-mails existem
    if (error || !data?.properties?.action_link) { console.log('recuperação ignorada:', error?.message); return json({ ok: true }) }
    await enviarEmail(e, 'Redefinição de senha — Grupo Conexão', layout('Redefinir sua senha',
      `<p>Recebemos um pedido para redefinir a senha da sua conta no Programa Conexão.</p><p>Clique no botão abaixo para criar uma nova senha. Se não foi você, ignore este e-mail.</p>`,
      { texto: 'Criar nova senha', link: data.properties.action_link }))
    return json({ ok: true })
  } catch (err) {
    console.error(err)
    return json({ error: (err as Error).message }, 500)
  }
})
