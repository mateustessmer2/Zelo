import { useState } from 'react'
import { criarAvaliacao } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

const LABELS = { 1: 'Ruim', 2: 'Regular', 3: 'Bom', 4: 'Muito bom', 5: 'Excelente' }

/**
 * Formulário de avaliação.
 *
 * A policy de INSERT já garante que só participante de booking CONCLUÍDO
 * consegue gravar — aqui cuidamos apenas da experiência. Se alguém tentar
 * burlar, o erro vem do banco, não daqui.
 */
export default function FormAvaliacao({ bookingId, alvoId, lado, onPronto }) {
  const { perfil } = useAuth()
  const [nota, setNota] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [feito, setFeito] = useState(false)

  async function enviar() {
    if (!nota) return
    setEnviando(true)
    setErro(null)
    try {
      await criarAvaliacao({ bookingId, autorId: perfil.id, alvoId, lado, nota, comentario })
      setFeito(true)
      onPronto?.()
    } catch {
      setErro('Não foi possível enviar. Verifique se o serviço já foi concluído.')
    } finally {
      setEnviando(false)
    }
  }

  if (feito) {
    return (
      <div className="card" style={{ textAlign: 'center', background: 'var(--green-bg)', borderColor: '#bfdcc8' }}>
        <div style={{ fontSize: 34 }}>✓</div>
        <h3>Avaliação enviada</h3>
        <p style={{ fontSize: 13.5, color: 'var(--sage-700)' }}>
          Ela entra no índice de confiança e fica visível apenas para quem está do mesmo lado.
        </p>
      </div>
    )
  }

  const ehCliente = lado === 'cliente_avalia_prof'

  return (
    <div className="card">
      <h3>{ehCliente ? 'Como foi o serviço?' : 'Como foi atender este cliente?'}</h3>
      {erro && <div className="erro">{erro}</div>}

      <div style={{ display: 'flex', gap: 7, justifyContent: 'center', margin: '14px 0 6px' }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            role="button"
            tabIndex={0}
            aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
            onClick={() => setNota(n)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setNota(n)}
            style={{
              fontSize: 34, cursor: 'pointer', lineHeight: 1, userSelect: 'none',
              color: n <= nota ? 'var(--coral)' : 'var(--sage-100)', transition: '.12s'
            }}
          >★</span>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--muted)', minHeight: 20, marginBottom: 12, fontWeight: 500 }}>
        {LABELS[nota] || ''}
      </div>

      <div className="field">
        <textarea
          rows="3"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder={ehCliente
            ? 'Conte como foi — pontualidade, capricho, comunicação…'
            : 'Ambiente respeitoso? Pagamento em dia? Combinado cumprido?'}
        />
      </div>

      <button className="btn full" onClick={enviar} disabled={!nota || enviando}>
        {enviando ? 'Enviando…' : 'Enviar avaliação'}
      </button>

      <div className="note neutral">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
        </svg>
        <p><b>Quem vê isso:</b> {ehCliente
          ? 'apenas outros clientes, de forma anônima. A profissional vê só a nota média — nunca o seu comentário.'
          : 'apenas outras profissionais, antes de aceitarem um pedido deste cliente. Ele vê só a nota média.'}</p>
      </div>
    </div>
  )
}
