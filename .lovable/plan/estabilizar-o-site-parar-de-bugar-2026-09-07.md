# Estabilizar o site (parar de "bugar")

## O que eu verifiquei agora

- O site está no ar neste momento: a página inicial abre completa, sem erros de JavaScript e sem requisições falhando.
- No registro do servidor aparece, exatamente no horário em que você reclamou: `.env changed, restarting server...` seguido de `server restarted`. Ou seja, o ambiente reescreveu o arquivo de configuração e o servidor reiniciou sozinho.
- Durante esse reinício a página fica em branco/travada até o servidor voltar. Foi o mesmo padrão das duas vezes anteriores.
- Não encontrei erro de código nem falta de memória (32 GB livres, cache normal).

Conclusão: não é um bug do seu aplicativo, é o servidor de pré-visualização reiniciando e a página ficando parada em branco em vez de se recuperar sozinha.

## O que vou fazer para resolver de vez

1. **Recuperação automática da pré-visualização**: quando a conexão com o servidor cair (reinício), a página passa a tentar recarregar sozinha em poucos segundos, em vez de ficar branca esperando você apertar F5.
2. **Reduzir os reinícios**: pré-declarar as bibliotecas pesadas usadas pelo app (gráficos, animações, banco de dados, formulários) para o servidor não precisar reprocessá-las no meio do uso — hoje isso provoca recargas inesperadas.
3. **Separar o código de celular do site**: as partes que só funcionam no aplicativo Android/iOS (notificações) passam a ser carregadas só quando o app roda no celular, nunca no navegador. Isso elimina uma fonte de travamento na abertura.
4. **Verificação final**: abrir a página inicial, o login e um painel em um navegador de teste, forçar um reinício do servidor e confirmar que a tela volta sozinha.

## Detalhes técnicos

- `vite.config.ts`: adicionar `optimizeDeps.include` (recharts, framer-motion, @supabase/supabase-js, react-hook-form, date-fns, embla-carousel-react) e `optimizeDeps.exclude` para `@capacitor/*`; manter `server.hmr` padrão.
- `src/main.tsx` (ou um pequeno módulo novo): listener de `vite:ws:disconnect` / erro de HMR com `location.reload()` em backoff curto, ativo apenas em `import.meta.env.DEV`.
- `src/services/pushNotifications.ts`: trocar os imports estáticos de `@capacitor/push-notifications` por `await import(...)` após o teste `Capacitor.isNativePlatform()`.
- Sem mudanças no banco de dados, nas regras de negócio ou no visual.
