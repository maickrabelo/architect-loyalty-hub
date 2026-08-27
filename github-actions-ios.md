# Build iOS pelo GitHub Actions, sem Mac local

Este projeto já inclui o workflow `.github/workflows/ios-testflight.yml`. Ele usa um runner macOS hospedado pelo GitHub, compila o frontend, sincroniza o Capacitor, assina o aplicativo e envia o IPA ao TestFlight.

> O workflow não cria uma conta Apple nem contorna a assinatura. Para distribuir um app iOS pelo TestFlight, você precisa de uma conta no Apple Developer Program e acesso ao App Store Connect.

## 1. Criar o registro do app na Apple

Entre no [App Store Connect](https://appstoreconnect.apple.com/), crie um novo app iOS e use o bundle ID `br.com.grupoconexao.app`. Se esse identificador já estiver ocupado por outra equipe, altere o `appId` em `capacitor.config.ts` e no projeto iOS para um identificador único.

No portal [Apple Developer — Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list), registre o mesmo Bundle ID. Crie ou confirme um certificado de distribuição para App Store e um provisioning profile do tipo **App Store** para esse Bundle ID.

## 2. Criar a chave da API do App Store Connect

No App Store Connect, abra **Users and Access → Integrations → App Store Connect API**. Crie uma chave com permissão **App Manager**, anote o **Issuer ID** e o **Key ID** e baixe o arquivo `AuthKey_XXXXX.p8`. A Apple mostra o arquivo privado apenas no momento da criação; guarde-o em local seguro.

No GitHub, abra o repositório em **Settings → Secrets and variables → Actions**. Em **Variables**, crie:

| Nome | Valor |
|---|---|
| `APPSTORE_ISSUER_ID` | Issuer ID exibido no App Store Connect |
| `APPSTORE_API_KEY_ID` | Key ID da chave criada |
| `APPLE_TEAM_ID` | Team ID da sua conta Apple Developer |
| `IOS_PROVISIONING_PROFILE_NAME` | Nome exato do provisioning profile App Store |
| `VITE_SUPABASE_PROJECT_ID` | ID público do projeto Supabase |
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase |
| `VITE_PUBLIC_WEB_URL` | URL HTTPS publicada do app web |

Em **Secrets**, crie:

| Nome | Valor |
|---|---|
| `APPSTORE_API_PRIVATE_KEY` | Conteúdo completo do arquivo `AuthKey_XXXXX.p8` |
| `APPSTORE_CERTIFICATES_FILE_BASE64` | Certificado `.p12` convertido para Base64 |
| `APPSTORE_CERTIFICATES_PASSWORD` | Senha usada ao exportar o `.p12` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública/anon do Supabase |

Nunca coloque `service_role`, senha do banco ou qualquer chave secreta do Supabase no app. O workflow usa somente a chave pública do cliente.

## 3. Preparar o certificado `.p12`

O certificado precisa conter a identidade de distribuição e a chave privada. Em um Mac emprestado ou serviço de Mac na nuvem, exporte-o pelo Keychain Access como arquivo `.p12`. Em seguida, converta-o para Base64. Em macOS, o comando é:

```bash
base64 -i ios_distribution.p12 | pbcopy
```

Cole o resultado no secret `APPSTORE_CERTIFICATES_FILE_BASE64`. No Linux, use `base64 -w 0 ios_distribution.p12`.

O provisioning profile é baixado automaticamente pelo workflow usando a API do App Store Connect. O valor de `IOS_PROVISIONING_PROFILE_NAME` precisa ser exatamente o nome do profile, por exemplo `AppStore br.com.grupoconexao.app`.

## 4. Conferir o Supabase

No painel do Supabase, em **Authentication → URL Configuration → Redirect URLs**, adicione a URL HTTPS definida em `VITE_PUBLIC_WEB_URL` e, se for usar confirmação de e-mail no app nativo, também `capacitor://localhost/**`. O banco continua sendo o mesmo do Lovable; o app iOS apenas acessa as tabelas, funções e storage já existentes.

## 5. Executar o workflow

Faça commit e push do diretório `.github/workflows/ios-testflight.yml` para a branch `main`. Depois, no GitHub, abra a aba **Actions**, selecione **iOS build and TestFlight**, clique em **Run workflow** e confirme a branch `main`.

O workflow executará, nesta ordem, a instalação das dependências, a criação do `.env` temporário, o build Vite, a sincronização Capacitor, a importação do certificado, o download do profile, o archive Xcode, a exportação do IPA e o upload para o TestFlight.

## 6. Instalar no iPhone

Quando o processamento terminar no App Store Connect, abra o TestFlight no iPhone usando a mesma conta Apple ou aceite o convite de testador. O build aparecerá no app TestFlight após o processamento da Apple. Instale-o e valide login, cadastro, dashboards por perfil, pontuação, upload de imagem, logout e persistência da sessão.

## Problemas comuns

Se aparecer `No profiles for ... were found`, confira o Bundle ID, o nome exato do profile, o Team ID e se o profile é do tipo App Store. Se aparecer erro de certificado, gere novamente o `.p12` contendo a chave privada e confira a senha do secret. Se o build abrir mas não acessar os dados, confira as variáveis `VITE_SUPABASE_*` e as políticas RLS do Supabase.

Se o upload concluir, mas o app não aparecer imediatamente no TestFlight, aguarde o processamento do build no App Store Connect. O workflow usa `wait-for-processing: false`, portanto o job pode terminar antes de a Apple concluir essa etapa.

## Referências oficiais

[GitHub — Installing an Apple certificate on macOS runners](https://docs.github.com/actions/use-cases-and-examples/deploying/installing-an-apple-certificate-on-macos-runners-for-xcode-development)

[GitHub — GitHub-hosted runners](https://docs.github.com/actions/using-github-hosted-runners/about-github-hosted-runners)

[Apple — Distributing your app for beta testing and releases](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)

[Apple — TestFlight](https://developer.apple.com/testflight/)
