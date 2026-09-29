import { admin, aplicarEstado, brDateToIso } from '../_shared/bb.ts'

// Recebe o aviso de baixa/liquidação do Banco do Brasil.
// URL a cadastrar no portal BB: .../functions/v1/bb-webhook?token=<token exibido no módulo financeiro>
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  const db = admin()
  const token = new URL(req.url).searchParams.get('token')
  const { data: t } = await db.from('integracao_tokens').select('token').eq('nome', 'bb').single()
  if (!token || token !== t?.token) return new Response('unauthorized', { status: 401 })

  const body = await req.json().catch(() => null)
  const itens = Array.isArray(body) ? body : body ? [body] : []
  for (const it of itens.slice(0, 200)) {
    const numero = String(it?.id ?? '').trim()
    if (!/^\d{20}$/.test(numero)) continue
    const { data: b } = await db.from('boletos').select('*').eq('numero', numero).maybeSingle()
    if (!b) continue
    const pago = Number(it.valorPagoSacado ?? 0)
    const estado = pago > 0 ? 6 : Number(it.codigoEstadoBaixaOperacional ?? 7) === 1 ? 6 : 7
    try {
      await aplicarEstado(db, b, estado, pago, brDateToIso(it.dataLiquidacao ?? it.dataPagamento))
    } catch (e) { console.error('webhook', numero, e) }
  }
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
})
