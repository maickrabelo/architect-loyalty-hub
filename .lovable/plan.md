# Stories Conexão e banners do profissional

## Objetivo
- Manter 5 segundos como duração padrão dos stories.
- Permitir um botão de ação opcional em cada story, com nome e link configuráveis.
- Renomear “Novas conexões” para “Stories Conexão” em todos os painéis.
- Criar um carrossel de banners abaixo das medalhas e dos pontos no painel do profissional.
- Permitir que somente o gestor publique e remova banners, enviando versões separadas para desktop e celular e um link opcional.

## Implementação
1. Ampliar os stories existentes com os campos opcionais de texto e link do botão.
2. Exibir o botão sobre o story, sem interferir na passagem automática, pausa ou navegação.
3. Atualizar títulos e abas para “Stories Conexão”, preservando o limite de três stories por empresa.
4. Criar a estrutura segura de banners no banco e no armazenamento, com leitura para usuários autenticados e gestão exclusiva do gestor.
5. Criar a área de gerenciamento de banners no painel do gestor, exigindo as duas imagens antes da publicação.
6. Criar o carrossel no painel do profissional, usando automaticamente a imagem adequada à tela e abrindo o link ao clicar.
7. Validar os fluxos em telas desktop e mobile, além das permissões e da compilação.

## Detalhes técnicos
- Stories continuam verticais em 1080×1920 e com duração inicial de 5 segundos.
- Links serão validados como endereços `http` ou `https` antes de salvar e abrirão em nova aba.
- Banners terão ordem de exibição, estado ativo e imagens privadas acessadas por links temporários.
- A alteração do banco será aditiva, sem remover dados atuais.
