import { useEffect, useState } from 'react'
import {
  listarBookingsProfissional, atualizarStatusBooking,
  obterTrustScore, listarVerificacoes, enviarDocumento,
  listarBookingsAvaliadosPorMim, rotuloTurno,
  listarReferencias, obterProfissional
} from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import FormAvaliacao from '../components/FormAvaliacao'
import TrustScore from '../components/TrustScore'
import Chat from '../components/Chat'
import FeedbackPrivado from '../components/FeedbackPrivado'
import EditarPerfil from '../components/EditarPerfil'
import Agenda from '../components/Agenda'
import Referencias from '../components/Referencias'

const ABAS = [
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'perfil', label: 'Meu perfil' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'verificacao', label: 'Verificação' },
  { id: 'ganhos', label: 'Ganhos' },
  { id: 'avaliacoes', label: 'Avaliações' }
]

export default function PainelProfissional() {
  const { perfil } = useAuth()
  const [aba, setAba] = useState('pedidos')
  const [bookings, setBookings] = useState(null)
  const [score, setScore] = useState(null)
  const [verificacoes, setVerificacoes] = useState([])
  const [referencias, setReferencias] = useState([])
  const [selo, setSelo] = useState(null)
  const [avaliando, setAvaliando] = useState(null)
  const [chatAberto, setChatAberto] = useState(null)
  const [jaAvaliados, setJaAvaliados] = useState(new Set())

  useEffect(() => {
    if (!perfil?.id) return
    carregar()
    obterTrustScore(perfil.id, 'cliente_avalia_prof').then(setScore).catch(() => {})
    listarVerificacoes(perfil.id).then(setVerificacoes).catch(() => {})
    listarReferencias(perfil.id).then(setReferencias).catch(() => {})
    obterProfissional(perfil.id).then((p) => setSelo(p?.selo ?? null)).catch(() => {})
    listarBookingsAvaliadosPorMim(perfil.id).then(setJaAvaliados).catch(() => {})
  }, [perfil?.id])

  async function carregar() {
    try {
      setBookings(await listarBookingsProfissional(perfil.id))
    } catch {
      setBookings([])
    }
  }

  async function responder(id, status) {
    await atualizarStatusBooking(id, status)
    carregar()
  }

  if (!bookings) return <main className="wrap"><div className="loading">Carregando…</div></main>

  const novos = bookings.filter((b) => b.status === 'solicitado')
  const confirmados = bookings.filter((b) => b.status === 'confirmado')
  const concluidos = bookings.filter((b) => b.status === 'concluido')
  const totalGanho = concluidos.reduce((s, b) => s + Number(b.valor_combinado || 0), 0)

  const idOk = verificacoes.find((v) => v.tipo === 'identidade')?.status === 'aprovado'
  const antOk = verificacoes.find((v) => v.tipo === 'antecedentes')?.status === 'aprovado'
  const selfieVerif = verificacoes.find((v) => v.tipo === 'selfie')
  const selfieOk = selfieVerif?.status === 'aprovado'
  // Antecedentes temporariamente fora do gate de visibilidade — ver
  // migração 16. antOk continua calculado (útil se algum dia a fila
  // de verificação ainda mostrar um item de antecedentes de antes),
  // mas não decide mais se o perfil entra no ar.
  //
  // Identidade e selfie condicionam só a VISIBILIDADE na busca (via
  // coluna `visivel` no banco), não o acesso ao painel em si — a
  // profissional usa Pedidos, Perfil, Agenda etc. normalmente mesmo
  // antes de enviar ou ser aprovada. Já foi testado bloquear o painel
  // inteiro até o envio da selfie; a decisão foi revertida para manter
  // o acesso livre e deixar só a busca condicionada.
  const noAr = idOk && selfieOk

  return (
    <>
      <div className="wrap">
        <div className="subnav">
          {ABAS.map((a) => (
            <button key={a.id} className={`snav ${aba === a.id ? 'on' : ''}`} onClick={() => setAba(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <main className="wrap fade-in" style={{ padding: '26px 0 60px' }}>
        {aba === 'pedidos' && (
          <>
            <h2>Pedidos e serviços</h2>
            <p className="lead" style={{ marginBottom: 22 }}>Você aceita apenas os serviços que quiser.</p>

            {!noAr && (
              <div className="note warn" style={{ marginBottom: 18 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#b8862c" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
                </svg>
                <p><b>Seu perfil ainda não aparece na busca.</b> Conclua a verificação de
                  identidade e a selfie para começar a receber pedidos.</p>
              </div>
            )}

            {novos.length === 0 && confirmados.length === 0 && (
              <div className="empty">Nenhum pedido no momento.</div>
            )}

            {[...novos, ...confirmados].map((b) => (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                  <div className="avatar">{b.perfis?.nome?.[0] ?? '?'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 15.5, color: 'var(--sage-900)' }}>{b.perfis?.nome}</span>
                      <span className={`status ${b.status === 'confirmado' ? 's-conf' : 's-pend'}`}>
                        {b.status === 'confirmado' ? 'Confirmado' : 'Novo pedido'}
                      </span>
                    </div>
                    <div style={{ fontSize: 13.5, color: 'var(--sage-700)', fontWeight: 600, marginTop: 5 }}>
                      {new Date(b.data_servico + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                      {' · '}{rotuloTurno(b.turno)} · {b.bairros?.nome}
                    </div>
                    {b.observacao && (
                      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 7, fontStyle: 'italic' }}>
                        "{b.observacao}"
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 8, marginTop: 13, flexWrap: 'wrap' }}>
                      {b.status === 'solicitado' ? (
                        <>
                          <button className="btn sm" onClick={() => responder(b.id, 'confirmado')}>Aceitar</button>
                          <button className="btn ghost sm" onClick={() => setChatAberto(chatAberto === b.id ? null : b.id)}>
                            Conversar antes
                          </button>
                          <button className="btn ghost sm" onClick={() => responder(b.id, 'recusado')}>Recusar</button>
                        </>
                      ) : (
                        <>
                          <button className="btn ghost sm" onClick={() => setChatAberto(chatAberto === b.id ? null : b.id)}>
                            Conversar
                          </button>
                          <button className="btn ghost sm" onClick={() => responder(b.id, 'concluido')}>
                            Marcar como concluído
                          </button>
                        </>
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
                    <Chat booking={b} outraParteId={b.cliente_id} outraParteNome={b.perfis?.nome ?? 'cliente'} />
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {aba === 'perfil' && <EditarPerfil />}

        {aba === 'agenda' && <Agenda />}

        {aba === 'verificacao' && (
          <>
            <Verificacao perfilId={perfil.id} verificacoes={verificacoes} idOk={idOk} antOk={antOk} selfieOk={selfieOk} noAr={noAr}
              onEnviado={() => listarVerificacoes(perfil.id).then(setVerificacoes)} />
            <div style={{ marginTop: 14 }}>
              <Referencias
                perfilId={perfil.id}
                referencias={referencias}
                selo={selo}
                onEnviado={() => {
                  listarReferencias(perfil.id).then(setReferencias)
                  obterProfissional(perfil.id).then((p) => setSelo(p?.selo ?? null))
                }}
              />
            </div>
          </>
        )}

        {aba === 'ganhos' && (
          <>
            <h2>Seus ganhos</h2>
            <p className="lead" style={{ marginBottom: 22 }}>Valores combinados pelos serviços realizados.</p>

            <div style={{ background: 'var(--sage-900)', borderRadius: 'var(--radius)', padding: 24, marginBottom: 14, color: '#fff' }}>
              <div style={{ fontSize: 13, color: 'var(--sage-100)', marginBottom: 5 }}>Total combinado</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 38, fontWeight: 600, lineHeight: 1 }}>
                R$ {totalGanho.toLocaleString('pt-BR')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--sage-100)', marginTop: 8 }}>
                {concluidos.length} serviço{concluidos.length === 1 ? '' : 's'} concluído{concluidos.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="note warn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#b8862c" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
              </svg>
              <p><b>O pagamento é feito diretamente a você</b>, por PIX ou dinheiro. A plataforma
                apenas registra o valor combinado para seu histórico e o cálculo do índice de confiança.</p>
            </div>
          </>
        )}

        {aba === 'avaliacoes' && (
          <>
            <h2>Suas avaliações</h2>
            <p className="lead" style={{ marginBottom: 22 }}>Como sua reputação está sendo construída.</p>

            <TrustScore notaMedia={score?.nota_media} total={score?.total_avaliacoes} metricas={[]} />

            <div className="note neutral" style={{ marginTop: -6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p><b>Você vê apenas seus números agregados.</b> Os comentários que clientes escrevem
                ficam visíveis só para outros clientes — e os seus comentários sobre clientes, só
                para outras profissionais.</p>
            </div>

            <FeedbackPrivado />

            <div className="card" style={{ marginTop: 14 }}>
              <h3>Clientes a avaliar</h3>
              {concluidos.length === 0 && <div className="empty" style={{ padding: '20px 0' }}>Nenhum serviço concluído ainda.</div>}
              {concluidos.map((b) => (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 14 }}>
                      {b.perfis?.nome} · {new Date(b.data_servico + 'T00:00').toLocaleDateString('pt-BR')}
                    </span>
                    {jaAvaliados.has(b.id) ? (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>
                        ✓ Você já avaliou
                      </span>
                    ) : (
                      <button className="btn ghost sm" onClick={() => setAvaliando(b)}>Avaliar</button>
                    )}
                  </div>
                  {avaliando?.id === b.id && (
                    <FormAvaliacao
                      bookingId={b.id}
                      alvoId={b.cliente_id}
                      lado="prof_avalia_cliente"
                      onPronto={() => {
                        setAvaliando(null)
                        setJaAvaliados((s) => new Set(s).add(b.id))
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}

/** Envio de documentos sensíveis — bucket privado, cliente nunca acessa. */
function Verificacao({ perfilId, verificacoes, idOk, antOk, selfieOk, noAr, onEnviado, somenteSelfie = false }) {
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(null)

  async function subir(tipo, arquivo) {
    if (!arquivo) return
    setEnviando(tipo)
    setErro(null)
    try {
      await enviarDocumento({ profissionalId: perfilId, tipo, arquivo })
      onEnviado()
    } catch {
      setErro('Não foi possível enviar o arquivo.')
    } finally {
      setEnviando(null)
    }
  }

  const statusDe = (tipo) => verificacoes.find((v) => v.tipo === tipo)?.status ?? 'pendente'

  return (
    <>
      {!somenteSelfie && (
        <>
          <h2>Verificação</h2>
          <p className="lead" style={{ marginBottom: 22 }}>
            Obrigatória para o perfil ficar visível. É o que faz as famílias confiarem.
          </p>
        </>
      )}

      {erro && <div className="erro">{erro}</div>}

      <div className="card">
        {!somenteSelfie && (
          <Doc
            titulo="Documento de identidade (RG ou CNH)"
            status={statusDe('identidade')}
            enviando={enviando === 'identidade'}
            onArquivo={(f) => subir('identidade', f)}
          />
        )}
        <Doc
          titulo="Selfie"
          sub="Foto do seu rosto, sem óculos escuros ou boné · confere com o documento"
          status={statusDe('selfie')}
          enviando={enviando === 'selfie'}
          onArquivo={(f) => subir('selfie', f)}
          selfie
        />

        <div className="note neutral">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p>
            <b>Como usamos o que você envia.</b> A selfie e o documento são usados
            exclusivamente para conferência da sua identidade. Nenhum cliente tem
            acesso a eles: o que aparece no seu perfil é somente o selo. O envio é
            necessário para o perfil ficar visível na busca dos clientes.
          </p>
        </div>
      </div>

      {!somenteSelfie && (
        <div className={`note ${noAr ? 'neutral' : 'warn'}`} style={noAr ? { background: 'var(--green-bg)' } : {}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={noAr ? '#3f7d54' : '#b8862c'} strokeWidth="2">
            {noAr
              ? <><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5l-8-3z" /><path d="m9 12 2 2 4-4" /></>
              : <><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></>}
          </svg>
          <p style={noAr ? { color: 'var(--green)' } : {}}>
            {noAr
              ? <><b>Perfil no ar.</b> Identidade e selfie aprovadas — você já aparece na busca dos clientes.</>
              : <><b>Perfil ainda não visível.</b> Faltam: {[
                  !idOk && 'identidade',
                  !selfieOk && 'selfie'
                ].filter(Boolean).join(', ')}. Assim que forem aprovadas, seu perfil entra
                no ar automaticamente.</>}
          </p>
        </div>
      )}
    </>
  )
}

/**
 * Cartão de envio de um documento de verificação.
 *
 * Em `selfie`, aceita só imagem e usa `capture="user"`, que abre a câmera
 * frontal direto no celular. É conveniência, não trava: a pessoa ainda pode
 * escolher da galeria. Prova de vida de verdade só com serviço externo
 * (Idwall, Unico) — o que o schema já prevê no campo `metodo`.
 */
function Doc({ titulo, sub, status, enviando, onArquivo, selfie }) {
  const cor = status === 'aprovado' ? 's-conf' : status === 'rejeitado' ? 's-canc' : 's-pend'
  const rotulo = status === 'aprovado' ? 'Aprovado' : status === 'em_analise' ? 'Em análise' : status === 'rejeitado' ? 'Reenviar' : 'Pendente'

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--sage-900)' }}>{titulo}</label>
        <span className={`status ${cor}`}>{rotulo}</span>
      </div>
      {sub && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>{sub}</div>}
      {status !== 'aprovado' && (
        <input
          type="file"
          accept={selfie ? 'image/*' : 'image/*,application/pdf'}
          {...(selfie ? { capture: 'user' } : {})}
          disabled={enviando}
          onChange={(e) => onArquivo(e.target.files?.[0])}
          style={{ fontSize: 13.5 }}
        />
      )}
      {enviando && <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>Enviando…</div>}
    </div>
  )
}
