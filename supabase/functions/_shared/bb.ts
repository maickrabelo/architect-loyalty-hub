import { createClient } from 'npm:@supabase/supabase-js@2'

// Ambiente: sandbox (testes). Para produção troque as URLs e o nome do parâmetro de chave.
const OAUTH_URL = 'https://oauth.sandbox.bb.com.br/oauth/token'
const API_URL = 'https://api.sandbox.bb.com.br/cobrancas/v2'
const APP_KEY_PARAM = 'gw-dev-app-key'

export const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

export const cfg = () => {
  const need = ['BB_CLIENT_ID', 'BB_CLIENT_SECRET', 'BB_APP_KEY', 'BB_CONVENIO', 'BB_CARTEIRA', 'BB_VARIACAO', 'BB_AGENCIA', 'BB_CONTA']
  const missing = need.filter((n) => !Deno.env.get(n))
  if (missing.length) throw new Error(`Configuração do Banco do Brasil incompleta: ${missing.join(', ')}`)
  return Object.fromEntries(need.map((n) => [n, Deno.env.get(n)!])) as Record<string, string>
}

let cached: { token: string; exp: number } | null = null
export async function token() {
  if (cached && cached.exp > Date.now()) return cached.token
  const c = cfg()
  let lastErr = ''
  // O sandbox do BB é instável (frequentes 502/504): tenta 2 vezes antes de desistir
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    try {
      const r = await fetch(OAUTH_URL, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${c.BB_CLIENT_ID}:${c.BB_CLIENT_SECRET}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=cobrancas.boletos-info cobrancas.boletos-requisicao',
        signal: AbortSignal.timeout(20000),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) {
        cached = { token: j.access_token, exp: Date.now() + (Number(j.expires_in ?? 600) - 60) * 1000 }
        return cached.token
      }
      lastErr = `Falha de autenticação no BB (${r.status}): ${j.error_description ?? j.error ?? 'sem detalhe'}`
      // 401/403 = credencial errada, não adianta tentar de novo
      if (r.status === 401 || r.status === 403) throw new Error(lastErr)
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e)
      if (lastErr.includes('(401)') || lastErr.includes('(403)')) throw e
    }
    if (tentativa < 2) await new Promise((res) => setTimeout(res, 2000))
  }
  throw new Error(`${lastErr} — o ambiente de testes do Banco do Brasil está instável ou fora do ar no momento; tente novamente em alguns minutos`)
}

export async function bb(path: string, init: RequestInit = {}, query: Record<string, string> = {}) {
  const c = cfg()
  const qs = new URLSearchParams({ [APP_KEY_PARAM]: c.BB_APP_KEY, ...query })
  const r = await fetch(`${API_URL}${path}?${qs}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const text = await r.text()
  let j: any = {}
  try { j = text ? JSON.parse(text) : {} } catch { j = { raw: text } }
  if (!r.ok) {
    const msg = j?.erros?.[0]?.mensagem ?? j?.errors?.[0]?.message ?? j?.message ?? text
    throw new Error(`BB ${r.status}: ${msg}`)
  }
  return j
}

export const brDateToIso = (d?: string) => {
  if (!d) return null
  const m = d.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

// Estado 6 = Liquidado, 7 = Baixado, 9 = Baixado/pago via Pix, 1 = Normal
export async function aplicarEstado(db: ReturnType<typeof admin>, boleto: any, estado: number, valorPago: number, dataPg: string | null) {
  if ((estado === 6 || valorPago > 0) && boleto.status !== 'pago') {
    const { error } = await db.rpc('registrar_pagamento_boleto', {
      _boleto_id: boleto.id, _valor: valorPago || Number(boleto.valor), _data: dataPg ?? new Date().toISOString().slice(0, 10), _codigo_estado: estado,
    })
    if (error) throw error
    return 'pago'
  }
  if ((estado === 7 || estado === 5) && boleto.status === 'emitido') {
    await db.from('boletos').update({ status: 'baixado', codigo_estado: estado }).eq('id', boleto.id)
    return 'baixado'
  }
  await db.from('boletos').update({ codigo_estado: estado }).eq('id', boleto.id)
  return boleto.status
}
