import { useEffect, useState } from 'react'
import { listarFeedbackPrivado } from '../lib/api'

/**
 * Mensagens diretas recebidas nas avaliações.
 *
 * Lê a view `minhas_avaliacoes_recebidas`, que só entrega o que passou pela
 * liberação simultânea — ou seja, depois que os dois lados avaliaram (ou o
 * prazo de 14 dias expirou).
 *
 * O autor não é identificado. A pessoa lê a mensagem sem descobrir quem
 * escreveu a avaliação pública nem o que foi dito lá.
 */
export default function FeedbackPrivado() {
  const [itens, setItens] = useState(null)

  useEffect(() => {
    let ativo = true
    listarFeedbackPrivado()
      .then((d) => ativo && setItens(d))
      .catch(() => ativo && setItens([]))
    return () => { ativo = false }
  }, [])

  if (itens === null) return <div className="loading">Carregando…</div>

  return (
    <div className="card">
      <h3>Mensagens diretas</h3>

      {itens.length === 0 ? (
        <div className="empty" style={{ padding: '24px 0' }}>
          Nenhuma mensagem ainda.
          <br />
          <span style={{ fontSize: 13 }}>
            Elas aparecem depois que os dois lados avaliam o serviço.
          </span>
        </div>
      ) : (
        itens.map((f) => (
          <div key={f.id} style={{ padding: '15px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 6 }}>
              {new Date(f.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
            </div>
            <p style={{ fontSize: 14.5, lineHeight: 1.55 }}>{f.comentario_privado}</p>
          </div>
        ))
      )}

      <div className="note neutral">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p>Estas mensagens são só para você e não contam para a sua nota.
          Elas só ficam visíveis depois que os dois lados avaliaram — assim
          ninguém escreve pensando na resposta do outro.</p>
      </div>
    </div>
  )
}
