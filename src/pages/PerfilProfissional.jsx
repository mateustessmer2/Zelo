import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { obterProfissional, obterTrustScore, criarBooking, obterWhatsappParaContratacao, contarReferenciasAprovadas, solicitarEnvioReferencia } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import TrustScore from '../components/TrustScore'
import Avaliacoes from '../components/Avaliacoes'
import SeloReferencias from '../components/SeloReferencias'
import AvisoIntermediacao from '../components/AvisoIntermediacao'
import SeloVerificacao from '../components/SeloVerificacao'
import DisclaimerReferencia from '../components/DisclaimerReferencia'
import SeloAntecedentes from '../components/SeloAntecedentes'
import Avatar from '../components/Avatar'

export default function PerfilProfissional() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { sessao, perfil } = useAuth()

  // Herda o que a pessoa já respondeu na busca, em vez de perguntar de novo
  const bairroBusca = params.get('bairro') || null
  const dataBusca = params.get('data') || null
  const turnoBusca = params.get('turno') || 'manha'

  const [prof, setProf] = useState(null)
  const [score, setScore] = useState(null)
  const [erro, setErro] = useState(null)
  const [contratando, setContratando] = useState(false)
  const [qtdReferencias, setQtdReferencias] = useState(0)
  const temReferencia = qtdReferencias > 0
  const [disclaimerAberto, setDisclaimerAberto] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([
      obterProfissional(id),
      obterTrustScore(id, 'cliente_avalia_prof'),
      // Só a CONTAGEM — nunca nome/telefone chega ao cliente antes de
      // contratar e aceitar o disclaimer. Ver DisclaimerReferencia.jsx.
      contarReferenciasAprovadas(id).catch(() => 0)
    ])
      .then(([p, s, qtdRef]) => {
        if (!ativo) return
        setProf(p); setScore(s); setQtdReferencias(Number(qtdRef) || 0)
      })
      .catch(() => ativo && setErro('Perfil não encontrado.'))
    return () => { ativo = false }
  }, [id])

  // O clique no botão abre o disclaimer quando há referência a divulgar;
  // sem referência, contrata direto — não faz sentido mostrar uma barreira
  // legal sobre um dado que não existe.
  function aoClicarContratar() {
    if (!sessao) return navigate('/entrar')
    if (temReferencia) {
      setDisclaimerAberto(true)
      return
    }
    contratar(null)
  }

  async function contratar(versaoDisclaimer) {
    if (!sessao) return navigate('/entrar')
    setContratando(true)
    try {
      const categoriaId = prof.profissional_categorias?.[0]?.categorias?.id
      // Turno integral usa o valor da diária; meio turno usa o valor fixo
      // de 4h que a profissional definiu — não é mais um cálculo por hora.
      const valor = turnoBusca === 'integral'
        ? (prof.valor_diaria ?? prof.valor_meio_turno)
        : (prof.valor_meio_turno ?? prof.valor_diaria)

      const booking = await criarBooking({
        clienteId: perfil.id,
        profissionalId: prof.id,
        categoriaId,
        bairroId: bairroBusca ?? perfil.bairro_id,
        dataServico: dataBusca ?? new Date().toISOString().slice(0, 10),
        turno: turnoBusca,
        observacao: '',
        valorCombinado: valor
      })

      // WhatsApp abre na hora — decisão explícita de dar agilidade ao
      // primeiro contato, sem esperar a profissional aceitar o pedido no
      // painel dela. Se ela não tiver WhatsApp cadastrado, o cliente
      // segue para o painel normalmente; o pedido já existe de qualquer
      // forma, e ela vê lá.
      try {
        const whatsapp = await obterWhatsappParaContratacao(booking.id)
        if (whatsapp) {
          const digitos = whatsapp.replace(/\D/g, '')
          const numero = digitos.startsWith('55') ? digitos : `55${digitos}`
          const texto = encodeURIComponent(
            `Olá! Acabei de solicitar ${categorias || 'um serviço'} pelo Zelo para ${
              dataBusca ? new Date(`${dataBusca}T12:00:00`).toLocaleDateString('pt-BR') : 'em breve'
            }. Podemos combinar os detalhes?`
          )
          window.open(`https://wa.me/${numero}?text=${texto}`, '_blank', 'noopener')
        }
      } catch {
        // Sem WhatsApp cadastrado ou falha ao buscar: não impede a
        // contratação, que já foi registrada — só não abre o wa.me.
      }

      // Referência só é enviada se a profissional TEM alguma aprovada E o
      // cliente passou pelo disclaimer (versaoDisclaimer vem preenchido
      // só nesse caso — ver aoClicarContratar). Falha aqui não desfaz a
      // contratação, que já está registrada; só o e-mail de referência
      // não sai.
      if (versaoDisclaimer) {
        try {
          await solicitarEnvioReferencia({ bookingId: booking.id, versaoDisclaimer })
        } catch {
          // Silencioso de propósito: a contratação já aconteceu e não deve
          // parecer ter falhado por causa de um e-mail secundário.
        }
      }

      setDisclaimerAberto(false)
      navigate(`/painel?booking=${booking.id}`)
    } catch {
      setErro('Não foi possível criar a contratação.')
    } finally {
      setContratando(false)
    }
  }

  if (erro) return <main className="wrap"><div className="empty">{erro}</div></main>
  if (!prof) return <main className="wrap"><div className="loading">Carregando…</div></main>

  const bairros = prof.profissional_bairros?.map((b) => b.bairros?.nome).filter(Boolean).join(', ')
  const categorias = prof.profissional_categorias?.map((c) => c.categorias?.nome).filter(Boolean).join(', ')

  return (
    <main className="wrap fade-in" style={{ padding: '30px 0 60px' }}>
      <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 20 }}>
        <Avatar nome={prof.perfis?.nome} foto={prof.perfis?.foto_url} tamanho="lg" />
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 27 }}>{prof.perfis?.nome}</h2>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 1 }}>
            {prof.idade ? `${prof.idade} anos · ` : ''}{categorias}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <SeloVerificacao data={prof.identidade_verificada_em} />
            {prof.declaracao_antecedentes && <SeloAntecedentes />}
            <SeloReferencias selo={prof.selo} />
          </div>
        </div>
      </div>

      {/* Prova social: quantas referências o Zelo confirmou, logo no topo —
          antes de qualquer pedido de contratação. Só o NÚMERO; nomes e
          telefones (parciais) só por e-mail, depois de contratar. */}
      {temReferencia && (
        <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--green-bg)', borderColor: 'var(--green-borda)' }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 34, fontWeight: 500, color: 'var(--green)', lineHeight: 1, minWidth: 30, textAlign: 'center' }}>
            {qtdReferencias}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--sage-900)' }}>
              {qtdReferencias === 1 ? 'referência de trabalho confirmada' : 'referências de trabalho confirmadas'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
              Clientes anteriores contatados pela equipe do Zelo. Você recebe um resumo por e-mail ao contratar.
            </div>
          </div>
        </div>
      )}

      <TrustScore
        notaMedia={score?.nota_media}
        total={score?.total_avaliacoes}
        metricas={prof.tempo_resposta_min ? [{ label: 'tempo de resposta', valor: `${prof.tempo_resposta_min} min` }] : []}
      />

      {prof.descricao && (
        <div className="card">
          <h3>Sobre</h3>
          <p style={{ fontSize: 14.5, lineHeight: 1.6 }}>{prof.descricao}</p>
        </div>
      )}

      {prof.especialidades?.length > 0 && (
        <div className="card">
          <h3>Especialidades</h3>
          <div className="chips">
            {prof.especialidades.map((e) => <span key={e} className="chip">{e}</span>)}
          </div>
        </div>
      )}

      <div className="card">
        <h3>Atendimento</h3>
        <Linha k="Bairros" v={prof.atende_todos_bairros ? 'Atende todos os bairros' : (bairros || '—')} />
        {(prof.valor_meio_turno || prof.valor_diaria) && (
          <>
            <Linha k="Meio turno (4h)" v={prof.valor_meio_turno ? `R$ ${prof.valor_meio_turno}` : '—'} />
            <Linha k="Turno integral (8h)" v={prof.valor_diaria ? `R$ ${prof.valor_diaria}` : '—'} />
          </>
        )}
        {prof.valor_km && <Linha k="Valor por km rodado" v={`R$ ${prof.valor_km}`} />}
        {prof.valor_sessao_avulsa && <Linha k="Sessão avulsa" v={`R$ ${prof.valor_sessao_avulsa}`} />}
        {prof.valor_pacote_mensal && <Linha k="Pacote mensal" v={`R$ ${prof.valor_pacote_mensal}`} />}
        {(prof.atende_domicilio || prof.atende_local_proprio) && (prof.valor_sessao_avulsa) && (
          <Linha
            k="Local de atendimento"
            v={[
              prof.atende_domicilio && 'Domicílio do cliente',
              prof.atende_local_proprio && 'Espaço próprio'
            ].filter(Boolean).join(' · ')}
          />
        )}
        {(prof.veiculo_modelo || prof.veiculo_ano) && (
          <Linha
            k="Veículo"
            v={[prof.veiculo_modelo, prof.veiculo_ano].filter(Boolean).join(' · ')}
          />
        )}
        {prof.categorias?.some((c) => c.nome === 'Motorista Particular') && (
          <Linha
            k="Área de atendimento"
            v={prof.atende_intermunicipal ? 'Município e intermunicipal' : 'Só dentro do município'}
          />
        )}
      </div>

      {(prof.servicos?.length > 0 || prof.servico_outro) && (
        <div className="card">
          <h3>Serviços oferecidos</h3>
          <div className="chips">
            {prof.servicos?.map((s) => (
              <span key={s.id} className="chip" style={{ cursor: 'default' }}>{s.nome}</span>
            ))}
            {prof.servico_outro && (
              <span className="chip" style={{ cursor: 'default' }}>{prof.servico_outro}</span>
            )}
          </div>
        </div>
      )}

      <Avaliacoes alvoId={prof.id} lado="cliente_avalia_prof" />

      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--paper)', borderTop: '1.5px solid var(--line)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12,
        justifyContent: 'space-between', margin: '0 -20px', flexWrap: 'wrap'
      }}>
        <div>
          <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 21, color: 'var(--sage-900)' }}>
            R$ {turnoBusca === 'integral'
              ? (prof.valor_diaria ?? prof.valor_meio_turno ?? '—')
              : (prof.valor_meio_turno ?? prof.valor_diaria ?? '—')}
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {turnoBusca === 'integral' ? '/turno integral' : '/hora'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <button className="btn ghost" onClick={aoClicarContratar} disabled={contratando}>Conversar</button>
          <button className="btn" onClick={aoClicarContratar} disabled={contratando}>
            {contratando ? 'Enviando…' : 'Contratar'}
          </button>
        </div>
      </div>

      <AvisoIntermediacao />

      <DisclaimerReferencia
        aberto={disclaimerAberto}
        enviando={contratando}
        onCancelar={() => setDisclaimerAberto(false)}
        onAceitar={(versao) => contratar(versao)}
        quantidade={qtdReferencias}
      />
    </main>
  )
}

function Linha({ k, v }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
      <span style={{ color: 'var(--muted)' }}>{k}</span>
      <span style={{ fontWeight: 600, color: 'var(--sage-900)' }}>{v}</span>
    </div>
  )
}
