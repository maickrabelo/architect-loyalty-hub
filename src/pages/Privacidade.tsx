import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SectionLabel } from "@/components/brand/SectionLabel";

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-display text-2xl md:text-3xl text-foreground mb-3">{titulo}</h2>
    <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-3xl mx-auto">
          <SectionLabel className="mb-4">Transparência</SectionLabel>
          <h1 className="text-display text-4xl md:text-6xl text-foreground mb-4">
            Política de Privacidade
          </h1>
          <p className="text-muted-foreground mb-12">
            Última atualização: 19 de setembro de 2026. Este documento explica como o Grupo Conexão
            trata os dados pessoais dos participantes do programa de relacionamento, conforme a Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          </p>

          <Bloco titulo="1. Quem é o controlador dos dados">
            <p>
              O Grupo Conexão é o controlador dos dados pessoais tratados nesta plataforma, sendo
              responsável por decidir como e por que eles são utilizados. As empresas parceiras
              (lojistas) atuam como controladoras dos dados de vendas que lançam no programa.
            </p>
            <p>
              Contato do encarregado de dados (DPO): <strong>privacidade@grupoconexao.com.br</strong>
            </p>
          </Bloco>

          <Bloco titulo="2. Quais dados coletamos">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Cadastro:</strong> nome, CPF ou CNPJ, e-mail, telefone/celular, data de
                nascimento, profissão, endereço e foto de perfil (quando enviada).
              </li>
              <li>
                <strong>Escritórios:</strong> nome, telefone e data de nascimento dos sócios e
                membros indicados pelo titular responsável.
              </li>
              <li>
                <strong>Programa:</strong> vendas informadas pelas empresas parceiras, pontuação,
                premiações, faixas atingidas e histórico de participação.
              </li>
              <li>
                <strong>Clientes finais:</strong> nome e telefone informados no lançamento de uma
                venda, usados apenas para conferência e auditoria da pontuação.
              </li>
              <li>
                <strong>Técnicos:</strong> dados de acesso e autenticação, registros de uso e, no
                aplicativo, identificador do dispositivo para envio de notificações.
              </li>
            </ul>
          </Bloco>

          <Bloco titulo="3. Por que tratamos esses dados (finalidades e bases legais)">
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Execução do programa</strong> — cadastro, autenticação, apuração de pontos,
                ranking e entrega de premiações. Base legal: execução de contrato (art. 7º, V).
              </li>
              <li>
                <strong>Gestão financeira</strong> — faturamento das empresas parceiras, rateio e
                controle de premiações. Base legal: execução de contrato e obrigação legal.
              </li>
              <li>
                <strong>Segurança</strong> — prevenção a fraudes e proteção das contas. Base legal:
                legítimo interesse (art. 7º, IX).
              </li>
              <li>
                <strong>Comunicações e notificações</strong> — avisos sobre pontuação, campanhas e
                novidades. Base legal: consentimento, revogável a qualquer momento.
              </li>
              <li>
                <strong>Obrigações fiscais e legais</strong> — guarda de registros exigidos por lei.
              </li>
            </ul>
          </Bloco>

          <Bloco titulo="4. Com quem compartilhamos">
            <p>
              Compartilhamos dados apenas com: empresas parceiras do programa (limitado ao que é
              necessário para validar vendas e pontuação); fornecedores de tecnologia que hospedam a
              plataforma e enviam notificações, na condição de operadores; agências de viagem e
              parceiros responsáveis pela entrega das premiações escolhidas; e autoridades públicas,
              quando houver obrigação legal. Não vendemos dados pessoais.
            </p>
            <p>
              Relatórios gerenciais e comparativos são apresentados de forma agregada ou anonimizada
              sempre que a identificação do titular não for necessária.
            </p>
          </Bloco>

          <Bloco titulo="5. Por quanto tempo guardamos">
            <p>
              Os dados são mantidos enquanto durar a participação no programa e, após o
              encerramento, pelo prazo necessário ao cumprimento de obrigações legais, fiscais e à
              defesa em eventuais processos. Depois disso, são eliminados ou anonimizados.
            </p>
          </Bloco>

          <Bloco titulo="6. Seus direitos como titular">
            <p>A LGPD garante a você o direito de:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>confirmar a existência de tratamento e acessar seus dados;</li>
              <li>corrigir dados incompletos, inexatos ou desatualizados;</li>
              <li>solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
              <li>solicitar a portabilidade dos dados a outro fornecedor;</li>
              <li>revogar o consentimento e solicitar a exclusão da conta;</li>
              <li>opor-se a tratamentos realizados com base em legítimo interesse;</li>
              <li>obter informação sobre com quem compartilhamos seus dados.</li>
            </ul>
            <p>
              Para exercer qualquer um deles, escreva para{" "}
              <strong>privacidade@grupoconexao.com.br</strong>. Respondemos em até 15 dias.
            </p>
          </Bloco>

          <Bloco titulo="7. Segurança da informação">
            <p>
              Utilizamos criptografia em trânsito, controle de acesso por perfil (profissional,
              empresa, gestor e financeiro), regras de permissão no banco de dados e exigência de
              troca de senha no primeiro acesso. Cada participante enxerga apenas os dados
              relacionados à sua própria participação.
            </p>
            <p>
              Em caso de incidente de segurança com risco relevante, comunicaremos os titulares
              afetados e a Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </Bloco>

          <Bloco titulo="8. Cookies e tecnologias semelhantes">
            <p>
              Usamos armazenamento local do navegador estritamente necessário para manter você
              conectado e lembrar suas preferências. Não utilizamos cookies de publicidade. Cookies
              essenciais não podem ser desativados sem inviabilizar o acesso à plataforma.
            </p>
          </Bloco>

          <Bloco titulo="9. Dados de terceiros informados por você">
            <p>
              Ao informar dados de sócios, membros do escritório ou clientes finais, você declara ter
              autorização para isso e se compromete a informá-los sobre esta Política. Utilizamos
              esses dados apenas para as finalidades descritas aqui.
            </p>
          </Bloco>

          <Bloco titulo="10. Crianças e adolescentes">
            <p>
              A plataforma é destinada a profissionais maiores de 18 anos. Não coletamos
              intencionalmente dados de menores de idade.
            </p>
          </Bloco>

          <Bloco titulo="11. Alterações desta Política">
            <p>
              Podemos atualizar este documento para refletir mudanças legais ou no programa. A data
              de atualização no topo da página sempre indicará a versão vigente e mudanças
              relevantes serão comunicadas na plataforma.
            </p>
          </Bloco>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacidade;
