# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/b9df32be-964c-4804-ab96-85f22a9dbc26

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/b9df32be-964c-4804-ab96-85f22a9dbc26) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/b9df32be-964c-4804-ab96-85f22a9dbc26) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)


## Aplicativo iOS

Este repositório também está preparado para gerar um aplicativo iOS com Capacitor. O app usa o mesmo frontend compilado, o mesmo projeto Supabase, a mesma autenticação e as mesmas tabelas, funções RPC e buckets do aplicativo web. Não há uma cópia paralela do banco de dados.

### Pré-requisitos

Para abrir e assinar o aplicativo são necessários macOS, Xcode atualizado, CocoaPods e uma conta Apple Developer. O bundle identifier configurado é `br.com.grupoconexao.app`; ele deve ser registrado no Apple Developer e associado ao time correto no Xcode antes da distribuição.

### Variáveis de ambiente

Crie um arquivo `.env` a partir de `.env.example` e informe a URL e a chave pública do projeto Supabase. A chave pública (`anon`/publishable) pode ser usada no cliente; chaves secretas do Supabase nunca devem ser colocadas no aplicativo.

```sh
cp .env.example .env
npm install
npm run ios:prepare
npm run ios:open
```

O comando `ios:prepare` compila o Vite para `dist` e sincroniza os arquivos com o projeto nativo em `ios/`. O comando `ios:open` abre o workspace no Xcode. No Xcode, selecione o time de desenvolvimento, confirme o bundle identifier, configure o ícone e execute primeiro em um simulador ou iPhone conectado.

### Autenticação e redirecionamentos

O app continua usando `@supabase/supabase-js` e mantém a sessão persistida no armazenamento local do WebView. Para confirmação de e-mail e recuperação de senha, adicione no painel do Supabase os URLs usados pelo ambiente web e, se necessário, o URL nativo `capacitor://localhost/**` em **Authentication → URL Configuration → Redirect URLs**. O URL configurado no cadastro pode ser definido por `VITE_PUBLIC_WEB_URL`; se essa variável não existir, o aplicativo usa a origem atual.

### Teste e publicação

Antes de publicar, execute `npm run build`, `npm run ios:prepare` e `npm run cap:doctor`. No Xcode, valide os fluxos de login, cadastro, consulta de pontuação, dashboards por perfil, upload de imagem e logout em dispositivo real. Depois, configure a assinatura de distribuição, arquive o app e envie-o ao App Store Connect para o TestFlight e a revisão da Apple.

O projeto ainda pode ser desenvolvido normalmente no Lovable ou no repositório web. Sempre que o frontend ou os contratos do backend mudarem, execute novamente `npm run ios:prepare` para atualizar o bundle nativo antes de gerar um novo build.

## Aplicativo Android e notificações push

O projeto também inclui a plataforma Android em `android/`, usando o mesmo frontend, o mesmo Supabase e o plugin oficial `@capacitor/push-notifications`. O pacote Android usa o application ID `br.com.grupoconexao.app`.

### Preparar o Firebase

Crie ou use um projeto no [Firebase Console](https://console.firebase.google.com/), adicione um aplicativo Android com o package name `br.com.grupoconexao.app` e baixe o arquivo `google-services.json`. Para desenvolvimento local, coloque esse arquivo em `android/app/google-services.json`. Não publique esse arquivo em um repositório público se preferir mantê-lo privado; o workflow do GitHub pode recebê-lo via secret Base64.

No Android 13 ou superior, o app solicita a permissão de notificações depois que o usuário entra. O token FCM é salvo em `public.push_tokens` para o usuário autenticado. Ao tocar numa notificação que contenha `data.route` com uma rota interna iniciada por `/`, o app navega para essa tela.

### Migração e envio pelo Supabase

Aplique as migrações `20260826000000_add_push_tokens.sql` e `20260826000001_add_notifications.sql` no projeto Supabase. A Edge Function `send-push` busca os tokens do usuário e envia a mensagem ao Firebase Cloud Messaging. A service account do Firebase deve ser configurada somente como secret do Supabase com o nome `FIREBASE_SERVICE_ACCOUNT_JSON`; nunca coloque o JSON dentro do frontend.

Configure também `PUSH_WEBHOOK_SECRET` como secret da Edge Function. Depois de fazer o deploy da função com `supabase functions deploy send-push --no-verify-jwt`, crie no painel do Supabase um Database Webhook para `public.notifications` no evento `INSERT`, apontando para a função `send-push` e enviando o header `x-push-webhook-secret` com o mesmo segredo. O payload deve incluir `user_id`, `title`, `body` e, opcionalmente, `data`, por exemplo `{ "route": "/dashboard/arquiteto" }`.

### Build Android

```sh
cp .env.example .env
npm install
npm run android:prepare
npm run android:open
```

Para gerar um APK de teste no GitHub Actions, use o workflow `.github/workflows/android-build.yml`. Cadastre `FIREBASE_GOOGLE_SERVICES_JSON_BASE64` como GitHub Secret contendo o `google-services.json` convertido para Base64. O APK de debug estará disponível nos artifacts ao final do workflow. Para publicar na Google Play, ainda é necessário configurar um keystore de release e um workflow de assinatura separado; não use uma chave de debug para produção.

### Teste de notificações

Instale o APK em um aparelho Android com Google Play Services, entre com um usuário e permita notificações. Confirme que surgiu um registro em `public.push_tokens`. Insira uma linha em `public.notifications` para esse mesmo `user_id`; o webhook deverá chamar a Edge Function e a notificação deverá aparecer no aparelho. Para testar navegação, preencha `data` com uma rota existente, como `{ "route": "/dashboard/arquiteto" }`.
