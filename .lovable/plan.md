# Plano: App Nativo com Capacitor

## Objetivo
Transformar o app React atual (Grupo Conexão — programa de fidelidade para arquitetos) em um app nativo instalável no iPhone e Android usando Capacitor.

---

## O que será feito

### 1. Instalar dependências do Capacitor
Adicionar ao projeto:
- `@capacitor/core` — core do Capacitor
- `@capacitor/cli` — ferramentas de CLI
- `@capacitor/ios` — suporte a iOS
- `@capacitor/android` — suporte a Android

### 2. Inicializar configuração Capacitor
Criar `capacitor.config.ts` na raiz do projeto com:
- **appID**: `app.lovable.ce0cb83984654192a01bcd54c8629744`
- **appName**: `architect-loyalty-hub`
- **server.url**: URL do preview do sandbox com `?forceHideBadge=true` (habilita hot-reload durante desenvolvimento)
- **server.cleartext**: `true` (permite conexão HTTP para dev)

### 3. Otimizar `index.html` para mobile
Adicionar meta tags específicas para app nativo:
- `viewport` ajustado (já existe, manter)
- `apple-mobile-web-app-capable` e `apple-mobile-web-app-status-bar-style`
- `theme-color` para Android
- Ícone e splashscreen mínimos

### 4. Configurar build para mobile
Ajustar `vite.config.ts` se necessário para garantir que o build funcione corretamente com Capacitor.

### 5. Adicionar plataformas nativas
Rodar `npx cap add ios` e `npx cap add android` para gerar os projetos nativos.

### 6. Atualizar scripts do package.json
Adicionar scripts úteis:
- `build:mobile`: build otimizado para Capacitor
- `sync:ios` / `sync:android`: sincronizar código com plataformas
- `open:ios` / `open:android`: abrir no Xcode / Android Studio

---

## Como o usuário usará depois

1. **Exportar o projeto para GitHub** (botão no Lovable)
2. **Git pull** no repositório local
3. **npm install** para instalar dependências
4. **npm run build** para gerar o build
5. **npx cap sync** para sincronizar o código nativo
6. **npx cap run ios** ou **npx cap run android** para rodar no emulador/dispositivo

> Para iOS: precisa de um Mac com Xcode instalado.  
> Para Android: precisa do Android Studio instalado.

---

## Resultado esperado
O projeto terá as pastas `ios/` e `android/` geradas pelo Capacitor, com configuração pronta para build e publicação nas lojas de apps (App Store e Google Play). O app manterá todas as funcionalidades atuais (autenticação, dashboards, pontos, etc.) rodando em um WebView nativo com acesso total aos recursos do celular.