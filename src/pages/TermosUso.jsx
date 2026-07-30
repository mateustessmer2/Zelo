import { Link } from 'react-router-dom'

/** Versão dos Termos — suba ao alterar o texto. Usada no registro de aceite. */
export const VERSAO_TERMOS_USO = '2026-07-30'

/**
 * Termos de Uso.
 *
 * Página pública (não exige login) — precisa ser acessível a quem ainda
 * está decidindo se cria conta, e é linkada do rodapé e do cadastro.
 *
 * O texto foi escrito com base no que o negócio definiu: o Zelo é
 * intermediador, não empregador nem prestador. Não é parecer jurídico —
 * antes do lançamento vale revisão por advogado, especialmente das
 * cláusulas de limitação de responsabilidade.
 */
export default function TermosUso() {
  return (
    <main className="wrap fade-in doc" style={{ padding: '30px 0 60px', maxWidth: 720 }}>
      <h1>Termos de Uso</h1>
      <p className="doc-data">Última atualização: 30 de julho de 2026</p>

      <h2>1. Quem somos</h2>
      <p>
        O Zelo é uma plataforma digital que conecta pessoas que precisam de
        serviços residenciais a profissionais autônomos que os oferecem —
        limpeza residencial, cuidado de crianças, cuidado de idosos e
        transporte particular, entre outros.
      </p>

      <h2>2. O que o Zelo faz — e o que não faz</h2>
      <p>
        O Zelo atua <b>exclusivamente como intermediador</b>. Nós aproximamos
        as partes e oferecemos as ferramentas para que se encontrem, conversem
        e combinem os detalhes entre si.
      </p>
      <p>O Zelo <b>não</b>:</p>
      <ul>
        <li>presta os serviços anunciados na plataforma;</li>
        <li>é empregador dos profissionais cadastrados;</li>
        <li>participa da negociação entre cliente e profissional;</li>
        <li>define, sugere ou tabela preços — cada profissional define os próprios valores;</li>
        <li>garante qualidade, pontualidade ou resultado dos serviços;</li>
        <li>recebe, intermedia ou processa pagamentos.</li>
      </ul>
      <p>
        A contratação é feita <b>diretamente entre cliente e profissional</b>,
        que definem entre si preço, escopo, data, forma de pagamento e demais
        condições. O Zelo não é parte desse acordo.
      </p>

      <h2>3. Responsabilidade</h2>
      <p>
        Como o Zelo não presta os serviços nem participa da relação
        contratual, não responde por danos, prejuízos, atrasos, perdas ou
        qualquer consequência decorrente da prestação dos serviços contratados
        por meio da plataforma.
      </p>
      <p>
        As informações publicadas nos perfis são fornecidas pelos próprios
        profissionais e são de responsabilidade exclusiva deles. Cabe a quem
        contrata avaliar as informações disponíveis, as avaliações de outros
        usuários e o que mais considerar relevante antes de decidir.
      </p>

      <h2>4. Conferência de documentos</h2>
      <p>
        Alguns perfis exibem um selo indicando que houve conferência
        documental pelo Zelo. Esse selo significa apenas que, <b>na data da
        análise</b>, os documentos apresentados correspondiam às informações
        do cadastro.
      </p>
      <p>
        O selo <b>não</b> é garantia permanente de idoneidade, conduta,
        qualificação técnica ou comportamento futuro do profissional, nem
        atesta ausência de antecedentes criminais, salvo quando expressamente
        indicado no próprio perfil.
      </p>

      <h2>5. Cadastro e uso da conta</h2>
      <p>
        Para usar a plataforma é necessário criar uma conta com informações
        verdadeiras, completas e atualizadas. Você é responsável por manter a
        confidencialidade da sua senha e por toda atividade realizada na sua
        conta.
      </p>
      <p>
        Profissionais declaram, ao se cadastrar, estar legalmente aptos a
        exercer as atividades que anunciam e que as informações prestadas são
        verdadeiras.
      </p>

      <h2>6. Avaliações</h2>
      <p>
        Após um serviço concluído, cliente e profissional podem avaliar um ao
        outro. As avaliações são publicadas de forma anônima e simultânea —
        nenhuma delas aparece antes que ambas as partes tenham avaliado ou que
        o prazo se encerre.
      </p>
      <p>
        O Zelo não edita nem remove avaliações a pedido, salvo em casos de
        conteúdo ilegal, ofensivo ou que viole estes Termos.
      </p>

      <h2>7. Condutas proibidas</h2>
      <ul>
        <li>Fornecer informações falsas no cadastro ou no perfil;</li>
        <li>Usar a plataforma para fins ilícitos;</li>
        <li>Assediar, ameaçar ou discriminar outros usuários;</li>
        <li>Criar contas em nome de terceiros sem autorização;</li>
        <li>Tentar burlar os mecanismos de verificação ou avaliação.</li>
      </ul>
      <p>
        Contas que descumprirem estes Termos podem ser suspensas ou
        encerradas.
      </p>

      <h2>8. Encerramento da conta</h2>
      <p>
        Você pode encerrar sua conta a qualquer momento pela área de
        configurações do seu painel. Alguns dados podem ser mantidos quando
        houver obrigação legal de guarda ou necessidade de exercício de
        direitos em processo.
      </p>

      <h2>9. Alterações nestes Termos</h2>
      <p>
        Estes Termos podem ser atualizados. Quando houver mudança relevante,
        avisaremos e poderemos solicitar novo aceite antes de você continuar
        usando a plataforma. A data da última atualização fica sempre no topo
        desta página.
      </p>

      <h2>10. Legislação aplicável</h2>
      <p>
        Estes Termos são regidos pela legislação brasileira, especialmente a
        Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o Marco Civil da
        Internet (Lei nº 12.965/2014), o Código Civil e, quando aplicável, o
        Código de Defesa do Consumidor.
      </p>

      <h2>11. Contato</h2>
      <p>
        Dúvidas sobre estes Termos:{' '}
        <a href="mailto:contato@zeloemcasa.com.br">contato@zeloemcasa.com.br</a>
      </p>

      <p style={{ marginTop: 32 }}>
        <Link to="/privacidade" style={{ color: 'var(--sage-700)', fontWeight: 600 }}>
          Ver a Política de Privacidade →
        </Link>
      </p>
    </main>
  )
}
