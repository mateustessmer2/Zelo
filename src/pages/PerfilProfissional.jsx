import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { obterProfissional, obterTrustScore, criarBooking, obterWhatsappParaContratacao } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import TrustScore from '../components/TrustScore'
import Avaliacoes from '../components/Avaliacoes'
import SeloReferencias from '../components/SeloReferencias'
import AvisoIntermediacao from '../components/AvisoIntermediacao'
import SeloVerificacao from '../components/SeloVerificacao'

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

  useEffect(() => {
    let ativo = true
    Promise.all([obterProfissional(id), obterTrustScore(id, 'cliente_avalia_prof')])
      .then(([p, s]) => { if (!ativo) return; setProf(p); setScore(s) })
      .catch(() => ativo && setErro('Perfil não encontrado.'))
    return () => { ativo = false }
  }, [id])

  async function contratar() {
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
        <div className="avatar lg">{prof.perfis?.nome?.[0] ?? '?'}</div>
        <div>
          <h2 style={{ fontSize: 25 }}>{prof.perfis?.nome}</h2>
          <div style={{ fontSize: 14, color: 'var(--muted)', marginTop: 1 }}>
            {prof.idade ? `${prof.idade} anos · ` : ''}{categorias}
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
            <SeloVerificacao data={prof.identidade_verificada_em} />
            <SeloReferencias selo={prof.selo} />
          </div>
          {prof.selo && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, maxWidth: 380 }}>
              O Zelo facilita o acesso às referências informadas pela profissional.
              A conferência é de responsabilidade de quem contrata.
            </p>
          )}
        </div>
      </div>

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
        <Linha k="Meio turno (4h)" v={prof.valor_meio_turno ? `R$ ${prof.valor_meio_turno}` : '—'} />
        <Linha k="Turno integral (8h)" v={prof.valor_diaria ? `R$ ${prof.valor_diaria}` : '—'} />
        {prof.valor_km && <Linha k="Valor por km rodado" v={`R$ ${prof.valor_km}`} />}
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
          <button className="btn ghost" onClick={contratar} disabled={contratando}>Conversar</button>
          <button className="btn" onClick={contratar} disabled={contratando}>
            {contratando ? 'Enviando…' : 'Contratar'}
          </button>
        </div>
      </div>

      <AvisoIntermediacao />
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
