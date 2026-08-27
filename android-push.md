# Android com notificações push

O app Android usa o mesmo frontend, autenticação, banco e storage do projeto web/iOS. A entrega push usa **Firebase Cloud Messaging (FCM)** no dispositivo, enquanto os tokens ficam na tabela `public.push_tokens` do Supabase e o envio é feito por uma Edge Function. O token nunca é enviado para o frontend administrativo nem armazenado em código.

> O app solicita a permissão `POST_NOTIFICATIONS` no Android 13 ou superior depois que o usuário entra. O usuário pode negar a permissão e continuar usando o app; nesse caso, o restante do aplicativo continua funcionando, mas as notificações não serão exibidas.

## 1. Criar o app Android no Firebase

Abra o [Firebase Console](https://console.firebase.google.com/) e crie um projeto ou selecione um projeto existente. Em **Project settings → Your apps**, clique no ícone do Android e registre o aplicativo com:

| Campo | Valor |
|---|---|
| Android package name | `br.com.grupoconexao.app` |
| App nickname | `Grupo Conexão Android` |
| SHA-1 | Opcional para o primeiro fluxo FCM; necessário para recursos Google que exigem assinatura |

Baixe o arquivo `google-services.json`. Para desenvolvimento local, coloque-o em `android/app/google-services.json`. O `.gitignore` já impede que esse arquivo seja versionado.

O FCM exige que o aplicativo Android esteja configurado com o package name correspondente ao `appId` do Capacitor. O projeto já aplica o plugin Google Services automaticamente quando esse arquivo está presente e o plugin Capacitor Push já adiciona a integração Firebase ao projeto Android. Consulte a documentação oficial do [Capacitor com Firebase](https://capacitorjs.com/docs/guides/push-notifications-firebase) e do [Firebase Cloud Messaging para Android](https://firebase.google.com/docs/cloud-messaging/android/get-started) [1] [2].

## 2. Configurar o build no GitHub Actions

Para o workflow `.github/workflows/android-build.yml`, converta o arquivo do Firebase para Base64. No Linux, WSL ou Git Bash:

```bash
base64 -w 0 google-services.json > google-services.json.base64
```

No GitHub, abra **Settings → Secrets and variables → Actions → Secrets → New repository secret** e crie:

```text
FIREBASE_GOOGLE_SERVICES_JSON_BASE64
```

Cole todo o conteúdo de `google-services.json.base64`. O workflow cria o arquivo somente durante o build e gera um APK de debug como artifact. O arquivo Base64, o JSON original e qualquer chave privada devem permanecer fora do repositório.

As variáveis do Supabase já usadas pelo workflow Android devem continuar configuradas: `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_PUBLIC_WEB_URL` e o secret `VITE_SUPABASE_PUBLISHABLE_KEY`.

## 3. Aplicar o schema do Supabase

Aplique as migrações a seguir no projeto Supabase na ordem dos nomes dos arquivos:

```text
supabase/migrations/20260826000000_add_push_tokens.sql
supabase/migrations/20260826000001_add_notifications.sql
```

Você pode usar o Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Ou copie o conteúdo das duas migrações para o SQL Editor do Supabase e execute cada uma na sequência. A tabela `push_tokens` possui RLS para que cada usuário só possa registrar e consultar os próprios tokens. A tabela `notifications` permite ao usuário ler as próprias notificações e marcá-las como lidas; os inserts de produção devem ser feitos por rotinas administrativas ou funções autorizadas.

## 4. Configurar o envio no backend

Na conta Firebase, abra **Project settings → Service accounts → Generate new private key**. Baixe o JSON da service account e guarde-o em local seguro. No Supabase, configure os secrets da Edge Function:

```text
FIREBASE_SERVICE_ACCOUNT_JSON = conteúdo completo do JSON da service account
PUSH_WEBHOOK_SECRET = uma senha aleatória longa
```

Não coloque o JSON dentro de `supabase/functions`, no GitHub ou no frontend. O escopo usado pela função é apenas `https://www.googleapis.com/auth/firebase.messaging`.

Faça o deploy da função:

```bash
npx supabase functions deploy send-push --no-verify-jwt
```

A função está em `supabase/functions/send-push/index.ts`. Ela valida o header `x-push-webhook-secret`, busca os tokens do usuário no Supabase, envia a mensagem pela API HTTP v1 do FCM e remove tokens que o Firebase indicar como inválidos.

## 5. Criar o Database Webhook

No Supabase, abra **Database → Webhooks** e crie um webhook para:

| Configuração | Valor |
|---|---|
| Tabela | `public.notifications` |
| Evento | `INSERT` |
| Método | `POST` |
| Destino | Edge Function `send-push` |
| Header | `x-push-webhook-secret: mesmo segredo configurado acima` |
| Content-Type | `application/json` |

A função recebe o registro inserido pela tabela. O campo `data` pode conter uma rota interna, por exemplo:

```json
{"route":"/dashboard/arquiteto"}
```

## 6. Testar

1. Execute o workflow **Actions → Android build → Run workflow**.
2. Baixe o artifact `grupo-conexao-debug-apk` e instale-o em um aparelho Android com Google Play Services.
3. Entre com um usuário e permita notificações quando o sistema solicitar.
4. No Supabase, confirme que existe uma linha em `public.push_tokens` para o usuário.
5. Insira uma notificação de teste no SQL Editor, usando o UUID real do usuário:

```sql
insert into public.notifications (user_id, title, body, data)
values (
  'UUID_DO_USUARIO',
  'Teste Grupo Conexão',
  'Sua notificação push está funcionando.',
  '{"route":"/"}'::jsonb
);
```

A notificação deve aparecer no aparelho. Com o app aberto, o evento é recebido pela aplicação; com o app em segundo plano, o Android exibe a notificação; ao tocar nela, a rota informada em `data.route` é aberta quando for uma rota interna válida.

## 7. Publicação na Google Play

O workflow incluído gera APK de debug para teste. Para publicação, será necessário criar um keystore de release, armazenar o keystore e suas senhas como secrets do GitHub e adicionar um workflow de Android App Bundle (`.aab`) assinado. Não reutilize a chave de debug em produção.

## Referências

[1] [Capacitor — Using Push Notifications with Firebase](https://capacitorjs.com/docs/guides/push-notifications-firebase)

[2] [Firebase — Get started with Firebase Cloud Messaging in Android apps](https://firebase.google.com/docs/cloud-messaging/android/get-started)

[3] [Supabase — Sending Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications)
