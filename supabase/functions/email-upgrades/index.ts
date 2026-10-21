import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { enviarEmail, layout, esc, dataBr } from '../_shared/email.ts';
import { retryDelayMinutes, upgradeSubject, type UpgradeEmail } from './rules.ts';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders });
const Body = z.object({ dry_run: z.boolean().optional() }).strict();

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'Serviço não configurado' }, 500);
  const db = createClient(url, key);
  try {
    const { data: config, error: configError } = await db.from('integracao_tokens').select('token').eq('nome', 'bb').single();
    if (configError) throw configError;
    const cronToken = req.headers.get('x-cron-token');
    if (!cronToken || cronToken !== config?.token) {
      const auth = req.headers.get('Authorization');
      if (!auth?.startsWith('Bearer ')) return json({ error: 'Não autorizado' }, 401);
      const { data: session, error: sessionError } = await db.auth.getUser(auth.slice(7));
      if (sessionError || !session.user) return json({ error: 'Não autorizado' }, 401);
      const { data: role, error: roleError } = await db.from('user_roles').select('user_id').eq('user_id', session.user.id).eq('role', 'gestor').maybeSingle();
      if (roleError) throw roleError;
      if (!role) return json({ error: 'Acesso restrito ao gestor' }, 403);
    }
    const body = Body.safeParse(await req.json().catch(() => null));
    if (!body.success) return json({ error: 'Pedido inválido' }, 400);
    if (body.data.dry_run) {
      const { count, error } = await db.from('upgrade_email_outbox').select('id', { count: 'exact', head: true }).is('enviado_em', null);
      if (error) throw error;
      return json({ pendentes: count, dry_run: true });
    }
    const { data, error } = await db.rpc('claim_upgrade_emails');
    if (error) throw error;
    let enviados = 0;
    let falhas = 0;
    for (const row of (data ?? []) as UpgradeEmail[]) {
      try {
        const html = layout('Novo nível conquistado',
          `<p><strong>${esc(row.nome)}</strong> conquistou um novo nível no Grupo Conexão!</p><p>${esc(row.de_nivel)} → <strong>${esc(row.para_nivel)}</strong></p><p>Data: ${dataBr(row.data_upgrade)}<br>Pontuação total no upgrade: ${Number(row.pontos).toLocaleString('pt-BR')} pontos.</p>`,
          { texto: 'Acessar o sistema', link: 'https://conexao.arq.br/login' });
        await enviarEmail(row.email, upgradeSubject(row), html, `upgrade-${row.id}`);
        const { error: savedError } = await db.from('upgrade_email_outbox').update({ enviado_em: new Date().toISOString(), bloqueado_ate: null, ultimo_erro: null }).eq('id', row.id);
        if (savedError) throw savedError;
        enviados++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('Falha no aviso de upgrade:', row.id, message);
        const { error: savedError } = await db.from('upgrade_email_outbox').update({
          bloqueado_ate: null,
          proxima_tentativa: new Date(Date.now() + retryDelayMinutes(row.tentativas) * 60000).toISOString(),
          ultimo_erro: message.slice(0, 2000),
        }).eq('id', row.id);
        if (savedError) throw savedError;
        falhas++;
      }
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
    if (enviados > 0) {
      const { error: wakeError } = await db.rpc('wake_upgrade_emails');
      if (wakeError) throw wakeError;
    }
    return json({ enviados, falhas });
  } catch (err) {
    console.error('email-upgrades:', err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});