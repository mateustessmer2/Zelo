import { Link } from 'react-router-dom'

/** Versão da Política — suba ao alterar o texto. Usada no registro de aceite. */
export const VERSAO_PRIVACIDADE = '2026-07-30'

/**
 * Política de Privacidade.
 *
 * Pública, linkada do rodapé e do cadastro. Descreve o tratamento real de
 * dados do app — inclusive o que é dado sensível (selfie) e o que fica
 * armazenado.
 *
 * Cuidado ao editar: as afirmações aqui viram obrigação. Não prometa
 * exclusão automática, prazo de retenção ou anonimização que o sistema
 * ainda não executa sozinho.
 */
export default function Privacidade() {
  return (
    <main className="wrap fade-in doc" style={{ padding: '30px 0 60px', maxWidth: 720 }}>
      <h1>Política de Privacidade</h1>
      <p className="doc-data">Última atualização: 30 de julho de 2026</p>

      <p>
        Esta política explica quais dados o Zelo coleta, por que coleta, com
        quem compartilha e quais são os seus direitos. Está escrita em
        linguagem simples de propósito — se algo não ficar claro, escreva para
        nós.
      </p>

      <h2>1. Quem é o responsável pelos seus dados</h2>
      <p>
        O Zelo é o controlador dos dados pessoais tratados na plataforma.
        Contato do encarregado (DPO):{' '}
        <a href="mailto:privacidade@zeloemcasa.com.br">privacidade@zeloemcasa.com.br</a>
      </p>

      <h2>2. Quais dados coletamos</h2>

      <h3>De todos os usuários</h3>
      <ul>
        <li>Nome, e-mail e senha (a senha é armazenada de forma criptografada);</li>
        <li>Cidade e bairro;</li>
        <li>Telefone e WhatsApp, quando informados;</li>
        <li>Registro do aceite dos termos: data, hora e versão do documento;</li>
        <li>Dados de uso da plataforma: contratações, mensagens e avaliações.</li>
      </ul>

      <h3>De profissionais, adicionalmente</h3>
      <ul>
        <li>Foto de perfil, descrição, experiência e valores cobrados;</li>
        <li>Categorias, serviços e bairros atendidos;</li>
        <li>Disponibilidade de agenda;</li>
        <li>Contatos de referência de trabalhos anteriores (nome e telefone de terceiros);</li>
        <li>
          <b>Documento de identidade e selfie</b>, quando enviados para
          conferência.
        </li>
      </ul>

      <h2>3. Dados sensíveis</h2>
      <p>
        A selfie enviada para conferência é um <b>dado biométrico</b>,
        classificado como dado pessoal sensível pelo art. 5º, II da LGPD. Ela é
        coletada com base no seu consentimento específico, dado no momento do
        envio, e usada exclusivamente para confirmar que o documento de
        identidade pertence a você.
      </p>
      <p>
        Documentos e selfies ficam em armazenamento privado, acessível apenas à
        equipe do Zelo responsável pela conferência. Nenhum cliente ou outro
        usuário tem acesso a esses arquivos — o que aparece no perfil é somente
        o selo indicando que a conferência foi feita.
      </p>

      <h2>4. Dados de terceiros informados por você</h2>
      <p>
        Ao cadastrar contatos de referência, o profissional informa nome e
        telefone de outras pessoas. Esses dados são usados exclusivamente para
        que a equipe do Zelo entre em contato e confirme a referência. Eles não
        aparecem em nenhum perfil público e não são compartilhados com clientes
        — o que os clientes veem é apenas o selo (bronze, prata ou ouro)
        indicando quantas referências foram confirmadas.
      </p>

      <h2>5. Para que usamos seus dados</h2>
      <ul>
        <li>Criar e manter sua conta;</li>
        <li>Conectar clientes e profissionais;</li>
        <li>Exibir perfis, avaliações e resultados de busca;</li>
        <li>Enviar comunicações sobre contratações e sobre a plataforma;</li>
        <li>Conferir identidade de profissionais que solicitam o selo;</li>
        <li>Prevenir fraudes e uso indevido;</li>
        <li>Cumprir obrigações legais.</li>
      </ul>

      <h2>6. Bases legais</h2>
      <ul>
        <li><b>Consentimento</b> (art. 7º, I): tratamento geral dos dados de cadastro e coleta de selfie;</li>
        <li><b>Execução de contrato</b> (art. 7º, V): funcionamento da plataforma para quem já é usuário;</li>
        <li><b>Obrigação legal</b> (art. 7º, II): guarda de registros exigida por lei;</li>
        <li><b>Legítimo interesse</b> (art. 7º, IX): prevenção a fraudes e segurança da plataforma.</li>
      </ul>

      <h2>7. Com quem compartilhamos</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos apenas com prestadores que
        viabilizam o funcionamento da plataforma, e somente no necessário:
      </p>
      <ul>
        <li><b>Supabase</b> — banco de dados, autenticação e armazenamento de arquivos;</li>
        <li><b>Netlify</b> — hospedagem do site;</li>
        <li><b>Resend</b> — envio de e-mails transacionais.</li>
      </ul>
      <p>
        Entre usuários, o compartilhamento é o mínimo necessário para a
        contratação acontecer: o cliente vê o perfil público do profissional e,
        ao solicitar um serviço, é direcionado ao WhatsApp informado por ele.
      </p>

      <h2>8. Por quanto tempo guardamos</h2>
      <p>
        Mantemos seus dados enquanto sua conta existir. Após o encerramento,
        podemos reter parte dos dados pelo prazo necessário ao cumprimento de
        obrigações legais ou ao exercício de direitos em processo.
      </p>
      <p>
        Registros de aceite dos termos são mantidos como prova de
        consentimento, conforme exigido pelo art. 8º, §2º da LGPD.
      </p>

      <h2>9. Seus direitos</h2>
      <p>A LGPD garante a você o direito de:</p>
      <ul>
        <li><b>Acessar</b> os dados que temos sobre você;</li>
        <li><b>Corrigir</b> dados incompletos, inexatos ou desatualizados;</li>
        <li><b>Solicitar exclusão</b> dos dados tratados com base em consentimento;</li>
        <li><b>Solicitar portabilidade</b> a outro fornecedor, quando aplicável;</li>
        <li><b>Revogar consentimentos</b> a qualquer momento;</li>
        <li><b>Ser informado</b> sobre com quem compartilhamos seus dados;</li>
        <li><b>Opor-se</b> a tratamentos feitos com base em legítimo interesse.</li>
      </ul>
      <p>
        A maioria desses pedidos pode ser feita direto pelo app, na área{' '}
        <b>Minha conta e privacidade</b> dentro do seu painel. Para os demais,
        escreva para{' '}
        <a href="mailto:privacidade@zeloemcasa.com.br">privacidade@zeloemcasa.com.br</a>.
      </p>

      <h2>10. Segurança</h2>
      <p>
        Usamos conexão criptografada (HTTPS), senhas armazenadas com hash,
        controle de acesso por linha no banco de dados e armazenamento privado
        para documentos sensíveis. Nenhum sistema é totalmente imune, mas
        tratamos segurança como prioridade.
      </p>

      <h2>11. Cookies</h2>
      <p>
        O Zelo usa apenas cookies essenciais, necessários para manter você
        conectado e para o funcionamento básico do site. Não usamos cookies de
        publicidade nem ferramentas de análise de comportamento. Se isso mudar,
        atualizaremos esta política e pediremos seu consentimento antes.
      </p>

      <h2>12. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta política. Mudanças relevantes serão comunicadas,
        e a data da última atualização fica sempre no topo desta página.
      </p>

      <h2>13. Contato</h2>
      <p>
        Dúvidas ou pedidos sobre seus dados:{' '}
        <a href="mailto:privacidade@zeloemcasa.com.br">privacidade@zeloemcasa.com.br</a>
      </p>
      <p>
        Você também pode reclamar à Autoridade Nacional de Proteção de Dados
        (ANPD).
      </p>

      <p style={{ marginTop: 32 }}>
        <Link to="/termos" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>
          Ver os Termos de Uso →
        </Link>
      </p>
    </main>
  )
}
