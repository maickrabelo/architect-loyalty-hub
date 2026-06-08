# Plano: PWA instalável (Android e iOS)

## Objetivo
Tornar o app "Grupo Conexão" instalável na tela inicial de celulares Android e iPhone, sem precisar de Capacitor, Android Studio ou Xcode. O usuário acessa o site publicado pelo navegador e usa "Adicionar à tela inicial" — o app abre em tela cheia, com ícone próprio, como um app nativo.

> Observação: este é um PWA **somente instalável** (sem modo offline). Funciona online normalmente. Se depois você quiser que ele abra sem internet, é uma segunda etapa.

## O que será feito

1. **Manifesto do app** (`public/manifest.webmanifest`)
   - `name`: Grupo Conexão
   - `short_name`: Conexão
   - `display`: standalone (abre em tela cheia, sem barra do navegador)
   - `background_color` e `theme_color`: tons da marca (creme / mocha)
   - `start_url`: `/`
   - `icons`: 192x192 e 512x512 (normal e `maskable` para Android)

2. **Ícones do app** (em `public/`)
   - `icon-192.png`
   - `icon-512.png`
   - `icon-maskable-512.png` (área segura para Android adaptar a forma)
   - `apple-touch-icon.png` (180x180, usado pelo iOS na tela inicial)
   - Gerados a partir da identidade visual da marca (paleta creme/terracota/mocha, tipografia Cormorant).

3. **Tags no `index.html`**
   - `<link rel="manifest" href="/manifest.webmanifest">`
   - `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`
   - Manter `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style` e `apple-mobile-web-app-title` (já existem, só revisar valores).

## O que **não** será feito (proposital)
- Nenhum service worker, `vite-plugin-pwa` ou cache offline.
- Nenhuma mudança em rotas, autenticação, banco ou lógica do app.
- Sem push notifications (precisa de provedor externo; podemos fazer depois).

## Como o usuário vai instalar depois do deploy

**Android (Chrome):** abrir o site → menu ⋮ → "Instalar app" / "Adicionar à tela inicial".

**iPhone (Safari):** abrir o site → botão Compartilhar → "Adicionar à Tela de Início".

O app aparece com ícone próprio e abre em tela cheia, como um app nativo.

## Publicação
Depois de implementar, é preciso clicar em **Publish** no Lovable para o PWA ficar disponível no domínio público — instalação por navegador só funciona no site publicado, não no preview do editor.
