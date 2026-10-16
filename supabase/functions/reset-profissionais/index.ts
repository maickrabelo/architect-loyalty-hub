import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmail, layout, esc, SITE_URL } from '../_shared/email.ts'

const EXCLUIR = ['ac home', 'nathally', 'paulo vitor', 'thaianne', 'schroden']

Deno.serve(async (req) => {
  if (req.headers.get('x-run') !== 'prof-2026-10-16') return new Response('no', { status: 401 })
  const url = new URL(req.url)
  const dry = url.searchParams.get('dry') === '1'
  const limit = Number(url.searchParams.get('limit') ?? '90')
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const key = Deno.env.get('RESEND_API_KEY_CONEXAO')!

  // Quem já recebeu (lista do Resend)
  const enviados = new Set<string>()
  let after: string | undefined
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`https://api.resend.com/emails?limit=100${after ? `&after=${after}` : ''}`, { headers: { Authorization: `Bearer ${key}` } })
    if (!r.ok) return new Response(`resend list ${r.status}: ${await r.text()}`, { status: 500 })
    const j = await r.json()
    for (const e of j.data ?? []) {
      if (String(e.subject ?? '').toLowerCase().includes('novo sistema') && !['bounced', 'failed'].includes(e.last_event))
        for (const t of e.to ?? []) enviados.add(String(t).toLowerCase())
    }
    if (!j.has_more || !j.data?.length) break
    after = j.data[j.data.length - 1].id
  }

  const { data: roles } = await db.from('user_roles').select('user_id').eq('role', 'arquiteto')
  const ids = (roles ?? []).map((r: any) => r.user_id)
  const { data: perfis } = await db.from('profiles').select('id,email,nome,cnpj_cpf,senha_alterada').in('id', ids)
  const pendentes = (perfis ?? []).filter((p: any) =>
    p.email && !enviados.has(p.email.toLowerCase()) && !p.senha_alterada &&
    (p.cnpj_cpf ?? '').replace(/\D/g, '').length >= 11 &&
    !EXCLUIR.some((x) => (p.nome ?? '').toLowerCase().includes(x)))

  if (dry) return Response.json({ enviados: enviados.size, total: perfis?.length, pendentes: pendentes.length, nomes: pendentes.map((p: any) => p.nome) })

  const res: any[] = []
  for (const p of pendentes.slice(0, limit)) {
    const senha = p.cnpj_cpf.replace(/\D/g, '')
    try {
      const { error } = await db.auth.admin.updateUserById(p.id, { password: senha })
      if (error) throw error
      const corpo = `<p>Olá, ${esc(p.nome)}!</p><p>O novo sistema do <b>Programa Conexão</b> está no ar. Agora você acompanha seus pontos, destinos e novidades em um só lugar.</p>
<p><b>Seu primeiro acesso:</b><br/>E-mail: ${esc(p.email)}<br/>Senha: seu CPF/CNPJ, somente números</p>
<p>No primeiro acesso, o sistema vai pedir para você criar uma senha pessoal.</p>`
      await enviarEmail(p.email, 'O novo sistema Conexão está no ar', layout('O novo sistema está no ar', corpo, { texto: 'Acessar o sistema', link: `${SITE_URL}/login` }))
      res.push({ nome: p.nome, ok: true })
    } catch (e) {
      res.push({ nome: p.nome, erro: (e as Error).message })
      if (String((e as Error).message).includes('429')) break
    }
    await new Promise((r) => setTimeout(r, 600))
  }
  return Response.json({ enviados_antes: enviados.size, pendentes: pendentes.length, resultado: res })
})
