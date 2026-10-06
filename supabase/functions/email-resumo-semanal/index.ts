import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { enviarEmailSeguro, layout, esc, SITE_URL, dataBr } from '../_shared/email.ts'

// Resumo semanal (aniversariantes da semana + upgrades dos últimos 7 dias) para gestores e lojistas
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  try {
    const hoje = new Date(); hoje.setUTCHours(0, 0, 0, 0)
    const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(hoje); d.setUTCDate(d.getUTCDate() + i); return d })
    const { data: anivs } = await db.rpc('get_aniversariantes')
    const semana = (anivs ?? []).filter((a: any) => dias.some((d) => d.getUTCDate() === a.dia && d.getUTCMonth() + 1 === a.mes))
    const { data: ups } = await db.rpc('get_ultimos_upgrades', { _empresa_id: null })
    const limite = new Date(hoje); limite.setUTCDate(limite.getUTCDate() - 7)
    const recentes = (ups ?? []).filter((u: any) => u.data_upgrade >= limite.toISOString().slice(0, 10))
    if (!semana.length && !recentes.length) return Response.json({ enviados: 0 }, { headers: corsHeaders })

    const pad = (n: number) => String(n).padStart(2, '0')
    const corpo = `
${semana.length ? `<h2 style="font-family:Georgia,serif;font-weight:normal">Aniversariantes da semana</h2><ul>${semana.map((a: any) => `<li>${pad(a.dia)}/${pad(a.mes)} — ${esc(a.nome)}${a.profissao ? ` (${esc(a.profissao)})` : ''}</li>`).join('')}</ul>` : ''}
${recentes.length ? `<h2 style="font-family:Georgia,serif;font-weight:normal">Upgrades dos últimos 7 dias</h2><ul>${recentes.map((u: any) => `<li>${dataBr(u.data_upgrade)} — ${esc(u.nome)}: ${esc(u.de_nivel)} → <strong>${esc(u.para_nivel)}</strong></li>`).join('')}</ul>` : ''}`
    const html = layout('Resumo da semana', corpo, { texto: 'Abrir painel', link: `${SITE_URL}/login` })

    const { data: gestores } = await db.from('user_roles').select('user_id').eq('role', 'gestor')
    const ids = (gestores ?? []).map((g: any) => g.user_id)
    const { data: perfis } = ids.length ? await db.from('profiles').select('email').in('id', ids) : { data: [] }
    const { data: empresas } = await db.from('empresas').select('email').eq('ativa', true)
    const destinos = [...new Set([...(perfis ?? []), ...(empresas ?? [])].map((p: any) => String(p.email ?? '').trim().toLowerCase()).filter((e) => e.includes('@') && !e.endsWith('@localhost.com')))]
    for (const to of destinos) {
      await enviarEmailSeguro(to, 'Aniversariantes e upgrades da semana — Grupo Conexão', html)
      await new Promise((r) => setTimeout(r, 600)) // respeita limite de envio do Resend
    }
    return Response.json({ enviados: destinos.length }, { headers: corsHeaders })
  } catch (err) {
    console.error(err)
    return Response.json({ error: (err as Error).message }, { status: 500, headers: corsHeaders })
  }
})
