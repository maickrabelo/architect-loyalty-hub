# Redesign completo do FideliArq — identidade "Conexão Editorial"

Vamos abandonar o tema dark + dourado atual e adotar uma identidade **clara, editorial, sofisticada** inspirada na peça do Grupo Conexão / Fasano Boa Vista que você enviou. A nova linguagem é leve como uma revista de arquitetura premium.

## 1. Nova paleta (tokens HSL em `index.css`)

```text
Background     #F4EFE8  cream off-white      (fundo geral)
Surface        #FBF8F3  papel quase branco   (cards)
Foreground     #2B2622  marrom muito escuro  (texto principal)
Muted          #8A7F77  taupe                (texto secundário)
Primary        #C99B7E  terracota rosado     (CTAs, números, destaques)
Primary deep   #8B5E48  mocha               (badges circulares, hovers)
Accent line    #E8D9CC  bege claro           (linhas, divisores, padrões)
Border         #E5DDD2
Destructive    #B5483A  terracota intensa
Ring           #C99B7E
```

Gradientes:
- `--gradient-warm`: `#F4EFE8 → #FBF8F3` (fundo de página)
- `--gradient-terracotta`: `#C99B7E → #B5836A` (CTAs e badges)
- `--gradient-mocha`: `#8B5E48 → #6F4838` (selo "X PONTOS")

Sombras suaves: `--shadow-soft: 0 12px 40px rgba(43,38,34,0.08)`, `--shadow-ring: 0 0 0 1px rgba(139,94,72,0.15)`.

## 2. Tipografia

- **Display (títulos hero, nomes de prêmios)**: `Cormorant Garamond` (serif elegante, peso 500/600) — substitui o sans bold dourado.
- **Sans body**: `Inter` ou `Manrope` para texto corrido.
- **Labels/etiquetas**: `Inter` em UPPERCASE com `letter-spacing: 0.25em` (tipo "SUGESTÃO DE DESTINO", "CAMPANHA CONEXÃO 2026").
- Tamanhos hero gigantes (`text-7xl/8xl`) com line-height apertada para feel editorial.

## 3. Elementos gráficos recorrentes (motivos visuais)

São o "DNA" que aparece em todas as páginas:

1. **Padrão de ondas orgânicas** (linhas finas terracota) usado como faixa decorativa no topo/rodapé de seções — recriado em SVG inline reutilizável (`<WavePattern />`).
2. **Selo circular de pontos**: dois círculos concêntricos finos com pequeno "ponto satélite" e número grande dentro, fundo mocha. Vira um componente `<PointsBadge value={800} />` usado em prêmios, dashboards e cards.
3. **Imagens com máscara orgânica**: fotos com cantos arredondados grandes (`rounded-[2rem]`) e curva sutil na base via SVG clip-path — sem retângulos rígidos.
4. **Divisores com linha + ondas**: separam seções com uma linha fina + mini-padrão de ondas centralizado.
5. **Labels-tag**: pequenos textos em caps espaçados acima dos títulos (substituem badges coloridos).

## 4. Aplicação por página

### Home (`/`)
- Fundo cream com faixa de ondas no topo.
- Hero: label "PROGRAMA DE FIDELIDADE" + título serif gigante "FideliArq" + subtítulo + dois CTAs (terracota sólido / outline mocha).
- Seção features: 6 cards em fundo `surface` com ícone fino dentro de círculo terracota outline (não mais quadrado preenchido).
- CTA final: card largo cream com selo circular ao lado.

### Sobre (`/sobre`)
- Mesma faixa de ondas. Cards de níveis (Bronze/Prata/Ouro/Platinum) ficam horizontais com selo circular de pontos à esquerda e descrição editorial à direita.
- Bloco de benefícios em grid 2x2 com iconografia fina.

### Login & Cadastro
- Card central em `surface` com sombra suave, sem backdrop-blur.
- Logo redesenhado: marca tipográfica serif + circulinho com ponto-satélite (mesma linguagem do selo de pontos).
- Inputs com borda fina, fundo `surface`, foco terracota.
- Medidor de força de senha em escala de terracota (clara → escura).

### Dashboard do Arquiteto
- Header: nome em serif grande + label "DASHBOARD DO ARQUITETO" em caps espaçados.
- Cards de stats: fundo cream, números em serif gigante terracota, label fino em caps embaixo.
- "Próxima Conquista": barra de progresso terracota fina + selo circular do próximo prêmio à direita.
- "Destinos Premium" (`DestinoCard` redesign): foto com máscara orgânica no topo, nome do destino em serif, label "SUGESTÃO DE DESTINO", selo circular de pontos sobreposto no canto inferior direito (igualzinho à referência), faixa de ondas no rodapé do card.
- Pontuação por empresa: lista horizontal com linha divisória fina entre itens.

### Pontuação Detalhada
- Tabela com linhas espaçadas, sem zebra, separadores finos cor `border`.
- Cards de resumo trocam gradient gold por número serif gigante terracota.
- Filtros de data com botões outline mocha.

### Dashboard da Empresa
- "Lançar Venda" em card terracota suave com inputs claros.
- Lista de arquitetos: avatar circular + nome serif + valor em terracota.
- Gráficos de investimento usam paleta terracota/mocha/bege (recharts).

### Dashboard do Gestor
- Tabs com underline terracota (sem fundo).
- Tabela de ranking: número de posição em serif gigante muted, nome em sans semibold.
- Cards de premiação no admin reusam o mesmo `DestinoCard` editorial + ações editar/excluir como ícones discretos.
- Relatórios (recharts) repintados na nova paleta + `BarChart` com barras terracota arredondadas.

### Navbar & Footer
- Navbar: fundo cream com transparência, logo nova, links em caps espaçados, CTA terracota.
- Footer: faixa de ondas + texto em caps + selo circular pequeno.

## 5. Componentes a criar/atualizar

Novos:
- `src/components/brand/WavePattern.tsx` — SVG do padrão de ondas (variantes horizontal e vertical).
- `src/components/brand/PointsBadge.tsx` — selo circular com número.
- `src/components/brand/SectionLabel.tsx` — label uppercase espaçado.
- `src/components/brand/Logo.tsx` — nova marca FideliArq.

Atualizar:
- `src/index.css` — substituir todos os tokens HSL e gradientes.
- `tailwind.config.ts` — atualizar `backgroundImage`, adicionar fontes (`fontFamily.serif: ['Cormorant Garamond', 'serif']`, `fontFamily.sans: ['Inter', 'sans-serif']`).
- `index.html` — importar Google Fonts (Cormorant Garamond + Inter), atualizar `<title>` e meta description.
- `src/components/ui/button.tsx` — variantes `premium` e `hero` repintadas (terracota sólido / outline mocha).
- `src/components/DestinoCard.tsx` — refatorar visual completo conforme referência.
- `src/components/Navbar.tsx` e `Footer.tsx` — nova estética.
- Todas as páginas (`Home`, `About`, `Login`, `Cadastro`, 4 dashboards) — substituir classes `bg-gradient-dark`, `bg-card/50 backdrop-blur`, `bg-gradient-gold bg-clip-text` etc. pelos novos tokens, aplicar serifa nos títulos, adicionar `<SectionLabel>` e ondas onde fizer sentido.

## 6. Regras de execução

- Funcionalidade, rotas, dados, RLS, edge function e auth ficam intocados — só visual.
- Nada de cor literal nos componentes; tudo via tokens.
- Manter responsividade existente (mobile mantém serif em escala menor mas legível).
- QA visual: revisar cada uma das 7 telas após a mudança.

## 7. Resultado esperado

Sai do "casino dourado" e entra um app que parece um catálogo de hospitalidade premium — leve, atemporal, com a mesma linguagem da peça Grupo Conexão. Mesma estrutura, alma totalmente nova.