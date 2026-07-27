import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  listarBookingsCliente, atualizarStatusBooking, obterTrustScore,
  listarBookingsAvaliadosPorMim, rotuloTurno
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import FormAvaliacao from '../components/FormAvaliacao'
import TrustScore from '../components/TrustScore'
import Chat from '../components/Chat'
import FeedbackPrivado from '../components/FeedbackPrivado'

const ABAS = [
  { id: 'contratacoes', label: 'Contratações' },
  { id: 'historico', label: 'Histórico' }
]

export default function PainelCliente() {
  const { perfil } = useAuth()
  const [aba, setAba] = useState('contratacoes')
  const [bookings, setBookings] = useState(null)
  const [score, setScore] = useState(null)
  const [avaliando, setAvaliando] = useState(null)
  const [chatAberto, setChatAberto] = useState(null)
  const [jaAvaliados, setJaAvaliados] = useState(new Set())

  useEffect(() => {
    if (!perfil?.id) return
    carregar()
    obterTrustScore(perfil.id, 'prof_avalia_cliente').then(setScore).catch(() => {})
    listarBookingsAvaliadosPorMim(perfil.id).then(setJaAvaliados).catch(() => {})
  }, [perfil?.id])

  async function carregar() {
    try {
      setBookings(await listarBookingsCliente(perfil.id))
    } catch {
      setBookings([])
    }
  }

  async function concluir(id) {
    await atualizarStatusBooking(id, 'concluido')
    carregar()
  }

  if (!bookings) return <main className="wrap"><div className="loading">Carregando…</div></main>

  const ativos = bookings.filter((b) => ['solicitado', 'confirmado'].includes(b.status))
  const passados = bookings.filter((b) => ['concluido', 'cancelado'].includes(b.status))

  return (
    <>
      <div className="wrap">
        <div className="subnav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, rowGap: 10 }}>
          <div style={{ display: 'flex', gap: 22 }}>
            {ABAS.map((a) => (
              <button key={a.id} className={`snav ${aba === a.id ? 'on' : ''}`} onClick={() => setAba(a.id)}>
                {a.label}
              </button>
            ))}
          </div>
          <Link to="/buscar" className="btn sm" style={{ margin: '10px 0' }}>Encontrar profissionais</Link>
        </div>
      </div>

      <main className="wrap fade-in" style={{ padding: '26px 0 60px' }}>
        {aba === 'contratacoes' && (
          <>
            <h2>Suas contratações</h2>
            <p className="lead" style={{ marginBottom: 22 }}>Serviços agendados e pedidos aguardando resposta.</p>

            {ativos.length === 0 && <div className="empty">Nenhuma contratação ativa.</div>}

            {ativos.map((b) => (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                  <div className="avatar">{b.profissionais?.perfis?.nome?.[0] ?? '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--sage-900)' }}>
                        {b.profissionais?.perfis?.nome}
                      </span>
                      <span className={`status ${b.status === 'confirmado' ? 's-conf' : 's-pend'}`}>
                        {b.status === 'confirmado' ? 'Confirmado' : 'Aguardando resposta'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                      {b.categorias?.nome} · {b.bairros?.nome} · {rotuloTurno(b.turno)}
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--sage-700)', fontWeight: 600, marginTop: 5 }}>
                      {new Date(b.data_servico + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button className="btn ghost sm" onClick={() => setChatAberto(chatAberto === b.id ? null : b.id)}>
                        Conversar
                      </button>
                      {b.status === 'confirmado' && (
                        <button className="btn ghost sm" onClick={() => concluir(b.id)}>
                          Marcar como concluído
                        </button>
                      )}
                    </div>
                  </div>
                  {b.valor_combinado && (
                    <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 17, color: 'var(--sage-900)' }}>
                      R$ {b.valor_combinado}
                    </div>
                  )}
                </div>

                {chatAberto === b.id && (
                  <div style={{ marginTop: 14 }}>
                    <Chat
                      booking={b}
                      outraParteId={b.profissional_id}
                      outraParteNome={b.profissionais?.perfis?.nome ?? 'profissional'}
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {aba === 'historico' && (
          <>
            <h2>Histórico</h2>
            <p className="lead" style={{ marginBottom: 22 }}>Tudo que você já contratou pela plataforma.</p>

            <TrustScore
              notaMedia={score?.nota_media}
              total={score?.total_avaliacoes}
              metricas={[]}
            />
            <div className="note neutral" style={{ marginTop: -6, marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p><b>Você vê apenas seus números agregados.</b> Os comentários escritos por profissionais
                são lidos só por outras profissionais — assim as duas partes avaliam com sinceridade.</p>
            </div>

            <FeedbackPrivado />

            {passados.length === 0 && <div className="empty">Nenhum serviço concluído ainda.</div>}

            {passados.map((b) => (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', gap: 15, alignItems: 'center' }}>
                  <div className="avatar sm">{b.profissionais?.perfis?.nome?.[0] ?? '?'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{b.profissionais?.perfis?.nome}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                      {b.categorias?.nome} · {new Date(b.data_servico + 'T00:00').toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  {b.status === 'concluido' && (
                    jaAvaliados.has(b.id) ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                        ✓ Você já avaliou
                      </span>
                    ) : (
                      <button className="btn sm" onClick={() => setAvaliando(b)}>Avaliar</button>
                    )
                  )}
                </div>

                {avaliando?.id === b.id && (
                  <div style={{ marginTop: 14 }}>
                    <FormAvaliacao
                      bookingId={b.id}
                      alvoId={b.profissional_id}
                      lado="cliente_avalia_prof"
                      onPronto={() => {
                        setAvaliando(null)
                        setJaAvaliados((s) => new Set(s).add(b.id))
                        carregar()
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </>
  )
}
