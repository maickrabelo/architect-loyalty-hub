import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JWT } from 'npm:google-auth-library@^10';

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

type WebhookPayload = {
  type: 'INSERT';
  table: 'notifications';
  schema: 'public';
  record: NotificationRecord;
  old_record: null;
};

type FirebaseServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

const jsonHeaders = {
  'Content-Type': 'application/json',
};

function getServiceAccount(): FirebaseServiceAccount {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado');

  const account = JSON.parse(raw) as Partial<FirebaseServiceAccount>;
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON incompleto');
  }

  return {
    project_id: account.project_id,
    client_email: account.client_email,
    private_key: account.private_key.replace(/\\n/g, '\n'),
  };
}

async function getFirebaseAccessToken(serviceAccount: FirebaseServiceAccount): Promise<string> {
  const client = new JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const credentials = await client.authorize();
  if (!credentials.access_token) throw new Error('Não foi possível obter o token do Firebase');
  return credentials.access_token;
}

function normalizeData(data: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data ?? {}).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value ?? null),
    ]),
  );
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: { ...jsonHeaders, 'Access-Control-Allow-Origin': '*' } });
  }

  const expectedSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const receivedSecret = request.headers.get('x-push-webhook-secret');
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return Response.json({ error: 'Não autorizado' }, { status: 401, headers: jsonHeaders });
  }

  try {
    const payload = (await request.json()) as WebhookPayload;
    const record = payload.record;
    if (payload.type !== 'INSERT' || payload.table !== 'notifications' || !record?.user_id) {
      return Response.json({ error: 'Payload inválido' }, { status: 400, headers: jsonHeaders });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: tokens, error: tokenError } = await admin
      .from('push_tokens')
      .select('id, token, platform')
      .eq('user_id', record.user_id);

    if (tokenError) throw tokenError;
    if (!tokens?.length) {
      return Response.json({ sent: 0, reason: 'Usuário sem dispositivo registrado' }, { headers: jsonHeaders });
    }

    const serviceAccount = getServiceAccount();
    const accessToken = await getFirebaseAccessToken(serviceAccount);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
    const data = normalizeData(record.data ?? {});

    const results = await Promise.all(
      tokens.map(async (tokenRow) => {
        const response = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            ...jsonHeaders,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: tokenRow.token,
              notification: {
                title: record.title,
                body: record.body,
              },
              data,
              android: {
                notification: {
                  channel_id: 'grupo-conexao-default',
                  icon: 'ic_launcher',
                },
              },
            },
          }),
        });

        if (response.ok) return { id: tokenRow.id, sent: true, removed: false };

        const errorBody = await response.text();
        const staleToken = response.status === 404 || errorBody.includes('UNREGISTERED') || errorBody.includes('INVALID_ARGUMENT');
        if (staleToken) {
          await admin.from('push_tokens').delete().eq('id', tokenRow.id);
        }
        return { id: tokenRow.id, sent: false, removed: staleToken, status: response.status };
      }),
    );

    return Response.json(
      {
        notification_id: record.id,
        sent: results.filter((result) => result.sent).length,
        removed_stale_tokens: results.filter((result) => result.removed).length,
      },
      { headers: jsonHeaders },
    );
  } catch (error) {
    console.error('send-push failed:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Erro interno' }, { status: 500, headers: jsonHeaders });
  }
});
