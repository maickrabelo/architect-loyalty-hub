import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod@3'
import { admin, bb, cfg, token, aplicarEstado, HOMOLOG } from '../_shared/bb.ts'

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('emitir'), fatura_id: z.string().uuid(), tipo: z.enum(['mensalidade', 'pontos', 'extras']), novo_vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  z.object({ action: z.literal('consultar'), boleto_id: z.string().uuid() }),
  z.object({ action: z.literal('baixar'), boleto_id: z.string().uuid() }),
  z.object({ action: z.literal('ping') }),
  z.object({ action: z.literal('sincronizar') }),
])

const fmt = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}.${m}.${y}` }

async function autorizar(req: Request, db: ReturnType<typeof admin>) {
  const cron = req.headers.get('x-cron-token')
  if (cron) {
    const { data } = await db.from('integracao_tokens').select('token').eq('nome', 'bb').single()
    return data?.token === cron ? 'cron' : null
  }
  const auth = req.headers.get('Authorization')
  if (!auth) return null
  const u = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await u.auth.getUser()
  if (!user) return null
  const { data: ok } = await db.rpc('is_financeiro', { _user_id: user.id })
  return ok ? user.id : null
}

async function emitir(db: any, userId: string, faturaId: string, tipo: string, novoVencimento?: string) {
  const c = cfg()
  const { data: f, error } = await db.from('faturas').select('*, empresas(*)').eq('id', faturaId).single()
  if (error || !f) throw new Error('Fatura não encontrada')
  const valor = Number(tipo === 'mensalidade' ? f.valor_mensalidade : tipo === 'pontos' ? f.valor_pontos_mes : f.valor_extras)
  let venc = tipo === 'mensalidade' ? (f.vencimento_mensalidade ?? f.vencimento) : tipo === 'extras' ? (f.vencimento_extras ?? f.vencimento) : f.vencimento
  if (!(valor > 0)) throw new Error('Valor zerado para este vencimento')
  const hoje = new Date().toISOString().slice(0, 10)
  if (novoVencimento) {
    if (novoVencimento < hoje) throw new Error('A nova data de vencimento não pode estar no passado')
    venc = novoVencimento
  } else if (venc < hoje) {
    throw new Error('VENCIDO:Este pagamento está vencido. Defina uma nova data de vencimento para reemitir o boleto.')
  }
  const e = f.empresas
  const doc = String(e?.cnpj ?? '').replace(/\D/g, '')
  if (doc.length !== 11 && doc.length !== 14) throw new Error(`Empresa ${e?.nome} sem CPF/CNPJ válido cadastrado`)

  const { data: existente } = await db.from('boletos').select('id,status').eq('fatura_id', faturaId).eq('tipo', tipo).in('status', ['pendente', 'emitido', 'pago']).maybeSingle()
  if (existente) throw new Error('Já existe boleto ativo para este vencimento')

  const { data: seq } = await db.rpc('proximo_numero_boleto')
  const numero = `000${c.BB_CONVENIO.padStart(7, '0')}${String(seq).padStart(10, '0')}`
  const { data: boleto, error: insErr } = await db.from('boletos').insert({
    fatura_id: faturaId, empresa_id: f.empresa_id, tipo, valor, vencimento: venc, numero, status: 'pendente', created_by: userId === 'cron' ? null : userId,
  }).select().single()
  if (insErr) throw insErr

  try {
    const r = await bb('/boletos', {
      method: 'POST',
      body: JSON.stringify({
        numeroConvenio: Number(c.BB_CONVENIO),
        numeroCarteira: Number(c.BB_CARTEIRA),
        numeroVariacaoCarteira: Number(c.BB_VARIACAO),
        codigoModalidade: 1,
        dataEmissao: fmt(new Date().toISOString().slice(0, 10)),
        dataVencimento: fmt(venc),
        valorOriginal: Number(valor.toFixed(2)),
        codigoAceite: 'N',
        codigoTipoTitulo: 2,
        descricaoTipoTitulo: 'DM',
        indicadorPermissaoRecebimentoParcial: 'N',
        numeroTituloBeneficiario: `${String(f.mes)}${tipo.slice(0, 4)}`
          .normalize('NFD').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15),
        numeroTituloCliente: numero,
        mensagemBloquetoOcorrencia: `Programa Conexão - ${tipo} ${f.mes}`,
        pagador: {
          // Homologação do BB só aceita CNPJs de teste cadastrados por eles
          tipoInscricao: HOMOLOG ? 2 : (doc.length === 11 ? 1 : 2),
          numeroInscricao: HOMOLOG ? '74910037000193' : doc,
          nome: (e.nome ?? '').slice(0, 60),
          endereco: (e.endereco ?? '').slice(0, 60),
          cidade: e.cidade ?? '',
          uf: e.estado ?? '',
          email: e.email ?? undefined,
        },
        indicadorPix: 'S',
      }),
    })
    const { data: upd } = await db.from('boletos').update({
      status: 'emitido', linha_digitavel: r.linhaDigitavel, codigo_barras: r.codigoBarraNumerico,
      qr_code: r.qrCode?.emv ?? null, url_imagem: r.urlImagemBoleto ?? null, erro: null,
    }).eq('id', boleto.id).select().single()
    return upd
  } catch (err) {
    await db.from('boletos').update({ status: 'erro', erro: (err as Error).message }).eq('id', boleto.id)
    throw err
  }
}

async function consultar(db: any, b: any) {
  const c = cfg()
  const r = await bb(`/boletos/${b.numero}`, {}, { numeroConvenio: c.BB_CONVENIO })
  const estado = Number(r.codigoEstadoTituloCobranca ?? 0)
  const pago = Number(r.valorPagoSacado ?? 0)
  const data = r.dataRecebimentoTitulo ? String(r.dataRecebimentoTitulo).split('.').reverse().join('-') : null
  return aplicarEstado(db, b, estado, estado === 6 ? pago : 0, data)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const db = admin()
  try {
    const who = await autorizar(req, db)
    if (!who) return json({ error: 'Não autorizado' }, 401)
    const parsed = Body.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400)
    const body = parsed.data
    if (who === 'cron' && body.action !== 'sincronizar') return json({ error: 'Não autorizado' }, 401)

    if (body.action === 'ping') return json({ ok: true, token: (await token()).slice(0, 8) + '...' })

    if (body.action === 'emitir') return json({ boleto: await emitir(db, who, body.fatura_id, body.tipo, body.novo_vencimento) })

    if (body.action === 'consultar' || body.action === 'baixar') {
      const { data: b } = await db.from('boletos').select('*').eq('id', body.boleto_id).single()
      if (!b?.numero) return json({ error: 'Boleto não encontrado' }, 404)
      if (body.action === 'baixar') {
        const c = cfg()
        await bb(`/boletos/${b.numero}/baixar`, { method: 'POST', body: JSON.stringify({ numeroConvenio: Number(c.BB_CONVENIO) }) })
        await db.from('boletos').update({ status: 'baixado' }).eq('id', b.id)
        return json({ status: 'baixado' })
      }
      return json({ status: await consultar(db, b) })
    }

    // sincronizar: até 50 boletos em aberto por execução, em sequência
    const { data: abertos } = await db.from('boletos').select('*').eq('status', 'emitido').order('updated_at').limit(50)
    let pagos = 0, erros = 0
    for (const b of abertos ?? []) {
      try { if ((await consultar(db, b)) === 'pago') pagos++ } catch (e) {
        erros++
        if (String((e as Error).message).startsWith('BB 429')) break
      }
    }
    return json({ verificados: abertos?.length ?? 0, pagos, erros })
  } catch (e) {
    return json({ error: (e as Error).message }, 400)
  }
})
