import { useEffect, useState } from 'react'
import { listarAvaliacoes } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

/**
 * Lista avaliações de UM lado. A policy RLS decide o que chega:
 *   • cliente logado -> só recebe 'cliente_avalia_prof'
 *   • profissional   -> só recebe 'prof_avalia_cliente'
 *
 * Pedir o lado errado devolve lista vazia. Não filtramos por papel aqui de
 * propósito: se a regra morasse no React, o DevTools contornaria. O banco
 * é quem recusa.
 *
 * Comentários aparecem sem autor — anônimos por design.
 */
export default function Avaliacoes({ alvoId, lado }) {
  const { perfil } = useAuth()
  const [itens, setItens] = useState(null)

  useEffect(() => {
    let ativo = true
    listarAvaliacoes(alvoId, lado)
      .then((d) => ativo && setItens(d))
      .catch(() => ativo && setItens([]))
    return () => { ativo = false }
  }, [alvoId, lado])

  if (itens === null) return <div className="loading">Carregando avaliações…</div>

  const meuLado =
    (lado === 'cliente_avalia_prof' && perfil?.role === 'cliente') ||
    (lado === 'prof_avalia_cliente' && perfil?.role === 'profissional')

  return (
    <div className="card">
      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--sage-500)' }}>
        {lado === 'cliente_avalia_prof' ? 'O que outros clientes disseram' : 'O que outras profissionais disseram'}
      </span>

      {itens.length === 0 ? (
        <div className="empty" style={{ padding: '24px 0' }}>
          {meuLado
            ? 'Ainda não há avaliações.'
            : 'Estas avaliações são visíveis apenas para quem está do outro lado.'}
        </div>
      ) : (
        itens.map((a) => (
          <div key={a.id} style={{ padding: '15px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
              <span className="stars">{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sage-900)' }}>
                {lado === 'cliente_avalia_prof' ? 'Cliente' : 'Profissional'}
              </span>
            </div>
            {a.comentario && <p style={{ fontSize: 14, lineHeight: 1.55 }}>{a.comentario}</p>}
          </div>
        ))
      )}

      <div className="note neutral">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3a5244" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <p>Comentários são anônimos e escritos apenas por quem contratou e concluiu o serviço. Cada lado lê somente as avaliações do próprio lado — assim os dois avaliam com sinceridade.</p>
      </div>
    </div>
  )
}
