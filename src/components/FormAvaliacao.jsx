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
  const [comentarioPrivado, setComentarioPrivado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState(null)
  const [feito, setFeito] = useState(false)

  async function enviar() {
    if (!nota) return
    setEnviando(true)
    setErro(null)
    try {
      await criarAvaliacao({
        bookingId, autorId: perfil.id, alvoId, lado, nota, comentario, comentarioPrivado
      })
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
        <label htmlFor="publico">
          Avaliação pública
        </label>
        <textarea
          id="publico"
          rows="3"
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          placeholder={ehCliente
            ? 'Conte como foi — pontualidade, capricho, comunicação…'
            : 'Ambiente respeitoso? Pagamento em dia? Combinado cumprido?'}
        />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
          {ehCliente
            ? 'Aparece de forma anônima para outros clientes.'
            : 'Aparece de forma anônima para outras profissionais.'}
        </p>
      </div>

      <div className="field">
        <label htmlFor="privado">
          Mensagem direta <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(opcional)</span>
        </label>
        <textarea
          id="privado"
          rows="3"
          value={comentarioPrivado}
          onChange={(e) => setComentarioPrivado(e.target.value)}
          placeholder={ehCliente
            ? 'Algo que você quer dizer só para ela — um elogio, um detalhe para a próxima vez…'
            : 'Algo que você quer dizer só para o cliente…'}
        />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
          Só {ehCliente ? 'ela' : 'ele'} lê, e apenas depois que os dois lados avaliarem.
          Não aparece no perfil nem conta para a nota.
        </p>
      </div>

      <button className="btn full" onClick={enviar} disabled={!nota || enviando}>
        {enviando ? 'Enviando…' : 'Enviar avaliação'}
      </button>

      <div className="note neutral">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
        </svg>
        <p><b>Nada aparece até os dois avaliarem.</b> {ehCliente
          ? 'A profissional vê só a sua nota média — nunca o comentário público, que é lido apenas por outros clientes.'
          : 'O cliente vê só a nota média — o comentário público é lido apenas por outras profissionais.'}</p>
      </div>
    </div>
  )
}
