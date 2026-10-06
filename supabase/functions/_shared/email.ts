// Envio de e-mails pelo Resend com a chave exclusiva deste projeto (domínio agenciamundi.com)
export const EMAIL_FROM = 'Grupo Conexão <conexao.info@agenciamundi.com>'
export const SITE_URL = 'https://conexao.agenciamundi.com'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export { esc }

export function layout(titulo: string, corpo: string, botao?: { texto: string; link: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#3b2f2a">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-family:Georgia,serif;font-size:22px;color:#a0522d;margin:0 0 24px">Grupo Conexão</p>
<h1 style="font-family:Georgia,serif;font-size:24px;font-weight:normal;margin:0 0 16px">${esc(titulo)}</h1>
<div style="font-size:15px;line-height:1.6">${corpo}</div>
${botao ? `<p style="margin:28px 0"><a href="${esc(botao.link)}" style="background:#a0522d;color:#ffffff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block">${esc(botao.texto)}</a></p>` : ''}
<hr style="border:none;border-top:1px solid #e8e0d8;margin:32px 0 12px"/>
<p style="font-size:12px;color:#8a7d75">Programa Conexão · ${SITE_URL.replace('https://', '')}</p>
</div></body></html>`
}

export async function enviarEmail(to: string | string[], subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY_CONEXAO')
  if (!key) throw new Error('RESEND_API_KEY_CONEXAO não configurada')
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: Array.isArray(to) ? to : [to], subject, html }),
  })
  const txt = await r.text()
  if (!r.ok) {
    console.error(`Resend falhou [${r.status}]: ${txt}`)
    throw new Error(`Resend ${r.status}: ${txt}`)
  }
  return JSON.parse(txt)
}

// Não deixa falha de e-mail derrubar a operação principal
export async function enviarEmailSeguro(to: string | null | undefined, subject: string, html: string) {
  if (!to) return
  try { await enviarEmail(to, subject, html) } catch (e) { console.error('E-mail não enviado:', (e as Error).message) }
}

export const brl = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
export const dataBr = (d: string) => d.split('-').reverse().join('/')
